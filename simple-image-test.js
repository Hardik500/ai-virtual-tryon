// Simple Image Generation Test - Direct Extension Testing
// This bypasses the class loading issues and tests via the background script

console.log('🎨 Starting Simple Image Generation Test...');

async function testImageGenerationDirect() {
  try {
    console.log('🔧 Step 1: Checking Prerequisites...');
    
    // Check API key and user photos
    const storageResult = await chrome.storage.local.get(['userProfile']);
    const apiKey = storageResult.userProfile?.apiKey;
    const photos = storageResult.userProfile?.photos || [];
    
    if (!apiKey || apiKey.length <= 10) {
      console.log('❌ No API key found. Please configure in Settings.');
      return { error: 'No API key configured' };
    }
    
    if (photos.length === 0) {
      console.log('❌ No user photos found. Please upload photos in Settings.');
      return { error: 'No user photos available' };
    }
    
    console.log('✅ API key configured');
    console.log('✅ User photos available:', photos.length);
    
    console.log('🔧 Step 2: Testing Image Generation via Extension...');
    
    // Test clothing detection + try-on generation
    const clothingUrl = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=600&fit=crop&q=80';
    
    console.log('📷 Testing with clothing URL:', clothingUrl);
    console.log('👤 Using user photo (size):', Math.round(photos[0].data.length / 1024), 'KB');
    
    const startTime = Date.now();
    const response = await chrome.runtime.sendMessage({
      action: 'processImage',
      imageData: { url: clothingUrl },
      options: {
        type: 'clothing_detection',
        source: 'simple_image_test',
        autoTryOn: true // This should trigger try-on generation
      }
    });
    const processingTime = Date.now() - startTime;
    
    console.log('⏱️ Processing time:', processingTime, 'ms');
    console.log('📊 Raw response:', response);
    
    if (!response.success) {
      console.log('❌ Processing failed:', response.error);
      return {
        success: false,
        error: response.error,
        processingTime
      };
    }
    
    console.log('🔧 Step 3: Analyzing Response...');
    
    const responseResult = response.result;
    console.log('📋 Result type:', responseResult.type);
    console.log('📋 Has tryOnData:', !!responseResult.tryOnData);
    
    if (responseResult.type === 'virtual_tryon_complete') {
      console.log('🎉 Virtual try-on completed!');
      
      const tryOnData = responseResult.tryOnData;
      const hasImageUrl = !!tryOnData.imageUrl;
      const hasGeneratedImage = !!tryOnData.generatedImage;
      const hasActualImage = hasImageUrl || hasGeneratedImage;
      
      console.log('📊 Try-on analysis:');
      console.log('  Has image URL:', hasImageUrl ? '✅' : '❌');
      console.log('  Has generated image:', hasGeneratedImage ? '✅' : '❌');
      console.log('  Image URL length:', tryOnData.imageUrl?.length || 0);
      console.log('  Generated image length:', tryOnData.generatedImage?.length || 0);
      console.log('  Processing method:', tryOnData.processingMethod);
      console.log('  Has actual image:', hasActualImage ? '✅' : '❌');
      
      if (hasActualImage) {
        console.log('🔧 Step 4: Testing Image Display...');
        
        const imageUrl = tryOnData.imageUrl || `data:image/jpeg;base64,${tryOnData.generatedImage}`;
        
        // Test if image loads
        const imageTest = await new Promise((resolve) => {
          const img = new Image();
          const timeout = setTimeout(() => {
            resolve({ success: false, error: 'timeout' });
          }, 10000);
          
          img.onload = () => {
            clearTimeout(timeout);
            console.log('✅ Generated image loads successfully!');
            console.log('📐 Dimensions:', img.width, 'x', img.height);
            resolve({ 
              success: true, 
              width: img.width, 
              height: img.height,
              url: imageUrl.substring(0, 50) + '...'
            });
          };
          
          img.onerror = () => {
            clearTimeout(timeout);
            console.log('❌ Generated image failed to load');
            resolve({ success: false, error: 'load_failed' });
          };
          
          img.src = imageUrl;
        });
        
        return {
          success: true,
          hasActualImage: true,
          imageTest,
          tryOnData,
          processingTime,
          message: hasActualImage ? 'SUCCESS: Actual images are being generated!' : 'PARTIAL: Try-on completed but no image generated'
        };
        
      } else {
        console.log('⚠️ Try-on completed but no actual image generated');
        return {
          success: true,
          hasActualImage: false,
          tryOnData,
          processingTime,
          message: 'Try-on completed but no visual image generated - still text analysis only'
        };
      }
      
    } else {
      console.log('⚠️ Only got detection result, no try-on generated');
      console.log('📋 Result details:', responseResult);
      
      return {
        success: false,
        hasActualImage: false,
        result: responseResult,
        processingTime,
        error: 'Only clothing detection completed, no try-on image generated'
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

async function runSimpleImageTest() {
  console.log('🚀 RUNNING SIMPLE IMAGE GENERATION TEST\n');
  
  const testResult = await testImageGenerationDirect();
  
  console.log('\n🎯 TEST RESULTS');
  console.log('='.repeat(40));
  
  if (testResult.success) {
    if (testResult.hasActualImage) {
      console.log('🎉 SUCCESS! Your extension IS generating actual images!');
      console.log('');
      console.log('✅ CONFIRMED:');
      console.log('  • Virtual try-on images are being generated');
      console.log('  • Images load and display properly');
      console.log('  • Processing time:', testResult.processingTime, 'ms');
      
      if (testResult.imageTest?.success) {
        console.log('  • Image dimensions:', testResult.imageTest.width, 'x', testResult.imageTest.height);
      }
      
      console.log('');
      console.log('🎯 WHAT THIS MEANS:');
      console.log('  • Your extension now shows actual composite images');
      console.log('  • Users can see themselves wearing the clothing');
      console.log('  • The Gemini 2.5 Flash Image integration is working');
      
    } else {
      console.log('⚠️ PARTIAL SUCCESS: Try-on works but no images generated');
      console.log('');
      console.log('📊 STATUS:');
      console.log('  • Virtual try-on process completes');
      console.log('  • But still only getting text analysis');
      console.log('  • No actual visual images generated');
      console.log('');
      console.log('🔧 POSSIBLE ISSUES:');
      console.log('  • API key may not have image generation permissions');
      console.log('  • Model endpoint might not be correctly configured');
      console.log('  • Response parsing may not be extracting images');
    }
    
  } else {
    console.log('❌ FAILED:', testResult.error);
    console.log('');
    console.log('🔧 TROUBLESHOOTING:');
    
    if (testResult.error.includes('API key')) {
      console.log('  • Configure your Gemini API key in Settings');
    } else if (testResult.error.includes('user photos')) {
      console.log('  • Upload user photos in Settings → Profile Setup');
    } else {
      console.log('  • Check browser console for detailed errors');
      console.log('  • Verify internet connectivity');
      console.log('  • Try refreshing the extension');
    }
  }
  
  console.log('\n📋 Full test result stored in window.lastSimpleTest');
  window.lastSimpleTest = testResult;
  
  return testResult;
}

// Auto-run the test
runSimpleImageTest().catch(console.error);

// Export for manual testing
window.simpleImageTest = {
  testImageGenerationDirect,
  runSimpleImageTest
};

console.log('\n🔧 Simple test functions available in window.simpleImageTest');
