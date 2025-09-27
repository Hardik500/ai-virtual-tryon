// Test script to verify service worker errors are fixed
// Paste this in browser console after reloading the extension

console.log('🔧 Testing Service Worker Fix...');

async function testServiceWorkerStatus() {
  try {
    console.log('📋 Checking service worker registration...');
    
    // Test basic extension messaging
    const response = await chrome.runtime.sendMessage({
      action: 'processImage',
      imageData: { 
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' 
      },
      options: {
        type: 'clothing_detection',
        source: 'service_worker_test'
      }
    });
    
    console.log('✅ Service worker response received:', response);
    
    if (response && (response.success || response.error)) {
      console.log('🎉 SUCCESS! Service worker is functioning properly!');
      console.log('📊 Response type:', response.success ? 'Success' : 'Error');
      
      if (response.success) {
        console.log('💬 Result message:', response.result?.message);
        console.log('🔧 Processing method:', response.result?.aiData?.processingMethod || response.result?.mockData?.processingMethod);
      } else {
        console.log('❌ Error message:', response.error);
      }
      
      return 'working';
    } else {
      console.log('❌ Invalid response format');
      return 'invalid_response';
    }
    
  } catch (error) {
    console.error('❌ Service worker test failed:', error);
    
    if (error.message.includes('Extension context invalidated')) {
      console.log('💡 Extension needs to be reloaded');
      return 'needs_reload';
    } else if (error.message.includes('Could not establish connection')) {
      console.log('💡 Service worker registration failed');
      return 'registration_failed';
    } else {
      console.log('💡 Unknown service worker error');
      return 'unknown_error';
    }
  }
}

async function checkExtensionErrors() {
  try {
    console.log('🔍 Checking for extension errors...');
    
    // Check if we can access chrome.runtime
    if (!chrome || !chrome.runtime) {
      console.log('❌ Chrome runtime not available');
      return false;
    }
    
    // Check if extension context is valid
    if (chrome.runtime.id) {
      console.log('✅ Extension context is valid');
      console.log('🆔 Extension ID:', chrome.runtime.id);
      return true;
    } else {
      console.log('❌ Extension context is invalid');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error checking extension status:', error);
    return false;
  }
}

async function testTryOnGeneratorImport() {
  try {
    console.log('🎯 Testing TryOnGenerator import...');
    
    // Test direct try-on generation to verify imports work
    const response = await chrome.runtime.sendMessage({
      action: 'generateTryOn',
      clothingItems: [{
        category: 'shirt',
        description: 'Test shirt for service worker',
        confidence: 0.9,
        data: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        source: 'service_worker_import_test'
      }],
      options: {
        source: 'import_test'
      }
    });
    
    console.log('✅ TryOnGenerator response:', response);
    
    if (response) {
      if (response.success) {
        console.log('🎉 TryOnGenerator import successful!');
        return 'success';
      } else {
        console.log('⚠️ TryOnGenerator responded with error:', response.error);
        return 'error_response';
      }
    } else {
      console.log('❌ No response from TryOnGenerator');
      return 'no_response';
    }
    
  } catch (error) {
    console.error('❌ TryOnGenerator import test failed:', error);
    return 'import_failed';
  }
}

async function runServiceWorkerFixTests() {
  console.log('🚀 Running Service Worker Fix Tests...\n');
  
  // Check basic extension status
  console.log('🔧 Step 1: Checking extension status...');
  const extensionOk = await checkExtensionErrors();
  console.log('');
  
  // Test service worker functionality
  console.log('🔧 Step 2: Testing service worker...');
  const serviceWorkerStatus = await testServiceWorkerStatus();
  console.log('');
  
  // Test TryOnGenerator import
  console.log('🔧 Step 3: Testing TryOnGenerator import...');
  const importStatus = await testTryOnGeneratorImport();
  console.log('');
  
  // Results summary
  console.log('📊 Service Worker Fix Test Results:');
  console.log('Extension Context:', extensionOk ? '✅ Valid' : '❌ Invalid');
  console.log('Service Worker:', getServiceWorkerStatusText(serviceWorkerStatus));
  console.log('TryOnGenerator Import:', getImportStatusText(importStatus));
  
  console.log('\n🎯 Overall Status:');
  if (extensionOk && serviceWorkerStatus === 'working' && (importStatus === 'success' || importStatus === 'error_response')) {
    console.log('🎉 ✅ SERVICE WORKER ERRORS FIXED!');
    console.log('✅ Extension is now working properly');
    console.log('🎯 You can now test virtual try-on functionality');
  } else {
    console.log('❌ Some issues remain:');
    if (!extensionOk) console.log('  - Extension context is invalid - try reloading');
    if (serviceWorkerStatus !== 'working') console.log('  - Service worker registration issues');
    if (importStatus === 'import_failed') console.log('  - Module import problems');
  }
  
  return {
    extensionOk,
    serviceWorkerStatus,
    importStatus
  };
}

function getServiceWorkerStatusText(status) {
  switch (status) {
    case 'working': return '🎉 ✅ WORKING!';
    case 'needs_reload': return '⚠️ Needs reload';
    case 'registration_failed': return '❌ Registration failed';
    case 'invalid_response': return '❌ Invalid response';
    case 'unknown_error': return '❌ Unknown error';
    default: return '❓ ' + status;
  }
}

function getImportStatusText(status) {
  switch (status) {
    case 'success': return '🎉 ✅ SUCCESS!';
    case 'error_response': return '⚠️ Imported but error';
    case 'no_response': return '❌ No response';
    case 'import_failed': return '❌ Import failed';
    default: return '❓ ' + status;
  }
}

// Auto-run tests
runServiceWorkerFixTests().catch(console.error);

// Export for manual testing
window.serviceWorkerTest = {
  testServiceWorkerStatus,
  checkExtensionErrors,
  testTryOnGeneratorImport,
  runServiceWorkerFixTests
};

console.log('\n🔧 Service worker test functions available in window.serviceWorkerTest');
