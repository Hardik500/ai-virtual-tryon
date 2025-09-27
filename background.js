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

// AI processing - simplified version for initial testing
async function processImageWithAI(imageData, options) {
  try {
    console.log('Processing image with AI...', options);

    const { type, source } = options;

    if (type === 'clothing_detection') {
      // For now, return a mock response to test the extension functionality
      // The full AI integration will be activated once the extension is working
      return {
        processed: true,
        type: 'clothing_detected_mock',
        message: 'Extension is working! AI processing will be enabled after setup completion.',
        mockData: {
          items: [{
            category: 'tops',
            type: 'shirt',
            color: 'blue',
            confidence: 0.85
          }],
          source: source,
          timestamp: Date.now()
        }
      };
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
