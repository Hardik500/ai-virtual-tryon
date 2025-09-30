// Extension Popup Test - Run this from the extension popup console
// This test has full access to Chrome extension APIs

console.log('🎨 Starting Extension Popup Image Generation Test...');

async function testFromExtensionPopup() {
  try {
    console.log('🔧 Step 1: Checking Extension Context...');
    
    // Verify we have Chrome extension APIs
    if (typeof chrome === 'undefined' || typeof chrome.storage === 'undefined') {
      throw new Error('Chrome extension APIs not available. Run this from the extension popup!');
    }
    
    console.log('✅ Chrome extension APIs available');
    
    console.log('🔧 Step 2: Checking Prerequisites...');
    
    // Check API key and user photos
    const storageResult = await chrome.storage.local.get(['userProfile']);
    const apiKey = storageResult.userProfile?.apiKey;
    const photos = storageResult.userProfile?.photos || [];
    
    console.log('📊 Storage check results:');
    console.log('  Has userProfile:', !!storageResult.userProfile);
    console.log('  API key length:', apiKey?.length || 0);
    console.log('  Photos count:', photos.length);
    console.log('  Full userProfile structure:', storageResult.userProfile);
    
    if (!apiKey || apiKey.length <= 10) {
      return {
        success: false,
        error: 'No valid API key found',
        solution: 'Configure your Gemini API key in the Settings tab of this popup',
        storageDebug: storageResult
      };
    }
    
    if (photos.length === 0) {
      return {
        success: false,
        error: 'No user photos found',
        solution: 'Upload user photos in the Settings → Profile Setup section',
        storageDebug: storageResult
      };
    }
    
    console.log('✅ Prerequisites met');
    
    console.log('🔧 Step 3: Testing Extension Workflow...');
    
    // Test the extension's image processing workflow
    const testClothingUrl = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=600&fit=crop&q=80';
    
    console.log('📷 Testing with clothing image:', testClothingUrl);
    
    // Safely check user photo data
    if (photos[0] && photos[0].data) {
      console.log('👤 User photo data size:', Math.round(photos[0].data.length / 1024), 'KB');
    } else {
      console.log('👤 User photo structure:', photos[0]);
    }
    
    // Make the request through the background script
    const startTime = Date.now();
    console.log('📞 Sending message to background script...');
    
    const response = await chrome.runtime.sendMessage({
      action: 'processImage',
      imageData: { url: testClothingUrl },
      options: {
        type: 'clothing_detection',
        source: 'popup_test',
        autoTryOn: true
      }
    });
    
    const processingTime = Date.now() - startTime;
    console.log('⏱️ Total processing time:', processingTime, 'ms');
    
    console.log('🔧 Step 4: Analyzing Results...');
    console.log('📊 Background script response:', response);
    
    if (!response || !response.success) {
      return {
        success: false,
        error: response?.error || 'Background script request failed',
        processingTime,
        rawResponse: response
      };
    }
    
    const result = response.result;
    console.log('📋 Processing result type:', result.type);
    
    // Check what type of result we got
    if (result.type === 'virtual_tryon_complete') {
      console.log('🎉 Virtual try-on completed!');
      
      const tryOnData = result.tryOnData;
      console.log('📊 Try-on data analysis:');
      console.log('  Processing method:', tryOnData.processingMethod);
      console.log('  Has imageUrl:', !!tryOnData.imageUrl);
      console.log('  Has generatedImage:', !!tryOnData.generatedImage);
      console.log('  Has hasGeneratedImage flag:', !!tryOnData.hasGeneratedImage);
      console.log('  Image URL length:', tryOnData.imageUrl?.length || 0);
      console.log('  Generated image length:', tryOnData.generatedImage?.length || 0);
      console.log('  Confidence:', tryOnData.confidence);
      console.log('  Advanced features:', tryOnData.advanced);
      
      const hasVisualImage = !!(tryOnData.imageUrl || tryOnData.generatedImage);
      
      if (hasVisualImage) {
        console.log('🎉 SUCCESS: Visual try-on image detected!');
        
        // Test if the image actually loads
        const imageUrl = tryOnData.imageUrl || `data:image/jpeg;base64,${tryOnData.generatedImage}`;
        
        console.log('🔧 Step 5: Testing Image Display...');
        const imageTest = await testImageLoad(imageUrl);
        
        return {
          success: true,
          hasVisualImage: true,
          imageTest,
          tryOnData,
          processingTime,
          result: 'SUCCESS: Extension is generating actual visual try-on images!'
        };
        
      } else {
        console.log('⚠️ Try-on completed but no visual image found');
        return {
          success: true,
          hasVisualImage: false,
          tryOnData,
          processingTime,
          result: 'PARTIAL: Try-on completes but still only text analysis, no visual images'
        };
      }
      
    } else if (result.type === 'clothing_detection' || result.type?.includes('detected')) {
      console.log('⚠️ Only clothing detection completed, no try-on generated');
      
      // Check if the detection should have triggered try-on
      const hasDetectedItems = result.aiData?.items?.length > 0 || result.mockData?.items?.length > 0;
      
      return {
        success: false,
        hasVisualImage: false,
        result: 'DETECTION ONLY: Extension detects clothing but doesn\'t generate try-on images',
        detectionResult: result,
        hasDetectedItems,
        processingTime,
        issue: 'Try-on generation is not being triggered after detection'
      };
      
    } else {
      console.log('❓ Unexpected result type:', result.type);
      return {
        success: false,
        hasVisualImage: false,
        result: `UNEXPECTED: Got result type '${result.type}' instead of virtual_tryon_complete`,
        unexpectedResult: result,
        processingTime
      };
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

async function testImageLoad(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'timeout' });
    }, 10000);
    
    img.onload = () => {
      clearTimeout(timeout);
      console.log('✅ Generated image loads successfully!');
      console.log('📐 Image dimensions:', img.width, 'x', img.height);
      resolve({ 
        success: true, 
        width: img.width, 
        height: img.height,
        preview: imageUrl.substring(0, 50) + '...'
      });
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      console.log('❌ Generated image failed to load');
      resolve({ success: false, error: 'load_failed' });
    };
    
    img.src = imageUrl;
  });
}

async function runPopupTest() {
  console.log('🚀 RUNNING EXTENSION POPUP TEST\n');
  
  const testResult = await testFromExtensionPopup();
  
  console.log('\n🎯 EXTENSION POPUP TEST RESULTS');
  console.log('='.repeat(50));
  
  if (testResult.success) {
    if (testResult.hasVisualImage) {
      console.log('🎉 SUCCESS: Extension IS generating visual images!');
      console.log('');
      console.log('✅ CONFIRMED WORKING:');
      console.log('  • Virtual try-on images are being generated');
      console.log('  • Processing time:', testResult.processingTime, 'ms');
      
      if (testResult.imageTest?.success) {
        console.log('  • Image loads and displays correctly');
        console.log('  • Image dimensions:', testResult.imageTest.width, 'x', testResult.imageTest.height);
      }
      
      console.log('  • Processing method:', testResult.tryOnData.processingMethod);
      console.log('');
      console.log('🎯 WHAT THIS MEANS:');
      console.log('  ✅ Your extension now shows actual composite images');
      console.log('  ✅ Users can see themselves wearing the clothing');
      console.log('  ✅ Gemini 2.5 Flash Image integration is working');
      
    } else {
      console.log('⚠️ PARTIAL SUCCESS: No visual images generated');
      console.log('');
      console.log('📊 CURRENT STATUS:');
      console.log('  • Extension workflow completes successfully');
      console.log('  • But still only generating text analysis');
      console.log('  • No actual visual composite images');
      console.log('  • Processing time:', testResult.processingTime, 'ms');
      console.log('');
      console.log('🔧 NEXT STEPS NEEDED:');
      console.log('  • Verify Gemini 2.5 Flash Image Preview model is being used');
      console.log('  • Check response_modalities configuration');
      console.log('  • Ensure API key has image generation permissions');
    }
    
  } else {
    console.log('❌ TEST FAILED');
    console.log('');
    console.log('❌ Error:', testResult.error);
    
    if (testResult.solution) {
      console.log('💡 Solution:', testResult.solution);
    }
    
    if (testResult.issue) {
      console.log('🔍 Issue:', testResult.issue);
    }
    
    console.log('');
    console.log('🔧 TROUBLESHOOTING:');
    
    if (testResult.error && testResult.error.includes('API key')) {
      console.log('  1. Click the Settings button in this popup');
      console.log('  2. Enter your Gemini API key');
      console.log('  3. Click "Test API Connection"');
    } else if (testResult.error && testResult.error.includes('photos')) {
      console.log('  1. Click the Settings button in this popup');
      console.log('  2. Go to Profile Setup section');
      console.log('  3. Upload 1-2 clear photos of yourself');
    } else if (testResult.error && testResult.error.includes('Chrome extension APIs')) {
      console.log('  1. Open the extension popup (click the extension icon)');
      console.log('  2. Right-click in the popup → Inspect');
      console.log('  3. Run this test in the popup\'s console, not the page console');
    } else {
      console.log('  1. Check that the extension is properly loaded');
      console.log('  2. Try refreshing the extension');
      console.log('  3. Check browser console for detailed errors');
    }
  }
  
  console.log('\n📋 Full test result stored in window.popupTestResult');
  window.popupTestResult = testResult;
  
  return testResult;
}

// Auto-run the test
runPopupTest().catch(console.error);

// Export for manual testing
window.popupTest = {
  testFromExtensionPopup,
  runPopupTest,
  testImageLoad
};

console.log('\n🔧 Popup test functions available in window.popupTest');
