// Background service worker for AI Virtual Try-On extension

// Import required modules for virtual try-on functionality (order matters)
importScripts('lib/storage-manager.js');
importScripts('lib/image-processor.js');
importScripts('lib/gemini-integration.js');
importScripts('lib/tryon-generator.js');

// Extension installation and setup
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('AI Virtual Try-On extension installed');
    // Open options page for initial setup
    chrome.runtime.openOptionsPage();
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'captureScreenshot':
      handleScreenshotCapture(request, sender, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'processImage':
      handleImageProcessing(request, sender, sendResponse);
      return true;
      
    case 'saveUserData':
      handleUserDataSave(request, sender, sendResponse);
      return true;

    case 'generateTryOn':
      handleTryOnGeneration(request, sender, sendResponse);
      return true;

    case 'refineImage':
      handleImageRefinement(request, sender, sendResponse);
      return true;

    default:
      console.log('Unknown action:', request.action);
  }
});

// Screenshot capture functionality
async function handleScreenshotCapture(request, sender, sendResponse) {
  try {
    const screenshot = await chrome.tabs.captureVisibleTab(
      sender.tab.windowId,
      { format: 'png', quality: 100 }
    );
    
    sendResponse({ 
      success: true, 
      screenshot: screenshot,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Image processing coordination
async function handleImageProcessing(request, sender, sendResponse) {
  try {
    console.log('🔍 Starting image processing...', request.options);

    // First, detect clothing items
    const detectionResult = await processImageWithAI(request.imageData, request.options);

    // Check if we should proceed to virtual try-on
    const shouldTryOn = request.options?.autoTryOn !== false &&
                       (detectionResult.type === 'clothing_detection' || 
                        detectionResult.type === 'clothing_detected_ai' ||
                        detectionResult.type?.includes('clothing_detected')) &&
                       (detectionResult.aiData?.items?.length > 0 || 
                        detectionResult.mockData?.items?.length > 0);

    console.log('🔍 Try-on decision:', {
      autoTryOn: request.options?.autoTryOn,
      detectionType: detectionResult.type,
      hasAIItems: detectionResult.aiData?.items?.length || 0,
      hasMockItems: detectionResult.mockData?.items?.length || 0,
      shouldTryOn: shouldTryOn
    });

    if (shouldTryOn) {
      console.log('🎯 Proceeding to virtual try-on generation...');

      try {
        // Initialize try-on generator
        const tryOnGenerator = new TryOnGenerator();

        // Ensure the database is initialized before proceeding
        console.log('🔧 Initializing storage manager...');
        if (tryOnGenerator.storageManager) {
          await tryOnGenerator.storageManager.init();
        }

        // Get best user photo
        console.log('📸 Getting best user photo...');
        const bestPhoto = await tryOnGenerator.getBestUserPhoto();
        if (!bestPhoto) {
          console.log('⚠️ No user photos available - returning detection only');
          sendResponse({
            success: true,
            result: {
              ...detectionResult,
              message: detectionResult.message + ' (Add photos in Settings to enable virtual try-on)'
            }
          });
          return;
        }

        // Convert detection results to clothing items for try-on
        const detectedItems = detectionResult.aiData?.items || detectionResult.mockData?.items || [];
        console.log('🔍 Converting detected items for try-on:', {
          hasAIData: !!detectionResult.aiData,
          hasMockData: !!detectionResult.mockData,
          itemsCount: detectedItems.length,
          detectionType: detectionResult.type
        });
        
        const clothingItems = detectedItems.map(item => ({
          category: item.category || 'clothing',
          description: item.description || item.name,
          confidence: item.confidence,
          data: request.imageData.url || request.imageData.dataUrl || request.imageData.base64,
          source: request.options.source || 'web',
          url: request.imageData.url
        }));

        // Generate try-on for the first detected item
        const tryOnResult = await tryOnGenerator.generateTryOn(bestPhoto.id, clothingItems[0], {
          saveResult: true,
          createThumbnail: true,
          source: request.options.source || 'auto_tryon'
        });

        if (tryOnResult.success) {
          console.log('✅ Virtual try-on generated successfully!');

          // Return combined detection + try-on result
          sendResponse({
            success: true,
            result: {
              type: 'virtual_tryon_complete',
              message: `Virtual try-on generated! Found ${clothingItems.length} item(s) and created try-on result.`,
              detectionData: detectionResult,
              tryOnData: {
                id: tryOnResult.result.id,
                description: tryOnResult.result.description,
                recommendations: tryOnResult.result.recommendations,
                confidence: tryOnResult.result.confidence,
                thumbnail: tryOnResult.result.thumbnail,
                processingMethod: tryOnResult.result.processingMethod
              },
              clothingItems: clothingItems,
              userPhotoId: bestPhoto.id
            }
          });
          return;
        } else {
          console.log('⚠️ Try-on generation failed, returning detection only');
        }

      } catch (tryOnError) {
        console.error('Try-on generation failed:', tryOnError);
        // Continue with detection-only result
      }
    }

    // Return detection-only result
    sendResponse({
      success: true,
      result: detectionResult
    });

  } catch (error) {
    console.error('Image processing failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// User data management
async function handleUserDataSave(request, sender, sendResponse) {
  try {
    await chrome.storage.local.set({
      [request.key]: request.data
    });
    
    sendResponse({ 
      success: true 
    });
  } catch (error) {
    console.error('Data save failed:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// AI processing with real Gemini integration
async function processImageWithAI(imageData, options) {
  try {
    console.log('Processing image with AI...', options);

    const { type, source } = options;

    if (type === 'clothing_detection') {
      // Get API key from storage
      const result = await chrome.storage.local.get(['userProfile']);
      const apiKey = result.userProfile?.apiKey;

      // Check if API key is available
      if (!apiKey || apiKey.length <= 10) {
        console.warn('No API key found, using fallback mock response');
        return getFallbackMockResponse(source);
      }

      try {
        // Process image with real Gemini AI using direct API call
        console.log('Sending image to Gemini for analysis...');
        const aiResult = await callGeminiAPI(imageData, options, apiKey);

        if (aiResult.success && aiResult.items && aiResult.items.length > 0) {
          return {
            processed: true,
            type: 'clothing_detected_ai',
            message: `Found ${aiResult.items.length} clothing item(s) using AI analysis`,
            aiData: {
              items: aiResult.items,
              metadata: aiResult.metadata,
              source: source,
              timestamp: Date.now(),
              processingMethod: 'gemini-ai'
            },
            rawResponse: aiResult.rawResponse
          };
        } else {
          return {
            processed: true,
            type: 'no_clothing_detected',
            message: 'No clothing items detected in the image',
            aiData: {
              items: [],
              metadata: aiResult.metadata || {},
              source: source,
              timestamp: Date.now(),
              processingMethod: 'gemini-ai'
            },
            rawResponse: aiResult.rawResponse
          };
        }

      } catch (aiError) {
        console.error('Gemini AI processing failed:', aiError);

        // Fallback to mock response if AI fails
        console.log('Falling back to mock response due to AI error');
        return {
          processed: true,
          type: 'clothing_detected_fallback',
          message: `AI processing failed (${aiError.message}). Using fallback detection.`,
          mockData: {
            items: [{
              category: 'tops',
              type: 'shirt',
              color: 'blue',
              confidence: 0.75,
              note: 'Fallback detection due to AI error'
            }],
            source: source,
            timestamp: Date.now(),
            processingMethod: 'fallback-mock'
          },
          error: aiError.message
        };
      }

    } else {
      return {
        processed: false,
        error: 'Unknown processing type: ' + type
      };
    }
  } catch (error) {
    console.error('AI processing error:', error);
    return {
      processed: false,
      error: error.message || 'AI processing failed'
    };
  }
}

// Direct Gemini API call for service worker compatibility
async function callGeminiAPI(imageData, options, apiKey) {
  const { source } = options;

  // Build the prompt for clothing detection
  const prompt = `Analyze this image and detect clothing items. Please provide a detailed analysis in JSON format with the following structure:

{
  "items": [
    {
      "category": "tops|bottoms|dresses|shoes|accessories",
      "type": "specific item type (e.g., t-shirt, jeans, sneakers)",
      "color": "primary color",
      "style": "style description",
      "confidence": 0.0-1.0,
      "boundingBox": {"x": 0, "y": 0, "width": 0, "height": 0},
      "features": ["list", "of", "notable", "features"]
    }
  ],
  "background": "background description",
  "lighting": "lighting conditions",
  "quality": "image quality assessment"
}

Focus on identifying wearable clothing items that could be virtually tried on.
Image source: ${source}
Provide accurate bounding boxes for each detected item and assess the suitability for virtual try-on.`;

  // Prepare image data for Gemini
  let imageBase64 = '';
  let mimeType = 'image/jpeg';

  if (imageData.url) {
    // For URL-based images, we need to fetch and convert to base64
    try {
      const response = await fetch(imageData.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Check image size (limit to 10MB to avoid issues)
      if (blob.size > 10 * 1024 * 1024) {
        throw new Error(`Image too large (${Math.round(blob.size / 1024 / 1024)}MB). Maximum size is 10MB.`);
      }

      // Use FileReader for safe base64 conversion (avoids call stack issues)
      imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const result = reader.result;
            if (typeof result === 'string' && result.includes(',')) {
              const base64 = result.split(',')[1]; // Remove data:image/...;base64, prefix
              resolve(base64);
            } else {
              reject(new Error('Invalid FileReader result'));
            }
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });

      mimeType = blob.type || 'image/jpeg';
    } catch (error) {
      throw new Error(`Failed to fetch image: ${error.message}`);
    }
  } else if (imageData.base64) {
    imageBase64 = imageData.base64.replace(/^data:image\/[^;]+;base64,/, '');
    mimeType = imageData.mimeType || 'image/jpeg';
  } else {
    throw new Error('No valid image data provided');
  }

  // Make API call to Gemini 2.5 Flash model (for detection only)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: mimeType,
            data: imageBase64
          }
        }
      ]
    }],
    generationConfig: {
      temperature: 0.15,
      topK: 32,
      topP: 0.8,
      maxOutputTokens: 4096,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH", 
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'AI-Virtual-TryOn-Extension/2.5',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response from Gemini API');
  }

  const responseText = data.candidates[0].content.parts[0].text;

  try {
    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      items: parsedResponse.items || [],
      metadata: {
        background: parsedResponse.background,
        lighting: parsedResponse.lighting,
        quality: parsedResponse.quality
      },
      rawResponse: responseText
    };
  } catch (parseError) {
    console.error('Failed to parse Gemini response:', parseError);
    throw new Error(`Failed to parse AI response: ${parseError.message}`);
  }
}

// Fallback mock response when no API key is available
function getFallbackMockResponse(source) {
  return {
    processed: true,
    type: 'clothing_detected_mock',
    message: 'Please add your Gemini API key in settings to enable AI analysis. Using mock detection.',
    mockData: {
      items: [{
        category: 'tops',
        type: 'shirt',
        color: 'blue',
        confidence: 0.85,
        note: 'Mock detection - add API key for real AI analysis'
      }],
      source: source,
      timestamp: Date.now(),
      processingMethod: 'mock-no-api-key'
    }
  };
}

// Context menu setup for right-click functionality
chrome.runtime.onInstalled.addListener(() => {
  // Check if contextMenus API is available
  if (chrome.contextMenus) {
    try {
      chrome.contextMenus.create({
        id: 'tryOnItem',
        title: 'Try on this item',
        contexts: ['image']
      });
    } catch (error) {
      console.warn('Failed to create context menu:', error);
    }
  }
});

// Handle virtual try-on generation
async function handleTryOnGeneration(request, sender, sendResponse) {
  try {
    console.log('🎯 Starting virtual try-on generation...', request);

    const { clothingItems, userPhotoId, options = {} } = request;

    if (!clothingItems || clothingItems.length === 0) {
      throw new Error('No clothing items provided for try-on');
    }

    // Initialize try-on generator
    const tryOnGenerator = new TryOnGenerator();

    // If no specific user photo provided, get the best available one
    let photoId = userPhotoId;
    if (!photoId) {
      const bestPhoto = await tryOnGenerator.getBestUserPhoto();
      if (!bestPhoto) {
        throw new Error('No user photos available. Please add photos in Settings.');
      }
      photoId = bestPhoto.id;
    }

    console.log('📸 Using user photo ID:', photoId);
    console.log('👕 Processing clothing items:', clothingItems.length);

    // Generate try-on for the first clothing item (can be extended for batch processing)
    const clothingItem = clothingItems[0];
    const tryOnResult = await tryOnGenerator.generateTryOn(photoId, clothingItem, {
      ...options,
      saveResult: true, // Always save try-on results
      createThumbnail: true,
      source: 'extension_popup'
    });

    if (tryOnResult.success) {
      console.log('✅ Try-on generation successful:', tryOnResult.result);

      // Format result for popup display
      const formattedResult = {
        type: 'virtual_tryon',
        success: true,
        message: `Virtual try-on generated successfully!`,
        tryOnData: {
          id: tryOnResult.result.id,
          description: tryOnResult.result.description,
          recommendations: tryOnResult.result.recommendations,
          confidence: tryOnResult.result.confidence,
          qualityScore: tryOnResult.result.qualityScore,
          thumbnail: tryOnResult.result.thumbnail,
          processingMethod: tryOnResult.result.processingMethod,
          timestamp: tryOnResult.result.timestamp
        },
        clothingItem: clothingItem,
        userPhotoId: photoId,
        metadata: tryOnResult.metadata
      };

      sendResponse(formattedResult);
    } else {
      throw new Error(tryOnResult.error || 'Try-on generation failed');
    }

  } catch (error) {
    console.error('❌ Try-on generation failed:', error);
    sendResponse({
      success: false,
      error: error.message,
      type: 'virtual_tryon_error'
    });
  }
}

// Handle image refinement requests
async function handleImageRefinement(request, sender, sendResponse) {
  try {
    console.log('🔧 Handling image refinement request...', request);

    const { tryOnId, refinementPrompt } = request;

    if (!tryOnId || !refinementPrompt) {
      throw new Error('Missing try-on ID or refinement prompt');
    }

    // Get the stored try-on result
    const storedResults = await chrome.storage.local.get(['recentTryOns']);
    const recentTryOns = storedResults.recentTryOns || [];
    const targetResult = recentTryOns.find(result => result.id === tryOnId);

    if (!targetResult) {
      throw new Error('Try-on result not found');
    }

    // Get API key
    const profileData = await chrome.storage.local.get(['userProfile']);
    const apiKey = profileData.userProfile?.apiKey;

    if (!apiKey) {
      throw new Error('No API key configured');
    }

    // Initialize Gemini integration
    const geminiIntegration = new GeminiIntegration();
    geminiIntegration.setApiKey(apiKey);

    // Refine the image
    const originalImageData = targetResult.result?.tryOnData?.generatedImage;
    if (!originalImageData) {
      throw new Error('No generated image found to refine');
    }

    console.log('🎨 Refining image with prompt:', refinementPrompt);
    
    const refinementResult = await geminiIntegration.refineGeneratedImage(
      originalImageData,
      refinementPrompt,
      { preserveCharacter: true }
    );

    if (refinementResult.success) {
      // Update the stored result with the refined image
      const updatedResult = {
        ...targetResult,
        result: {
          ...targetResult.result,
          tryOnData: {
            ...targetResult.result.tryOnData,
            generatedImage: refinementResult.refinedImage,
            imageUrl: refinementResult.imageUrl,
            refinements: [
              ...(targetResult.result.tryOnData.refinements || []),
              {
                prompt: refinementPrompt,
                timestamp: Date.now()
              }
            ]
          }
        }
      };

      // Update storage
      const updatedTryOns = recentTryOns.map(item => 
        item.id === tryOnId ? updatedResult : item
      );
      await chrome.storage.local.set({ recentTryOns: updatedTryOns });

      console.log('✅ Image refinement successful');

      sendResponse({
        success: true,
        result: updatedResult.result
      });
    } else {
      throw new Error(refinementResult.error || 'Refinement failed');
    }

  } catch (error) {
    console.error('❌ Image refinement failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle context menu clicks
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'tryOnItem') {
      // Send message to content script to process the clicked image
      chrome.tabs.sendMessage(tab.id, {
        action: 'processClickedImage',
        imageUrl: info.srcUrl
      });
    }
  });
}
