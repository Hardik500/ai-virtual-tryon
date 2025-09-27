// Simple test script to verify background script is working
// Paste this in the browser console to test the extension

console.log('🧪 Testing AI Virtual Try-On Extension Background Script');

// Test function
async function testExtension() {
  try {
    console.log('📋 Testing background script communication...');
    
    // Test basic message to background script
    const response = await chrome.runtime.sendMessage({
      action: 'processImage',
      imageData: { 
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' 
      },
      options: {
        type: 'clothing_detection',
        source: 'console_test'
      }
    });
    
    console.log('✅ Background script responded:', response);
    
    if (response.success) {
      console.log('🎉 Extension is working!');
      console.log('📊 Result:', response.result);
      
      // Check if AI or mock processing
      if (response.result.aiData) {
        console.log('🤖 AI Processing detected');
        console.log('Items found:', response.result.aiData.items);
      } else if (response.result.mockData) {
        console.log('🔧 Mock Processing (no API key)');
        console.log('Items found:', response.result.mockData.items);
      }
    } else {
      console.log('❌ Processing failed:', response.error);
    }
    
    return response;
    
  } catch (error) {
    console.error('❌ Extension test failed:', error);
    
    if (error.message.includes('Extension context invalidated')) {
      console.log('💡 Extension needs to be reloaded. Go to chrome://extensions/ and reload the extension.');
    } else if (error.message.includes('Could not establish connection')) {
      console.log('💡 Background script is not responding. Check for errors in chrome://extensions/');
    }
    
    return null;
  }
}

// Check API key status
async function checkApiKey() {
  try {
    const result = await chrome.storage.local.get(['userProfile']);
    const apiKey = result.userProfile?.apiKey;
    
    if (apiKey && apiKey.length > 10) {
      console.log('🔑 API Key: Found (length:', apiKey.length, ')');
      return true;
    } else {
      console.log('⚠️ API Key: Not found or too short');
      console.log('💡 Add your Gemini API key in extension options for AI processing');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to check API key:', error);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting extension tests...\n');
  
  // Check API key first
  const hasApiKey = await checkApiKey();
  console.log('');
  
  // Test extension
  const result = await testExtension();
  
  console.log('\n📊 Test Summary:');
  console.log('API Key:', hasApiKey ? '✅ Found' : '⚠️ Missing');
  console.log('Background Script:', result ? '✅ Working' : '❌ Failed');
  
  if (result && result.success) {
    const processingMethod = result.result.aiData ? 'AI' : 'Mock';
    console.log('Processing Method:', processingMethod === 'AI' ? '🤖 AI Analysis' : '🔧 Mock Detection');
  }
  
  console.log('\n🎯 Next Steps:');
  if (!hasApiKey) {
    console.log('1. Click extension icon → Setup → Add Gemini API key');
    console.log('2. Test API connection');
    console.log('3. Try processing again for real AI analysis');
  } else {
    console.log('1. Extension is ready for use!');
    console.log('2. Try "Image URL", "Select Item", or "Screenshot" features');
  }
}

// Auto-run tests
runTests().catch(console.error);

// Export for manual use
window.extensionTest = {
  testExtension,
  checkApiKey,
  runTests
};

console.log('\n🔧 Functions available: window.extensionTest.testExtension(), .checkApiKey(), .runTests()');
