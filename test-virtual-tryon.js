// Complete Virtual Try-On Flow Test
// Paste this in browser console after reloading the extension

console.log('🎯 Testing Complete Virtual Try-On Flow...');

async function testVirtualTryOnFlow() {
  try {
    console.log('🔍 Step 1: Testing clothing detection + virtual try-on...');
    
    // Test with a clothing image that should trigger try-on generation
    const response = await chrome.runtime.sendMessage({
      action: 'processImage',
      imageData: { 
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' 
      },
      options: {
        type: 'clothing_detection',
        source: 'tryon_flow_test',
        autoTryOn: true // Enable automatic try-on generation
      }
    });
    
    console.log('✅ Response received:', response);
    
    if (response.success) {
      const result = response.result;
      
      // Check if we got a virtual try-on result
      if (result.type === 'virtual_tryon_complete') {
        console.log('🎉 SUCCESS! Complete virtual try-on flow worked!');
        console.log('📊 Result type:', result.type);
        console.log('💬 Message:', result.message);
        
        // Check detection data
        if (result.detectionData) {
          console.log('🔍 Detection data:', result.detectionData);
          const items = result.detectionData.aiData?.items || result.detectionData.mockData?.items || [];
          console.log('👕 Detected items:', items.length);
        }
        
        // Check try-on data
        if (result.tryOnData) {
          console.log('🎯 Try-on data:', result.tryOnData);
          console.log('📸 Thumbnail:', result.tryOnData.thumbnail ? 'Generated' : 'Missing');
          console.log('💬 Description:', result.tryOnData.description);
          console.log('💡 Recommendations:', result.tryOnData.recommendations?.length || 0);
          console.log('📊 Quality Score:', result.tryOnData.qualityScore);
          console.log('🎯 Confidence:', result.tryOnData.confidence);
        }
        
        // Check clothing items
        if (result.clothingItems) {
          console.log('👔 Clothing items for try-on:', result.clothingItems.length);
          result.clothingItems.forEach((item, i) => {
            console.log(`  ${i + 1}. ${item.category}: ${item.description}`);
          });
        }
        
        // Check user photo
        if (result.userPhotoId) {
          console.log('📷 User photo ID:', result.userPhotoId);
        }
        
        return 'complete_tryon_success';
        
      } else if (result.type === 'clothing_detection') {
        console.log('⚠️ Got detection only (no try-on generated)');
        console.log('💡 Reason: Likely no user photos available');
        console.log('📝 Message:', result.message);
        
        const items = result.aiData?.items || result.mockData?.items || [];
        console.log('👕 Detected items:', items.length);
        
        return 'detection_only';
        
      } else {
        console.log('❓ Unknown result type:', result.type);
        return 'unknown_result';
      }
      
    } else {
      console.log('❌ Processing failed:', response.error);
      return 'processing_failed';
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return 'test_error';
  }
}

async function checkUserPhotos() {
  try {
    const result = await chrome.storage.local.get(['userProfile']);
    const profile = result.userProfile;
    
    if (profile && profile.photos && profile.photos.length > 0) {
      console.log('📷 User photos: Found', profile.photos.length, 'photos');
      return true;
    } else {
      console.log('⚠️ User photos: None found');
      console.log('💡 Add photos in Settings → Profile Setup to enable virtual try-on');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to check user photos:', error);
    return false;
  }
}

async function checkRecentTryOns() {
  try {
    const result = await chrome.storage.local.get(['recentTryOns']);
    const recentTryOns = result.recentTryOns || [];
    
    console.log('📚 Recent try-ons:', recentTryOns.length, 'items');
    
    if (recentTryOns.length > 0) {
      const latest = recentTryOns[0];
      console.log('🆕 Latest try-on:');
      console.log('  ID:', latest.id);
      console.log('  Timestamp:', new Date(latest.timestamp).toLocaleString());
      console.log('  Category:', latest.category);
      console.log('  Has thumbnail:', !!latest.thumbnail);
      console.log('  Description:', latest.description);
    }
    
    return recentTryOns.length;
  } catch (error) {
    console.error('❌ Failed to check recent try-ons:', error);
    return 0;
  }
}

async function testDirectTryOnGeneration() {
  try {
    console.log('🎯 Testing direct try-on generation...');
    
    // Test direct try-on generation with mock clothing item
    const response = await chrome.runtime.sendMessage({
      action: 'generateTryOn',
      clothingItems: [{
        category: 'shirt',
        description: 'Blue casual t-shirt',
        confidence: 0.9,
        data: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        source: 'direct_test',
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'
      }],
      options: {
        source: 'direct_tryon_test'
      }
    });
    
    console.log('✅ Direct try-on response:', response);
    
    if (response.success) {
      console.log('🎉 Direct try-on generation successful!');
      console.log('📊 Try-on data:', response.tryOnData);
      return true;
    } else {
      console.log('❌ Direct try-on failed:', response.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Direct try-on test failed:', error);
    return false;
  }
}

async function runCompleteVirtualTryOnTests() {
  console.log('🚀 Running Complete Virtual Try-On Tests...\n');
  
  // Check prerequisites
  console.log('📋 Checking prerequisites...');
  const hasPhotos = await checkUserPhotos();
  const initialTryOns = await checkRecentTryOns();
  console.log('');
  
  // Test main flow
  console.log('🎯 Testing main virtual try-on flow...');
  const flowResult = await testVirtualTryOnFlow();
  console.log('');
  
  // Test direct try-on generation
  console.log('🔧 Testing direct try-on generation...');
  const directResult = await testDirectTryOnGeneration();
  console.log('');
  
  // Check if new try-ons were added
  console.log('📚 Checking updated try-on history...');
  const finalTryOns = await checkRecentTryOns();
  console.log('');
  
  // Results summary
  console.log('📊 Virtual Try-On Test Results:');
  console.log('User Photos:', hasPhotos ? '✅ Available' : '⚠️ Missing');
  console.log('Main Flow:', getFlowResultText(flowResult));
  console.log('Direct Generation:', directResult ? '✅ Working' : '❌ Failed');
  console.log('Try-On History:', finalTryOns > initialTryOns ? '✅ Updated' : '⚠️ No new items');
  
  console.log('\n🎯 Next Steps:');
  if (!hasPhotos) {
    console.log('1. 📷 Add user photos in Settings → Profile Setup');
    console.log('2. 🔄 Run this test again to see full virtual try-on');
  } else if (flowResult === 'complete_tryon_success') {
    console.log('1. 🎉 Virtual try-on is working perfectly!');
    console.log('2. 🛍️ Try the extension on clothing websites');
    console.log('3. 📚 Check Recent Try-ons tab for saved results');
  } else {
    console.log('1. 🔧 Check console for specific error messages');
    console.log('2. 🔑 Verify Gemini API key is set and working');
    console.log('3. 📷 Ensure user photos are properly uploaded');
  }
  
  return {
    hasPhotos,
    flowResult,
    directResult,
    tryOnsAdded: finalTryOns > initialTryOns
  };
}

function getFlowResultText(result) {
  switch (result) {
    case 'complete_tryon_success': return '🎉 ✅ COMPLETE SUCCESS!';
    case 'detection_only': return '⚠️ Detection only (no photos)';
    case 'processing_failed': return '❌ Processing failed';
    case 'test_error': return '❌ Test error';
    case 'unknown_result': return '❓ Unknown result';
    default: return '❓ ' + result;
  }
}

// Auto-run tests
runCompleteVirtualTryOnTests().catch(console.error);

// Export for manual testing
window.virtualTryOnTest = {
  testVirtualTryOnFlow,
  checkUserPhotos,
  checkRecentTryOns,
  testDirectTryOnGeneration,
  runCompleteVirtualTryOnTests
};

console.log('\n🔧 Virtual try-on test functions available in window.virtualTryOnTest');
