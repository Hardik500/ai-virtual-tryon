// Test script to verify the Maximum Call Stack Size fix
// Paste this in browser console after reloading the extension

console.log('🔧 Testing Maximum Call Stack Size Fix...');

async function testImageProcessing() {
  try {
    console.log('📋 Testing image processing with URL...');
    
    const response = await chrome.runtime.sendMessage({
      action: 'processImage',
      imageData: { 
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' 
      },
      options: {
        type: 'clothing_detection',
        source: 'fix_test'
      }
    });
    
    console.log('✅ Response received:', response);
    
    if (response.success) {
      console.log('🎉 SUCCESS! No more call stack errors!');
      console.log('📊 Processing result:', response.result.type);
      console.log('💬 Message:', response.result.message);
      
      if (response.result.aiData) {
        console.log('🤖 AI processing worked!');
        console.log('Items:', response.result.aiData.items);
      } else if (response.result.mockData) {
        console.log('🔧 Mock processing (no API key)');
        console.log('Items:', response.result.mockData.items);
      }
      
      return true;
    } else {
      console.log('❌ Processing failed:', response.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error.message.includes('Maximum call stack size exceeded')) {
      console.log('💥 STILL HAS CALL STACK ERROR - fix didn\'t work');
    } else {
      console.log('💡 Different error - call stack issue is fixed');
    }
    
    return false;
  }
}

async function testWithDifferentImage() {
  try {
    console.log('📋 Testing with different image...');
    
    const response = await chrome.runtime.sendMessage({
      action: 'processImage',
      imageData: { 
        url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300' 
      },
      options: {
        type: 'clothing_detection',
        source: 'fix_test_2'
      }
    });
    
    console.log('✅ Second test response:', response);
    return response.success;
    
  } catch (error) {
    console.error('❌ Second test failed:', error);
    return false;
  }
}

async function runFixTests() {
  console.log('🚀 Running fix verification tests...\n');
  
  const test1 = await testImageProcessing();
  console.log('');
  const test2 = await testWithDifferentImage();
  
  console.log('\n📊 Fix Test Results:');
  console.log('Test 1 (T-shirt image):', test1 ? '✅ PASSED' : '❌ FAILED');
  console.log('Test 2 (Jeans image):', test2 ? '✅ PASSED' : '❌ FAILED');
  
  if (test1 && test2) {
    console.log('\n🎉 SUCCESS! Maximum call stack size error is FIXED!');
    console.log('✅ Extension is now working properly');
    console.log('🎯 You can now use all features without errors');
  } else {
    console.log('\n❌ Some tests failed. Check the errors above.');
  }
  
  return test1 && test2;
}

// Auto-run tests
runFixTests().catch(console.error);

// Export for manual testing
window.fixTest = {
  testImageProcessing,
  testWithDifferentImage,
  runFixTests
};

console.log('\n🔧 Fix test functions available in window.fixTest');
