// Virtual Try-On Diagnosis Script
// Paste this in browser console to diagnose why you're not seeing try-on images

console.log('🔍 Diagnosing Virtual Try-On Issue...');

async function checkUserPhotos() {
  try {
    console.log('📷 Checking user photos...');
    
    const result = await chrome.storage.local.get(['userProfile']);
    const profile = result.userProfile;
    
    if (!profile) {
      console.log('❌ No user profile found');
      return { hasProfile: false, photoCount: 0, photos: [] };
    }
    
    const photos = profile.photos || [];
    console.log('📊 Profile data:', {
      hasProfile: true,
      photoCount: photos.length,
      hasPhotos: photos.length > 0,
      photoIds: photos.map(p => p.id || 'no-id')
    });
    
    if (photos.length === 0) {
      console.log('⚠️ NO USER PHOTOS FOUND!');
      console.log('💡 This is why you only see detection, not try-on results');
      console.log('🔧 Solution: Go to Settings → Profile Setup → Upload Photos');
      return { hasProfile: true, photoCount: 0, photos: [] };
    } else {
      console.log('✅ Found', photos.length, 'user photos');
      photos.forEach((photo, i) => {
        console.log(`  ${i + 1}. ID: ${photo.id}, Type: ${photo.type}, Size: ${photo.data?.length || 0} bytes`);
      });
      return { hasProfile: true, photoCount: photos.length, photos };
    }
    
  } catch (error) {
    console.error('❌ Error checking user photos:', error);
    return { hasProfile: false, photoCount: 0, photos: [], error: error.message };
  }
}

async function testTryOnFlow() {
  try {
    console.log('🎯 Testing complete try-on flow...');
    
    // Test with autoTryOn enabled
    const response = await chrome.runtime.sendMessage({
      action: 'processImage',
      imageData: { 
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' 
      },
      options: {
        type: 'clothing_detection',
        source: 'tryon_diagnosis_test',
        autoTryOn: true // Explicitly enable auto try-on
      }
    });
    
    console.log('📨 Response received:', response);
    
    if (response.success) {
      const result = response.result;
      
      if (result.type === 'virtual_tryon_complete') {
        console.log('🎉 SUCCESS! Got virtual try-on result!');
        console.log('🖼️ Try-on data:', result.tryOnData);
        console.log('📸 Has thumbnail:', !!result.tryOnData?.thumbnail);
        console.log('💬 Description:', result.tryOnData?.description);
        return 'tryon_success';
        
      } else if (result.type === 'clothing_detection') {
        console.log('⚠️ Got detection only (no try-on generated)');
        console.log('💬 Message:', result.message);
        
        if (result.message.includes('Add photos in Settings')) {
          console.log('🔍 Reason: No user photos available');
          return 'no_photos';
        } else {
          console.log('🔍 Reason: Unknown - try-on generation failed');
          return 'tryon_failed';
        }
        
      } else {
        console.log('❓ Unknown result type:', result.type);
        return 'unknown_result';
      }
      
    } else {
      console.log('❌ Processing failed:', response.error);
      return 'processing_failed';
    }
    
  } catch (error) {
    console.error('❌ Try-on flow test failed:', error);
    return 'test_error';
  }
}

async function testDirectTryOnGeneration() {
  try {
    console.log('🔧 Testing direct try-on generation...');
    
    const response = await chrome.runtime.sendMessage({
      action: 'generateTryOn',
      clothingItems: [{
        category: 'shirt',
        description: 'Blue casual t-shirt for diagnosis',
        confidence: 0.9,
        data: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        source: 'diagnosis_test'
      }],
      options: {
        source: 'direct_diagnosis_test',
        saveResult: true,
        createThumbnail: true
      }
    });
    
    console.log('📨 Direct try-on response:', response);
    
    if (response.success) {
      console.log('✅ Direct try-on generation worked!');
      console.log('🖼️ Try-on result:', response.tryOnData);
      return 'direct_success';
    } else {
      console.log('❌ Direct try-on failed:', response.error);
      return 'direct_failed';
    }
    
  } catch (error) {
    console.error('❌ Direct try-on test failed:', error);
    return 'direct_error';
  }
}

async function checkAPIKey() {
  try {
    console.log('🔑 Checking API key...');
    
    const result = await chrome.storage.local.get(['geminiApiKey']);
    const apiKey = result.geminiApiKey;
    
    if (!apiKey) {
      console.log('❌ No API key found');
      return { hasKey: false };
    } else {
      console.log('✅ API key found:', apiKey.substring(0, 10) + '...');
      return { hasKey: true, keyPreview: apiKey.substring(0, 10) + '...' };
    }
    
  } catch (error) {
    console.error('❌ Error checking API key:', error);
    return { hasKey: false, error: error.message };
  }
}

async function runTryOnDiagnosis() {
  console.log('🚀 Running Complete Virtual Try-On Diagnosis...\n');
  
  // Check API key
  console.log('🔧 Step 1: Checking API key...');
  const apiStatus = await checkAPIKey();
  console.log('');
  
  // Check user photos
  console.log('🔧 Step 2: Checking user photos...');
  const photoStatus = await checkUserPhotos();
  console.log('');
  
  // Test complete flow
  console.log('🔧 Step 3: Testing complete try-on flow...');
  const flowStatus = await testTryOnFlow();
  console.log('');
  
  // Test direct generation
  console.log('🔧 Step 4: Testing direct try-on generation...');
  const directStatus = await testDirectTryOnGeneration();
  console.log('');
  
  // Results summary
  console.log('📊 DIAGNOSIS RESULTS:');
  console.log('API Key:', apiStatus.hasKey ? '✅ Available' : '❌ Missing');
  console.log('User Photos:', photoStatus.photoCount > 0 ? `✅ ${photoStatus.photoCount} photos` : '❌ No photos');
  console.log('Try-On Flow:', getTryOnStatusText(flowStatus));
  console.log('Direct Generation:', getDirectStatusText(directStatus));
  
  console.log('\n🎯 DIAGNOSIS:');
  
  if (photoStatus.photoCount === 0) {
    console.log('🔍 ROOT CAUSE: No user photos uploaded');
    console.log('💡 SOLUTION:');
    console.log('  1. Click extension icon → "Setup" button');
    console.log('  2. Go to "Profile Photos" section');
    console.log('  3. Upload 2-3 clear photos of yourself');
    console.log('  4. Make sure photos show your full body or upper body');
    console.log('  5. Save and try the extension again');
    console.log('');
    console.log('📝 After uploading photos, you should see:');
    console.log('  - "Virtual Try-On Complete!" instead of just detection');
    console.log('  - An actual image showing you wearing the detected clothing');
    console.log('  - Quality scores and styling recommendations');
    
  } else if (!apiStatus.hasKey) {
    console.log('🔍 ROOT CAUSE: No API key configured');
    console.log('💡 SOLUTION: Add your Gemini API key in Settings');
    
  } else if (flowStatus === 'tryon_success') {
    console.log('🎉 Everything is working! You should be seeing try-on results.');
    console.log('💡 If you\'re still not seeing images, check the popup UI');
    
  } else {
    console.log('🔍 ROOT CAUSE: Try-on generation is failing');
    console.log('💡 SOLUTION: Check console for specific error messages');
  }
  
  return {
    apiStatus,
    photoStatus,
    flowStatus,
    directStatus
  };
}

function getTryOnStatusText(status) {
  switch (status) {
    case 'tryon_success': return '🎉 ✅ SUCCESS!';
    case 'no_photos': return '⚠️ No photos (expected)';
    case 'tryon_failed': return '❌ Generation failed';
    case 'processing_failed': return '❌ Processing failed';
    case 'test_error': return '❌ Test error';
    default: return '❓ ' + status;
  }
}

function getDirectStatusText(status) {
  switch (status) {
    case 'direct_success': return '🎉 ✅ SUCCESS!';
    case 'direct_failed': return '❌ Failed';
    case 'direct_error': return '❌ Error';
    default: return '❓ ' + status;
  }
}

// Auto-run diagnosis
runTryOnDiagnosis().catch(console.error);

// Export for manual testing
window.tryOnDiagnosis = {
  checkUserPhotos,
  testTryOnFlow,
  testDirectTryOnGeneration,
  checkAPIKey,
  runTryOnDiagnosis
};

console.log('\n🔧 Diagnosis functions available in window.tryOnDiagnosis');
