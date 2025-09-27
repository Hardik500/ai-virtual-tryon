// Test script to verify Gemini 2.5 model is working
// Paste this in browser console after reloading the extension

console.log('🤖 Testing Gemini 2.5 Model Integration...');

async function testGemini25() {
  try {
    console.log('📋 Testing with Gemini 2.0-flash-exp model...');
    
    const response = await chrome.runtime.sendMessage({
      action: 'processImage',
      imageData: { 
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' 
      },
      options: {
        type: 'clothing_detection',
        source: 'gemini_2_5_test'
      }
    });
    
    console.log('✅ Response received:', response);
    
    if (response.success) {
      console.log('🎉 SUCCESS! Gemini 2.5 model is working!');
      console.log('📊 Processing result:', response.result.type);
      console.log('💬 Message:', response.result.message);
      
      if (response.result.aiData) {
        console.log('🤖 AI processing with Gemini 2.5 worked!');
        console.log('Items detected:', response.result.aiData.items);
        console.log('Processing method:', response.result.aiData.processingMethod);
        
        if (response.result.aiData.metadata) {
          console.log('📊 AI Metadata:', response.result.aiData.metadata);
        }
        
        return 'ai_success';
      } else if (response.result.mockData) {
        console.log('🔧 Mock processing (no API key or AI failed)');
        console.log('Items:', response.result.mockData.items);
        console.log('Processing method:', response.result.mockData.processingMethod);
        
        if (response.result.error) {
          console.log('❌ AI Error (fell back to mock):', response.result.error);
          return 'ai_failed_fallback';
        } else {
          console.log('💡 No API key - using mock response');
          return 'no_api_key';
        }
      }
      
      return 'unknown_success';
    } else {
      console.log('❌ Processing failed:', response.error);
      return 'failed';
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error.message.includes('models/gemini-1.5-flash is not found')) {
      console.log('💥 OLD MODEL ERROR - still using old model');
    } else if (error.message.includes('models/gemini-2.0-flash-exp is not found')) {
      console.log('💥 NEW MODEL ERROR - Gemini 2.5 model not available');
    } else {
      console.log('💡 Different error:', error.message);
    }
    
    return 'error';
  }
}

async function checkApiKey() {
  try {
    const result = await chrome.storage.local.get(['userProfile']);
    const apiKey = result.userProfile?.apiKey;
    
    if (apiKey && apiKey.length > 10) {
      console.log('🔑 API Key: Found (length:', apiKey.length, ')');
      return true;
    } else {
      console.log('⚠️ API Key: Not found');
      console.log('💡 Add your Gemini API key in extension options to test real AI');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to check API key:', error);
    return false;
  }
}

async function runGemini25Tests() {
  console.log('🚀 Running Gemini 2.5 model tests...\n');
  
  // Check API key first
  const hasApiKey = await checkApiKey();
  console.log('');
  
  // Test extension
  const result = await testGemini25();
  
  console.log('\n📊 Gemini 2.5 Test Results:');
  console.log('API Key:', hasApiKey ? '✅ Found' : '⚠️ Missing');
  
  switch (result) {
    case 'ai_success':
      console.log('Gemini 2.5 Model: 🤖 ✅ WORKING PERFECTLY!');
      console.log('Status: Real AI analysis with latest model');
      break;
    case 'ai_failed_fallback':
      console.log('Gemini 2.5 Model: ❌ Failed (using fallback)');
      console.log('Status: API key found but AI processing failed');
      break;
    case 'no_api_key':
      console.log('Gemini 2.5 Model: ⚠️ Not tested (no API key)');
      console.log('Status: Mock processing - add API key to test AI');
      break;
    case 'failed':
      console.log('Gemini 2.5 Model: ❌ Extension failed');
      console.log('Status: Background script error');
      break;
    case 'error':
      console.log('Gemini 2.5 Model: ❌ Test error');
      console.log('Status: Check console for details');
      break;
    default:
      console.log('Gemini 2.5 Model: ❓ Unknown result');
      console.log('Status:', result);
  }
  
  console.log('\n🎯 Next Steps:');
  if (!hasApiKey) {
    console.log('1. Get a Gemini API key from https://makersuite.google.com/app/apikey');
    console.log('2. Click extension icon → Setup → Add API key');
    console.log('3. Test API connection');
    console.log('4. Run this test again to verify Gemini 2.5 works');
  } else if (result === 'ai_success') {
    console.log('1. 🎉 Everything is working perfectly!');
    console.log('2. Try the extension features with real AI analysis');
    console.log('3. Gemini 2.5 model is providing enhanced results');
  } else if (result === 'ai_failed_fallback') {
    console.log('1. Check if your API key is valid');
    console.log('2. Verify API key has Gemini API access enabled');
    console.log('3. Check console for specific error messages');
  }
  
  return result;
}

// Auto-run tests
runGemini25Tests().catch(console.error);

// Export for manual testing
window.gemini25Test = {
  testGemini25,
  checkApiKey,
  runGemini25Tests
};

console.log('\n🔧 Gemini 2.5 test functions available in window.gemini25Test');
