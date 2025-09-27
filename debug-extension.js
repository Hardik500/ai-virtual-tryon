// Debug script to test the AI Virtual Try-On extension
// Run this in the browser console to test the extension functionality

console.log('🧪 Starting AI Virtual Try-On Extension Debug Test');

// Test 1: Check if extension is loaded
async function testExtensionLoaded() {
    console.log('\n📋 Test 1: Checking if extension is loaded...');
    
    try {
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        console.log('✅ Chrome extension APIs are available');
        console.log('📍 Current tab:', tabs[0]?.url);
        return true;
    } catch (error) {
        console.error('❌ Extension not loaded or no permissions:', error);
        return false;
    }
}

// Test 2: Test background script processing (without API key)
async function testBackgroundProcessing() {
    console.log('\n📋 Test 2: Testing background script processing...');
    
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'processImage',
            imageData: { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
            options: {
                type: 'clothing_detection',
                source: 'debug_test'
            }
        });
        
        console.log('✅ Background script responded:', response);
        
        if (response.success) {
            console.log('🎯 Processing successful!');
            console.log('📊 Result type:', response.result.type);
            console.log('💬 Message:', response.result.message);
            
            if (response.result.aiData) {
                console.log('🤖 AI Data:', response.result.aiData);
            } else if (response.result.mockData) {
                console.log('🔧 Mock Data:', response.result.mockData);
            }
        } else {
            console.log('❌ Processing failed:', response.error);
        }
        
        return response;
    } catch (error) {
        console.error('❌ Background script test failed:', error);
        return null;
    }
}

// Test 3: Test content script communication
async function testContentScript() {
    console.log('\n📋 Test 3: Testing content script communication...');
    
    try {
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        const response = await chrome.tabs.sendMessage(tabs[0].id, {
            action: 'ping'
        });
        
        console.log('✅ Content script responded:', response);
        return response;
    } catch (error) {
        console.error('❌ Content script test failed:', error);
        console.log('💡 This is normal if content script is not injected yet');
        return null;
    }
}

// Test 4: Check storage for API key
async function testApiKeyStorage() {
    console.log('\n📋 Test 4: Checking API key storage...');
    
    try {
        const result = await chrome.storage.local.get(['userProfile']);
        const apiKey = result.userProfile?.apiKey;
        
        if (apiKey && apiKey.length > 10) {
            console.log('✅ API key found (length:', apiKey.length, ')');
            console.log('🔑 API key preview:', apiKey.substring(0, 10) + '...');
            return true;
        } else {
            console.log('⚠️ No API key found or key too short');
            console.log('💡 Add your Gemini API key in extension options');
            return false;
        }
    } catch (error) {
        console.error('❌ Storage test failed:', error);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Running all extension tests...\n');
    
    const results = {
        extensionLoaded: await testExtensionLoaded(),
        backgroundProcessing: await testBackgroundProcessing(),
        contentScript: await testContentScript(),
        apiKeyStorage: await testApiKeyStorage()
    };
    
    console.log('\n📊 Test Results Summary:');
    console.log('Extension Loaded:', results.extensionLoaded ? '✅' : '❌');
    console.log('Background Processing:', results.backgroundProcessing ? '✅' : '❌');
    console.log('Content Script:', results.contentScript ? '✅' : '⚠️');
    console.log('API Key Storage:', results.apiKeyStorage ? '✅' : '⚠️');
    
    if (results.extensionLoaded && results.backgroundProcessing) {
        console.log('\n🎉 Extension is working! You can now test:');
        console.log('1. Click extension icon → "Image URL" → paste test URL');
        console.log('2. Click extension icon → "Select Item" → click clothing image');
        console.log('3. Click extension icon → "Screenshot" → capture page');
        
        if (!results.apiKeyStorage) {
            console.log('\n💡 To enable AI processing:');
            console.log('1. Click extension icon → "Setup"');
            console.log('2. Add your Gemini API key');
            console.log('3. Click "Test API Connection"');
        }
    } else {
        console.log('\n❌ Extension has issues. Check:');
        console.log('1. Extension is loaded in chrome://extensions/');
        console.log('2. Extension has proper permissions');
        console.log('3. No JavaScript errors in background script');
    }
    
    return results;
}

// Auto-run tests
runAllTests().catch(console.error);

// Export functions for manual testing
window.extensionDebug = {
    testExtensionLoaded,
    testBackgroundProcessing,
    testContentScript,
    testApiKeyStorage,
    runAllTests
};

console.log('\n🔧 Debug functions available in window.extensionDebug');
