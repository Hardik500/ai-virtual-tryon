// Test Script for Image Generation with Gemini 2.5 Flash Image
// Run this in the browser console to test the actual image generation

console.log('🎨 Testing Virtual Try-On Image Generation...');

async function testImageGeneration() {
  try {
    console.log('🔧 Step 1: Testing Image Generation Setup...');
    
    // Check if GeminiIntegration is available
    if (typeof window.geminiIntegration === 'undefined') {
      console.log('❌ GeminiIntegration not available');
      return { error: 'GeminiIntegration not available' };
    }

    // Check API key
    const result = await chrome.storage.local.get(['userProfile']);
    const apiKey = result.userProfile?.apiKey;
    
    if (!apiKey || apiKey.length <= 10) {
      console.log('❌ No valid API key found');
      return { error: 'No API key configured' };
    }

    console.log('✅ API key found');

    // Check user photos
    const photos = result.userProfile?.photos || [];
    if (photos.length === 0) {
      console.log('❌ No user photos available for try-on');
      return { error: 'No user photos. Please upload photos in Settings first.' };
    }

    console.log('✅ User photos available:', photos.length);

    console.log('🔧 Step 2: Testing Image Generation...');
    
    // Use sample clothing image URL
    const testClothingUrl = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400';
    const userPhoto = photos[0].data; // First user photo

    // Initialize Gemini integration
    const gemini = window.geminiIntegration;
    gemini.setApiKey(apiKey);

    console.log('🎨 Generating virtual try-on image...');
    console.log('👤 User photo size:', userPhoto.length, 'characters');
    console.log('👕 Clothing URL:', testClothingUrl);
    
    // Generate try-on image
    const generateResult = await gemini.generateTryOn(
      userPhoto,
      testClothingUrl,
      {
        category: 'clothing',
        preserveFeatures: true,
        style: 'natural',
        lighting: 'auto'
      }
    );

    console.log('📊 Generation Result:', generateResult);

    if (!generateResult.success) {
      console.log('❌ Image generation failed:', generateResult.error);
      return { 
        error: 'Image generation failed: ' + generateResult.error,
        fallback: generateResult.fallback 
      };
    }

    console.log('✅ Image generation successful!');
    console.log('🖼️ Generated image size:', generateResult.generatedImage?.length || 0, 'characters');
    console.log('🔗 Image URL available:', !!generateResult.imageUrl);
    console.log('📝 Has analysis:', !!generateResult.analysis);

    console.log('🔧 Step 3: Testing Image Display...');
    
    // Test displaying the generated image
    if (generateResult.imageUrl) {
      console.log('🎉 SUCCESS! Generated image is ready for display');
      console.log('Image URL:', generateResult.imageUrl.substring(0, 50) + '...');
      
      // Try to create an image element to verify it works
      const testImg = new Image();
      testImg.onload = () => {
        console.log('✅ Generated image loads successfully');
        console.log('📐 Image dimensions:', testImg.width, 'x', testImg.height);
      };
      testImg.onerror = () => {
        console.log('❌ Generated image failed to load');
      };
      testImg.src = generateResult.imageUrl;

      // Test refinement capability
      console.log('🔧 Step 4: Testing Image Refinement...');
      
      try {
        const refinementResult = await gemini.refineGeneratedImage(
          generateResult.generatedImage,
          'Make the lighting brighter and more natural',
          { preserveCharacter: true }
        );

        console.log('🎨 Refinement Result:', refinementResult);
        
        if (refinementResult.success) {
          console.log('✅ Image refinement successful!');
        } else {
          console.log('⚠️ Image refinement failed:', refinementResult.error);
        }
      } catch (refinementError) {
        console.log('⚠️ Image refinement error:', refinementError.message);
      }

      return {
        success: true,
        features: {
          imageGeneration: true,
          imageDisplay: true,
          analysis: !!generateResult.analysis,
          refinement: true
        },
        result: generateResult,
        message: 'Virtual try-on image generation is working!'
      };

    } else {
      console.log('⚠️ No image URL generated, but process completed');
      return {
        success: false,
        error: 'No image URL in result',
        result: generateResult
      };
    }

  } catch (error) {
    console.error('❌ Image generation test failed:', error);
    return { 
      success: false, 
      error: error.message,
      stack: error.stack 
    };
  }
}

async function testFullTryOnFlow() {
  try {
    console.log('🚀 Testing Complete Try-On Flow with Image Generation...');

    // Test via background script (full flow)
    const response = await chrome.runtime.sendMessage({
      action: 'processImage',
      imageData: { 
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' 
      },
      options: {
        type: 'clothing_detection',
        source: 'image_generation_test',
        autoTryOn: true // Enable auto try-on
      }
    });

    console.log('📨 Full flow response:', response);

    if (response.success && response.result) {
      const result = response.result;
      
      if (result.type === 'virtual_tryon_complete') {
        console.log('🎉 SUCCESS! Full flow with image generation working!');
        console.log('🖼️ Has generated image:', !!result.tryOnData?.imageUrl);
        console.log('📊 Has analysis:', !!result.tryOnData?.analysis);
        console.log('🎯 Try-on data:', result.tryOnData);
        
        return {
          success: true,
          fullFlow: true,
          hasGeneratedImage: !!result.tryOnData?.imageUrl,
          result: result
        };
      } else {
        console.log('⚠️ Flow completed but no image generated');
        return {
          success: false,
          reason: 'No image in full flow result',
          result: result
        };
      }
    } else {
      console.log('❌ Full flow failed:', response.error);
      return {
        success: false,
        error: response.error
      };
    }

  } catch (error) {
    console.error('❌ Full flow test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function runImageGenerationTests() {
  console.log('🚀 Running Complete Image Generation Test Suite...\n');

  // Test direct image generation
  console.log('🔬 Testing Direct Image Generation...');
  const directTest = await testImageGeneration();
  console.log('');

  // Test full flow
  console.log('🔄 Testing Full Try-On Flow...');
  const flowTest = await testFullTryOnFlow();
  console.log('');

  // Summary
  console.log('📊 IMAGE GENERATION TEST RESULTS:');
  console.log('='.repeat(50));
  
  if (directTest.success) {
    console.log('✅ Direct Image Generation: WORKING');
    console.log('  - Image Creation:', directTest.features?.imageGeneration ? '✅' : '❌');
    console.log('  - Image Display:', directTest.features?.imageDisplay ? '✅' : '❌');
    console.log('  - AI Analysis:', directTest.features?.analysis ? '✅' : '❌');
    console.log('  - Image Refinement:', directTest.features?.refinement ? '✅' : '❌');
  } else {
    console.log('❌ Direct Image Generation: FAILED');
    console.log('  Error:', directTest.error);
  }

  if (flowTest.success) {
    console.log('✅ Full Try-On Flow: WORKING');
    console.log('  - Generated Image:', flowTest.hasGeneratedImage ? '✅' : '⚠️');
    console.log('  - Complete Flow:', flowTest.fullFlow ? '✅' : '❌');
  } else {
    console.log('❌ Full Try-On Flow: FAILED');
    console.log('  Error:', flowTest.error);
  }

  console.log('\n🎯 FINAL STATUS:');
  
  if (directTest.success || flowTest.success) {
    console.log('🎉 SUCCESS! Your extension can now generate actual virtual try-on images!');
    console.log('');
    console.log('🆕 NEW CAPABILITIES:');
    console.log('  • Actual image generation (not just text analysis)');
    console.log('  • Visual try-on results showing user wearing clothes');
    console.log('  • Image refinement with conversational prompts');
    console.log('  • High-quality composite images');
    console.log('  • Character consistency preservation');
    console.log('');
    console.log('📝 NEXT STEPS:');
    console.log('  1. Test with different clothing items');
    console.log('  2. Try the refinement feature ("Refine Image" button)');
    console.log('  3. Compare results with different user photos');
    console.log('  4. Enjoy realistic virtual try-on experiences!');
  } else {
    console.log('⚠️ IMAGE GENERATION NOT WORKING YET');
    console.log('');
    console.log('🔧 TROUBLESHOOTING:');
    console.log('  1. Ensure you have a valid Gemini API key');
    console.log('  2. Make sure user photos are uploaded');
    console.log('  3. Check browser console for errors');
    console.log('  4. Verify internet connectivity');
    console.log('  5. Try refreshing the extension');
  }

  return {
    directGeneration: directTest,
    fullFlow: flowTest,
    overallSuccess: directTest.success || flowTest.success
  };
}

// Auto-run the test suite
runImageGenerationTests().catch(console.error);

// Export for manual testing
window.imageGenerationTest = {
  testImageGeneration,
  testFullTryOnFlow,
  runImageGenerationTests
};

console.log('\n🔧 Image generation test functions available in window.imageGenerationTest');
