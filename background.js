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

// AI processing with integrated modules
async function processImageWithAI(imageData, options) {
  try {
    // Import required modules
    await importScripts(
      'lib/storage-manager.js',
      'lib/gemini-integration.js',
      'lib/image-processor.js',
      'lib/tryon-generator.js'
    );

    // Wait for modules to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    const { type, source } = options;

    if (type === 'clothing_detection') {
      // Detect clothing items in the image
      const result = await window.geminiIntegration.detectClothing(imageData, {
        category: options.category || 'auto',
        source: source
      });

      if (result.success && result.items.length > 0) {
        // Save detected clothing item
        const clothingItem = {
          image: imageData.dataUrl || imageData.url,
          source: source,
          category: result.items[0].category,
          title: `${result.items[0].type} (${result.items[0].color})`,
          metadata: {
            detectedItems: result.items,
            confidence: result.items[0].confidence,
            timestamp: Date.now()
          }
        };

        if (window.storageManager) {
          await window.storageManager.saveClothingItem(clothingItem);
        }

        // Generate try-on if user profile is complete
        const userProfile = await window.storageManager.getUserProfile();
        if (userProfile && userProfile.isComplete && userProfile.photos.length > 0) {
          const tryOnResult = await window.tryOnGenerator.generateTryOn(
            userProfile.photos[0], // Use first photo
            clothingItem,
            { saveResult: true }
          );

          return {
            processed: true,
            type: 'try_on_generated',
            clothingDetection: result,
            tryOnResult: tryOnResult,
            message: 'Clothing detected and try-on generated successfully!'
          };
        } else {
          return {
            processed: true,
            type: 'clothing_detected',
            result: result,
            message: 'Clothing detected! Complete your profile to generate try-on.'
          };
        }
      } else {
        return {
          processed: false,
          error: 'No clothing items detected in the image',
          result: result
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

// Context menu setup for right-click functionality
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'tryOnItem',
    title: 'Try on this item',
    contexts: ['image']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'tryOnItem') {
    // Send message to content script to process the clicked image
    chrome.tabs.sendMessage(tab.id, {
      action: 'processClickedImage',
      imageUrl: info.srcUrl
    });
  }
});
