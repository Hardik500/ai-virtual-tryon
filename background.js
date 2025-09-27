// Background service worker for AI Virtual Try-On extension

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
    // This will coordinate with the AI processing modules
    const result = await processImageWithAI(request.imageData, request.options);
    
    sendResponse({ 
      success: true, 
      result: result 
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

  // Make API call to Gemini (using latest 2.5 model)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

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
      temperature: 0.1,
      topK: 32,
      topP: 1,
      maxOutputTokens: 2048,
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
