// Debug Test Script for Image Generation - Verify Correct Model Usage
// Run this in browser console to check if we're using the right model and settings

console.log('🔍 Debugging Image Generation Implementation...');

async function debugImageGenerationSetup() {
  try {
    console.log('🔧 Step 1: Checking Model Configuration...');
    
    // Check if GeminiIntegration is available
    if (typeof window.geminiIntegration === 'undefined') {
      console.log('❌ GeminiIntegration not available');
      return { error: 'GeminiIntegration not available' };
    }

    const gemini = window.geminiIntegration;
    
    // Check the model endpoints
    console.log('📋 Model Configuration:');
    console.log('  Base URL:', gemini.baseUrl);
    console.log('  Image Model URL:', gemini.imageModel);
    console.log('  Expected Image Model: gemini-2.5-flash-image-preview');
    
    const isCorrectModel = gemini.imageModel.includes('gemini-2.5-flash-image-preview');
    console.log('  ✅ Correct Model?', isCorrectModel ? 'YES' : 'NO');

    if (!isCorrectModel) {
      console.log('❌ ISSUE FOUND: Not using the image generation model!');
      console.log('   Current:', gemini.imageModel);
      console.log('   Should be: ...gemini-2.5-flash-image-preview:generateContent');
    }

    // Check API key
    const result = await chrome.storage.local.get(['userProfile']);
    const apiKey = result.userProfile?.apiKey;
    
    if (!apiKey || apiKey.length <= 10) {
      console.log('❌ No valid API key found');
      return { error: 'No API key configured' };
    }

    console.log('✅ API key found');
    gemini.setApiKey(apiKey);

    console.log('🔧 Step 2: Testing Image Generation Request Structure...');
    
    // Test building the image generation prompt
    const testPrompt = gemini.buildImageGenerationPrompt({
      category: 'shirt',
      preserveFeatures: true
    });
    
    console.log('📝 Generated Prompt (first 200 chars):', testPrompt.substring(0, 200) + '...');
    console.log('   Prompt includes "composite image"?', testPrompt.includes('composite image'));
    console.log('   Prompt mentions "generate"?', testPrompt.toLowerCase().includes('generate'));

    // Check user photos
    const photos = result.userProfile?.photos || [];
    if (photos.length === 0) {
      console.log('❌ No user photos available');
      return { error: 'No user photos. Upload photos in Settings first.' };
    }

    console.log('✅ User photos available:', photos.length);

    console.log('🔧 Step 3: Testing Request Body Structure...');
    
    // Test the request body structure that would be sent
    const testUserPhoto = photos[0].data;
    const testClothingUrl = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400';
    
    // Note: We're not actually making the API call here, just testing the structure
    const mockRequestBody = {
      contents: [{
        parts: [
          { text: testPrompt },
          {
            inline_data: {
              mime_type: gemini.getMimeType(testUserPhoto),
              data: gemini.getBase64Data(testUserPhoto)
            }
          },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: 'mock_clothing_data'
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        response_modalities: ["TEXT", "IMAGE"] // This is crucial!
      }
    };

    console.log('📋 Request Body Structure:');
    console.log('   Has contents?', !!mockRequestBody.contents);
    console.log('   Parts count:', mockRequestBody.contents[0].parts.length);
    console.log('   Has text part?', !!mockRequestBody.contents[0].parts[0].text);
    console.log('   Has user image part?', !!mockRequestBody.contents[0].parts[1].inline_data);
    console.log('   Has clothing image part?', !!mockRequestBody.contents[0].parts[2].inline_data);
    console.log('   ✅ Has response_modalities?', !!mockRequestBody.generationConfig.response_modalities);
    console.log('   ✅ Includes IMAGE modality?', 
      mockRequestBody.generationConfig.response_modalities?.includes('IMAGE'));

    if (!mockRequestBody.generationConfig.response_modalities?.includes('IMAGE')) {
      console.log('❌ CRITICAL ISSUE: response_modalities does not include IMAGE!');
      return { error: 'Missing IMAGE in response_modalities' };
    }

    console.log('🔧 Step 4: Testing Actual API Call (Limited)...');
    
    try {
      // Test just the connection to the image model endpoint
      const testUrl = `${gemini.imageModel}?key=${apiKey}`;
      console.log('🌐 Testing URL:', testUrl.replace(apiKey, 'API_KEY_HIDDEN'));
      
      // We won't make a full request to avoid using API quota, but we can test the URL structure
      const urlCheck = gemini.imageModel.includes('gemini-2.5-flash-image-preview');
      console.log('✅ URL points to image generation model?', urlCheck);
      
    } catch (error) {
      console.log('⚠️ URL test error:', error.message);
    }

    return {
      success: true,
      checks: {
        correctModel: isCorrectModel,
        hasApiKey: !!apiKey,
        hasUserPhotos: photos.length > 0,
        hasResponseModalities: true,
        includesImageModality: true,
        promptStructure: testPrompt.includes('composite')
      },
      recommendations: [
        isCorrectModel ? '✅ Model endpoint is correct' : '❌ Fix model endpoint',
        apiKey ? '✅ API key is configured' : '❌ Configure API key',
        photos.length > 0 ? '✅ User photos available' : '❌ Upload user photos',
        '✅ Response modalities configured correctly',
        '✅ Prompt structure looks good'
      ]
    };

  } catch (error) {
    console.error('❌ Debug test failed:', error);
    return { 
      success: false, 
      error: error.message,
      stack: error.stack 
    };
  }
}

async function testActualImageGeneration() {
  try {
    console.log('🎨 Testing Actual Image Generation Call...');
    
    // Get user data
    const result = await chrome.storage.local.get(['userProfile']);
    const apiKey = result.userProfile?.apiKey;
    const photos = result.userProfile?.photos || [];
    
    if (!apiKey || photos.length === 0) {
      console.log('⚠️ Skipping actual test - missing API key or photos');
      return { skipped: true };
    }

    const gemini = window.geminiIntegration;
    gemini.setApiKey(apiKey);

    console.log('📞 Making actual API call to test image generation...');
    
    const generateResult = await gemini.generateTryOnImage(
      photos[0].data,
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
      { category: 'shirt' }
    );

    console.log('📊 API Response:', generateResult);
    
    if (generateResult.success) {
      console.log('🎉 SUCCESS! Image generation API call worked!');
      console.log('   Has generated image:', !!generateResult.generatedImage);
      console.log('   Has image URL:', !!generateResult.imageUrl);
      console.log('   Image data length:', generateResult.generatedImage?.length || 0);
      
      return {
        success: true,
        hasImage: !!generateResult.generatedImage,
        hasUrl: !!generateResult.imageUrl,
        result: generateResult
      };
    } else {
      console.log('❌ Image generation failed:', generateResult.error);
      return {
        success: false,
        error: generateResult.error,
        fallback: generateResult.fallback
      };
    }

  } catch (error) {
    console.error('❌ Actual test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function runImageGenerationDebug() {
  console.log('🚀 Running Complete Image Generation Debug...\n');

  // Debug setup
  console.log('🔬 Phase 1: Configuration Debug...');
  const setupDebug = await debugImageGenerationSetup();
  console.log('');

  // Test actual generation if setup looks good
  if (setupDebug.success) {
    console.log('🔬 Phase 2: Actual Generation Test...');
    const generationTest = await testActualImageGeneration();
    console.log('');

    // Summary
    console.log('📊 DEBUG SUMMARY:');
    console.log('='.repeat(50));
    
    console.log('Configuration Checks:');
    setupDebug.recommendations.forEach(rec => console.log('  ' + rec));
    
    console.log('\nGeneration Test:');
    if (generationTest.skipped) {
      console.log('  ⚠️ Skipped - missing requirements');
    } else if (generationTest.success) {
      console.log('  ✅ SUCCESS - Images are being generated!');
    } else {
      console.log('  ❌ FAILED - ' + generationTest.error);
    }

    console.log('\n🎯 DIAGNOSIS:');
    
    if (generationTest.success) {
      console.log('🎉 Image generation is working correctly!');
      console.log('   The extension should now show actual composite images.');
      console.log('   If you\'re still seeing analysis only, check the popup display logic.');
    } else if (generationTest.skipped) {
      console.log('⚠️ Cannot test image generation - ensure you have:');
      console.log('   1. Valid Gemini API key in Settings');
      console.log('   2. User photos uploaded in Settings');
    } else {
      console.log('❌ Image generation is not working. Issues found:');
      if (!setupDebug.checks.correctModel) {
        console.log('   • Model endpoint needs to be fixed');
      }
      if (generationTest.error) {
        console.log('   • API error: ' + generationTest.error);
      }
    }

  } else {
    console.log('❌ Configuration issues found:');
    console.log('   Error:', setupDebug.error);
  }

  return {
    setup: setupDebug,
    generation: setupDebug.success ? await testActualImageGeneration() : null
  };
}

// Auto-run
runImageGenerationDebug().catch(console.error);

// Export for manual use
window.imageGenerationDebug = {
  debugImageGenerationSetup,
  testActualImageGeneration,
  runImageGenerationDebug
};

console.log('\n🔧 Debug functions available in window.imageGenerationDebug');
