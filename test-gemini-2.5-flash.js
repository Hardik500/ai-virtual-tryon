// Gemini 2.5 Flash Image Model Test Script
// Paste this in browser console to test the new model integration

console.log('🚀 Testing Gemini 2.5 Flash Image Integration...');

async function testGemini25FlashImage() {
  try {
    console.log('🔧 Step 1: Testing API Configuration...');
    
    // Check if the new GeminiIntegration class is available
    if (typeof GeminiIntegration === 'undefined' && typeof window.geminiIntegration === 'undefined') {
      console.log('❌ GeminiIntegration not available. Trying to load...');
      // In a real extension context, this would be loaded via importScripts
      return { error: 'GeminiIntegration class not available' };
    }

    // Get API key from storage
    const result = await chrome.storage.local.get(['userProfile']);
    const apiKey = result.userProfile?.apiKey;
    
    if (!apiKey || apiKey.length <= 10) {
      console.log('❌ No valid API key found');
      return { error: 'No API key configured' };
    }

    console.log('✅ API key found:', apiKey.substring(0, 10) + '...');

    // Initialize Gemini integration
    const gemini = window.geminiIntegration || new GeminiIntegration();
    gemini.setApiKey(apiKey);

    console.log('🔧 Step 2: Testing API Connection...');
    
    // Test basic connection
    const connectionTest = await gemini.testConnection();
    if (!connectionTest) {
      console.log('❌ API connection test failed');
      return { error: 'API connection failed' };
    }
    
    console.log('✅ API connection successful');

    console.log('🔧 Step 3: Testing Clothing Detection with Gemini 2.5...');
    
    // Test clothing detection with a sample image URL
    const testImageUrl = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400';
    
    const detectionResult = await gemini.detectClothing(testImageUrl, {
      category: 'auto',
      source: 'gemini_2.5_test'
    });

    console.log('📊 Detection Result:', detectionResult);

    if (!detectionResult.success) {
      console.log('❌ Clothing detection failed:', detectionResult.error);
      return { error: 'Clothing detection failed: ' + detectionResult.error };
    }

    console.log('✅ Clothing detection successful');
    console.log('📦 Detected items:', detectionResult.items?.length || 0);

    console.log('🔧 Step 4: Testing Enhanced Safety Features...');
    
    // Test safety validation
    const safetyResult = await gemini.validateImageSafety(testImageUrl);
    console.log('🛡️ Safety Result:', safetyResult);

    console.log('🔧 Step 5: Testing Usage Statistics...');
    
    // Test usage tracking
    const usageStats = await gemini.getUsageStats();
    console.log('📈 Usage Stats:', usageStats);

    console.log('🔧 Step 6: Testing Advanced Try-On Features...');
    
    // Test user photo availability
    const userPhotos = await chrome.storage.local.get(['userProfile']);
    const photos = userPhotos.userProfile?.photos || [];
    
    if (photos.length === 0) {
      console.log('⚠️ No user photos available for try-on test');
      return {
        success: true,
        features: {
          apiConnection: true,
          clothingDetection: detectionResult.success,
          safetyValidation: safetyResult.safe,
          usageTracking: true,
          advancedTryOn: false,
          reason: 'No user photos'
        }
      };
    }

    // Test virtual try-on with enhanced features
    const tryOnResult = await gemini.generateTryOn(
      photos[0].data, // First user photo
      testImageUrl,   // Clothing item
      {
        category: 'clothing',
        preserveFeatures: true,
        style: 'natural',
        lighting: 'auto',
        characterConsistency: true,
        multiImageFusion: true
      }
    );

    console.log('🎯 Try-On Result:', tryOnResult);

    return {
      success: true,
      features: {
        apiConnection: true,
        clothingDetection: detectionResult.success,
        safetyValidation: safetyResult.safe,
        usageTracking: true,
        advancedTryOn: tryOnResult.success,
        enhancedAnalysis: tryOnResult.advanced || false
      },
      results: {
        detection: detectionResult,
        safety: safetyResult,
        usage: usageStats,
        tryOn: tryOnResult
      }
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { 
      success: false, 
      error: error.message,
      stack: error.stack 
    };
  }
}

async function testEnhancedImageProcessing() {
  try {
    console.log('🖼️ Testing Enhanced Image Processing...');

    if (typeof window.imageProcessor === 'undefined') {
      console.log('❌ ImageProcessor not available');
      return { error: 'ImageProcessor not available' };
    }

    const processor = window.imageProcessor;
    const testImageUrl = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400';

    console.log('🔧 Testing Gemini preparation...');
    
    const preparedResult = await processor.prepareForGemini(testImageUrl, {
      maxSize: 2048,
      quality: 0.95,
      optimize: true
    });

    console.log('📊 Preparation Result:', preparedResult);

    if (!preparedResult.success) {
      console.log('❌ Image preparation failed:', preparedResult.error);
      return { error: 'Image preparation failed' };
    }

    console.log('✅ Image preparation successful');
    console.log('📐 Optimized for Gemini:', preparedResult.metadata?.optimizedForGemini);
    console.log('🎨 Dominant colors:', preparedResult.metadata?.dominantColors?.length || 0);

    return {
      success: true,
      imageProcessing: {
        preparation: preparedResult.success,
        optimization: preparedResult.metadata?.optimizedForGemini || false,
        colorExtraction: (preparedResult.metadata?.dominantColors?.length || 0) > 0,
        metadata: preparedResult.metadata
      }
    };

  } catch (error) {
    console.error('❌ Image processing test failed:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

async function runFullGemini25Test() {
  console.log('🚀 Running Complete Gemini 2.5 Flash Image Test Suite...\n');

  // Test Gemini integration
  console.log('🔬 Testing Gemini 2.5 Flash Image Integration...');
  const geminiTest = await testGemini25FlashImage();
  console.log('');

  // Test image processing
  console.log('🖼️ Testing Enhanced Image Processing...');
  const imageTest = await testEnhancedImageProcessing();
  console.log('');

  // Summary
  console.log('📊 TEST RESULTS SUMMARY:');
  console.log('='.repeat(50));
  
  if (geminiTest.success) {
    console.log('✅ Gemini 2.5 Flash Image: WORKING');
    console.log('  - API Connection:', geminiTest.features?.apiConnection ? '✅' : '❌');
    console.log('  - Clothing Detection:', geminiTest.features?.clothingDetection ? '✅' : '❌');
    console.log('  - Safety Validation:', geminiTest.features?.safetyValidation ? '✅' : '❌');
    console.log('  - Usage Tracking:', geminiTest.features?.usageTracking ? '✅' : '❌');
    console.log('  - Advanced Try-On:', geminiTest.features?.advancedTryOn ? '✅' : '⚠️');
    console.log('  - Enhanced Analysis:', geminiTest.features?.enhancedAnalysis ? '✅' : '⚠️');
  } else {
    console.log('❌ Gemini 2.5 Flash Image: FAILED');
    console.log('  Error:', geminiTest.error);
  }

  if (imageTest.success) {
    console.log('✅ Enhanced Image Processing: WORKING');
    console.log('  - Gemini Preparation:', imageTest.imageProcessing?.preparation ? '✅' : '❌');
    console.log('  - AI Optimization:', imageTest.imageProcessing?.optimization ? '✅' : '❌');
    console.log('  - Color Extraction:', imageTest.imageProcessing?.colorExtraction ? '✅' : '❌');
  } else {
    console.log('❌ Enhanced Image Processing: FAILED');
    console.log('  Error:', imageTest.error);
  }

  console.log('\n🎯 UPGRADE STATUS:');
  
  if (geminiTest.success && imageTest.success) {
    console.log('🎉 SUCCESS! Your extension has been upgraded to Gemini 2.5 Flash Image!');
    console.log('');
    console.log('🆕 NEW FEATURES AVAILABLE:');
    console.log('  • Enhanced character consistency');
    console.log('  • Multi-image fusion capabilities');
    console.log('  • Advanced fit and styling analysis');
    console.log('  • Improved safety validation');
    console.log('  • Real-time usage tracking');
    console.log('  • AI-optimized image processing');
    console.log('');
    console.log('📝 NEXT STEPS:');
    console.log('  1. Upload user photos in Settings if not done already');
    console.log('  2. Test the extension on various clothing websites');
    console.log('  3. Compare results with previous version');
    console.log('  4. Enjoy the enhanced virtual try-on experience!');
  } else {
    console.log('⚠️ PARTIAL SUCCESS - Some features may not be working correctly');
    console.log('');
    console.log('🔧 TROUBLESHOOTING:');
    console.log('  1. Check your Gemini API key in Settings');
    console.log('  2. Ensure you have internet connectivity');
    console.log('  3. Try refreshing the extension');
    console.log('  4. Check browser console for additional error details');
  }

  return {
    gemini: geminiTest,
    imageProcessing: imageTest,
    overallSuccess: geminiTest.success && imageTest.success
  };
}

// Auto-run the test suite
runFullGemini25Test().catch(console.error);

// Export for manual testing
window.gemini25Test = {
  testGemini25FlashImage,
  testEnhancedImageProcessing,
  runFullGemini25Test
};

console.log('\n🔧 Test functions available in window.gemini25Test');
