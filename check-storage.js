// Storage Inspection Script - Run from extension popup console
// This will show you exactly what's stored in your extension

console.log('🔍 Checking Extension Storage...');

async function inspectStorage() {
  try {
    console.log('📊 Getting all storage data...');
    
    // Get all storage data
    const allData = await chrome.storage.local.get(null);
    
    console.log('📋 Full storage contents:', allData);
    console.log('🔑 Storage keys:', Object.keys(allData));
    
    // Check specific user profile data
    if (allData.userProfile) {
      console.log('\n👤 USER PROFILE ANALYSIS:');
      console.log('  Profile exists:', !!allData.userProfile);
      console.log('  API key:', allData.userProfile.apiKey ? 
        allData.userProfile.apiKey.substring(0, 10) + '...' : 'NOT SET');
      console.log('  Photos array:', !!allData.userProfile.photos);
      console.log('  Photos count:', allData.userProfile.photos?.length || 0);
      
      if (allData.userProfile.photos && allData.userProfile.photos.length > 0) {
        console.log('\n📷 PHOTOS ANALYSIS:');
        allData.userProfile.photos.forEach((photo, index) => {
          console.log(`  Photo ${index + 1}:`, {
            id: photo.id,
            type: photo.type,
            hasData: !!photo.data,
            dataSize: photo.data ? `${Math.round(photo.data.length / 1024)}KB` : 'NO DATA',
            timestamp: photo.timestamp
          });
        });
      } else {
        console.log('\n❌ NO PHOTOS FOUND');
        console.log('💡 You need to upload photos for virtual try-on to work');
      }
      
      console.log('\n⚙️ OTHER PROFILE DATA:');
      console.log('  Complete profile?', allData.userProfile.isComplete);
      console.log('  Setup completed?', allData.userProfile.setupCompleted);
      
    } else {
      console.log('\n❌ NO USER PROFILE FOUND');
      console.log('💡 You need to complete the extension setup first');
    }
    
    // Check recent try-ons
    if (allData.recentTryOns) {
      console.log('\n🎯 RECENT TRY-ONS:');
      console.log('  Count:', allData.recentTryOns.length);
      if (allData.recentTryOns.length > 0) {
        console.log('  Latest try-on:', allData.recentTryOns[0]);
      }
    }
    
    // Check Gemini usage stats
    if (allData.geminiUsageStats) {
      console.log('\n📈 GEMINI USAGE STATS:');
      console.log('  Total requests:', allData.geminiUsageStats.totalRequests);
      console.log('  Requests today:', allData.geminiUsageStats.requestsToday);
      console.log('  Last request:', allData.geminiUsageStats.lastRequest);
    }
    
    return allData;
    
  } catch (error) {
    console.error('❌ Failed to inspect storage:', error);
    return { error: error.message };
  }
}

async function checkSetupStatus() {
  const data = await inspectStorage();
  
  console.log('\n🎯 SETUP STATUS SUMMARY:');
  console.log('='.repeat(40));
  
  const hasProfile = !!data.userProfile;
  const hasApiKey = !!(data.userProfile?.apiKey && data.userProfile.apiKey.length > 10);
  const hasPhotos = !!(data.userProfile?.photos && data.userProfile.photos.length > 0);
  
  console.log('📋 Setup Checklist:');
  console.log('  ✅ Extension installed:', true);
  console.log('  ' + (hasProfile ? '✅' : '❌') + ' User profile created:', hasProfile);
  console.log('  ' + (hasApiKey ? '✅' : '❌') + ' API key configured:', hasApiKey);
  console.log('  ' + (hasPhotos ? '✅' : '❌') + ' User photos uploaded:', hasPhotos);
  
  if (hasProfile && hasApiKey && hasPhotos) {
    console.log('\n🎉 READY TO TEST! All prerequisites met.');
    console.log('💡 You can now run the image generation test.');
  } else {
    console.log('\n⚠️ SETUP INCOMPLETE');
    console.log('📝 Next steps:');
    
    if (!hasProfile) {
      console.log('  1. Click Settings in the extension popup');
      console.log('  2. Complete the initial setup wizard');
    } else {
      if (!hasApiKey) {
        console.log('  1. Go to Settings → API Configuration');
        console.log('  2. Enter your Gemini API key');
        console.log('  3. Test the connection');
      }
      if (!hasPhotos) {
        console.log('  1. Go to Settings → Profile Photos');
        console.log('  2. Upload 1-2 clear photos of yourself');
        console.log('  3. Save the profile');
      }
    }
  }
  
  window.storageInspection = data;
  return data;
}

// Auto-run the inspection
checkSetupStatus().catch(console.error);

// Export functions
window.storageCheck = {
  inspectStorage,
  checkSetupStatus
};

console.log('\n🔧 Storage check functions available in window.storageCheck');
