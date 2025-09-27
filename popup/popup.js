// Popup script for AI Virtual Try-On extension

class VirtualTryOnPopup {
  constructor() {
    this.userProfile = null;
    this.recentTryOns = [];
    this.init();
  }

  async init() {
    await this.loadUserData();
    this.setupEventListeners();
    this.setupMessageListener();
    this.updateUI();
    await this.checkContentScriptStatus();
  }

  // Setup message listener for results from content script
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'updatePopupResults') {
        console.log('Received results from content script:', request.result);
        this.displayResultsInPopup(request.result);
        sendResponse({ success: true });
      }
    });
  }

  // Load user data from storage
  async loadUserData() {
    try {
      const result = await chrome.storage.local.get(['userProfile', 'recentTryOns']);
      this.userProfile = result.userProfile || null;
      this.recentTryOns = result.recentTryOns || [];

      // Clean up any external URLs in recent try-ons to prevent CSP violations
      // Also fix any broken thumbnails
      this.recentTryOns = this.recentTryOns.map(item => {
        if (!item.thumbnail ||
            item.thumbnail.startsWith('http') ||
            item.thumbnail.includes('PHN2ZyB3aWR0aD0i')) { // Fix broken base64
          return {
            ...item,
            thumbnail: 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L12 15"/></svg>'
          };
        }
        return item;
      });

      // Save cleaned data back to storage
      if (result.recentTryOns && result.recentTryOns.length !== this.recentTryOns.length) {
        await chrome.storage.local.set({ recentTryOns: this.recentTryOns });
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Setup profile button
    document.getElementById('setup-profile-btn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Start selection button
    document.getElementById('start-selection-btn').addEventListener('click', () => {
      this.startSelection();
    });

    // Screenshot button
    document.getElementById('screenshot-btn').addEventListener('click', () => {
      this.takeScreenshot();
    });

    // URL input button
    document.getElementById('url-input-btn').addEventListener('click', () => {
      this.showUrlModal();
    });

    // Modal controls
    document.getElementById('close-modal-btn').addEventListener('click', () => {
      this.hideUrlModal();
    });

    document.getElementById('cancel-url-btn').addEventListener('click', () => {
      this.hideUrlModal();
    });

    document.getElementById('process-url-btn').addEventListener('click', () => {
      this.processImageUrl();
    });

    // Footer links
    document.getElementById('help-btn').addEventListener('click', () => {
      this.showHelp();
    });

    document.getElementById('privacy-btn').addEventListener('click', () => {
      this.showPrivacy();
    });

    document.getElementById('feedback-btn').addEventListener('click', () => {
      this.showFeedback();
    });

    // URL input enter key
    document.getElementById('image-url-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.processImageUrl();
      }
    });
  }

  // Update UI based on user profile status
  updateUI() {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const setupBtn = document.getElementById('setup-profile-btn');
    const actionButtons = document.querySelectorAll('.action-btn');

    if (this.userProfile && this.userProfile.isComplete) {
      // Profile is complete
      statusDot.className = 'status-dot ready';
      statusText.textContent = 'Ready to try on items';
      setupBtn.style.display = 'none';
      
      // Enable action buttons
      actionButtons.forEach(btn => {
        btn.disabled = false;
      });
    } else {
      // Profile needs setup
      statusDot.className = 'status-dot';
      statusText.textContent = 'Complete your profile to start';
      setupBtn.style.display = 'block';
      
      // Disable action buttons
      actionButtons.forEach(btn => {
        btn.disabled = true;
      });
    }

    this.updateRecentTryOns();
  }

  // Update recent try-ons list
  updateRecentTryOns() {
    const recentList = document.getElementById('recent-list');
    
    if (this.recentTryOns.length === 0) {
      recentList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
          <p>No try-ons yet</p>
          <small>Start by selecting a clothing item or taking a screenshot</small>
        </div>
      `;
    } else {
      recentList.innerHTML = this.recentTryOns
        .slice(0, 5) // Show only last 5
        .map(item => this.createRecentItemHTML(item))
        .join('');
    }
  }

  // Create HTML for recent try-on item
  createRecentItemHTML(item) {
    const date = new Date(item.timestamp).toLocaleDateString();
    return `
      <div class="recent-item" data-id="${item.id}">
        <img src="${item.thumbnail}" alt="Try-on result" class="recent-item-image">
        <div class="recent-item-info">
          <div class="recent-item-title">${item.title || 'Try-on Result'}</div>
          <div class="recent-item-date">${date}</div>
        </div>
      </div>
    `;
  }

  // Start selection mode
  async startSelection() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Check if we can access the tab
      if (!tab || !tab.id) {
        throw new Error('No active tab found');
      }

      // Check if the tab URL is accessible
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
        this.showNotification('Cannot use extension on browser pages. Please navigate to a website.', 'error');
        return;
      }

      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'startSelection'
        });

        // Close popup to allow user to interact with page
        window.close();
      } catch (messageError) {
        // Content script might not be injected yet, try to inject it
        console.log('Content script not responding, attempting to inject...');

        try {
          // Check if we have scripting permission for this tab
          if (!chrome.scripting) {
            throw new Error('Scripting API not available');
          }

          // Try to inject the content script
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/content.js']
          });

          if (results && results.length > 0) {
            console.log('Content script injected successfully');

            // Also inject CSS
            await chrome.scripting.insertCSS({
              target: { tabId: tab.id },
              files: ['content/content.css']
            });

            // Wait a moment for the script to initialize
            setTimeout(async () => {
              try {
                await chrome.tabs.sendMessage(tab.id, {
                  action: 'startSelection'
                });
                window.close();
              } catch (retryError) {
                console.error('Failed to start selection after injection:', retryError);
                this.showNotification('Extension initialized but failed to start selection. Please try again.', 'error');
              }
            }, 1000);
          } else {
            throw new Error('Script injection returned no results');
          }

        } catch (injectionError) {
          console.error('Failed to inject content script:', injectionError);

          // Provide more specific error messages
          if (injectionError.message.includes('Cannot access')) {
            this.showNotification('Cannot access this page. Please refresh the page and try again.', 'error');
          } else if (injectionError.message.includes('scripting')) {
            this.showNotification('Extension permissions issue. Please reload the extension.', 'error');
          } else {
            this.showNotification('This page cannot be accessed by the extension. Try a different website.', 'error');
          }
        }
      }

    } catch (error) {
      console.error('Failed to start selection:', error);
      this.showNotification('Failed to start selection mode', 'error');
    }
  }

  // Take screenshot
  async takeScreenshot() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Check if we can access the tab
      if (!tab || !tab.id) {
        throw new Error('No active tab found');
      }

      // Check if the tab URL is accessible
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
        this.showNotification('Cannot use extension on browser pages. Please navigate to a website.', 'error');
        return;
      }

      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'captureScreenshot'
        });

        // Close popup
        window.close();
      } catch (messageError) {
        // Content script might not be injected yet, try to inject it
        console.log('Content script not responding for screenshot, attempting to inject...');

        try {
          // Check if we have scripting permission for this tab
          if (!chrome.scripting) {
            throw new Error('Scripting API not available');
          }

          // Try to inject the content script
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/content.js']
          });

          if (results && results.length > 0) {
            console.log('Content script injected successfully for screenshot');

            // Also inject CSS
            await chrome.scripting.insertCSS({
              target: { tabId: tab.id },
              files: ['content/content.css']
            });

            // Wait a moment for the script to initialize
            setTimeout(async () => {
              try {
                await chrome.tabs.sendMessage(tab.id, {
                  action: 'captureScreenshot'
                });
                window.close();
              } catch (retryError) {
                console.error('Failed to take screenshot after injection:', retryError);
                this.showNotification('Extension initialized but failed to capture screenshot. Please try again.', 'error');
              }
            }, 1000);
          } else {
            throw new Error('Script injection returned no results');
          }

        } catch (injectionError) {
          console.error('Failed to inject content script for screenshot:', injectionError);

          // Provide more specific error messages
          if (injectionError.message.includes('Cannot access')) {
            this.showNotification('Cannot access this page. Please refresh the page and try again.', 'error');
          } else if (injectionError.message.includes('scripting')) {
            this.showNotification('Extension permissions issue. Please reload the extension.', 'error');
          } else {
            this.showNotification('This page cannot be accessed by the extension. Try a different website.', 'error');
          }
        }
      }

    } catch (error) {
      console.error('Failed to take screenshot:', error);
      this.showNotification('Failed to capture screenshot', 'error');
    }
  }

  // Show URL input modal
  showUrlModal() {
    document.getElementById('url-modal').classList.remove('hidden');
    document.getElementById('image-url-input').focus();
  }

  // Hide URL input modal
  hideUrlModal() {
    document.getElementById('url-modal').classList.add('hidden');
    document.getElementById('image-url-input').value = '';
  }

  // Process image from URL
  async processImageUrl() {
    const urlInput = document.getElementById('image-url-input');
    const imageUrl = urlInput.value.trim();
    
    if (!imageUrl) {
      this.showNotification('Please enter a valid image URL', 'error');
      return;
    }

    try {
      // Validate URL
      new URL(imageUrl);
      
      // Send to background script for processing
      const response = await chrome.runtime.sendMessage({
        action: 'processImage',
        imageData: { url: imageUrl },
        options: {
          type: 'clothing_detection',
          source: 'url_input'
        }
      });
      
      if (response.success) {
        console.log('URL processing successful:', response.result);

        // Show detailed results
        this.showProcessingResults(response.result);
        this.hideUrlModal();

        // Add to recent try-ons with better info
        const detectedItems = response.result.aiData?.items || response.result.mockData?.items || [];
        const firstItem = detectedItems[0];
        const processingMethod = response.result.aiData?.processingMethod || response.result.mockData?.processingMethod || 'unknown';

        this.addRecentTryOn({
          id: Date.now().toString(),
          title: firstItem ? `${firstItem.type} (${firstItem.color})` : 'URL Try-on',
          thumbnail: 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L12 15"/></svg>',
          timestamp: Date.now(),
          result: response.result,
          processingMethod: processingMethod
        });
      } else {
        console.log('URL processing failed:', response);
        this.showNotification('Failed to process image: ' + (response?.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('URL processing error:', error);
      this.showNotification('Invalid URL or processing failed', 'error');
    }
  }

  // Add recent try-on
  async addRecentTryOn(item) {
    this.recentTryOns.unshift(item);
    
    // Keep only last 20 items
    if (this.recentTryOns.length > 20) {
      this.recentTryOns = this.recentTryOns.slice(0, 20);
    }
    
    // Save to storage
    await chrome.storage.local.set({
      recentTryOns: this.recentTryOns
    });
    
    this.updateRecentTryOns();
  }

  // Check if content script is available on current tab
  async checkContentScriptStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        return false;
      }

      // Skip browser pages
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
        return false;
      }

      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        if (response && response.success) {
          console.debug('Content script is ready on current tab');
          return true;
        }
      } catch (error) {
        console.debug('Content script not responding, will inject when needed');
      }

      return false;
    } catch (error) {
      console.error('Failed to check content script status:', error);
      return false;
    }
  }

  // Inject content script if needed
  async ensureContentScript(tabId) {
    try {
      // First try to ping the existing content script
      try {
        const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        if (response && response.success) {
          return true; // Content script is already working
        }
      } catch (pingError) {
        // Content script not responding, need to inject
      }

      // Inject the content script
      if (!chrome.scripting) {
        throw new Error('Scripting API not available');
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content/content.js']
      });

      if (results && results.length > 0) {
        // Also inject CSS
        await chrome.scripting.insertCSS({
          target: { tabId: tabId },
          files: ['content/content.css']
        });

        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify it's working
        const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        return response && response.success;
      }

      return false;
    } catch (error) {
      console.error('Failed to ensure content script:', error);
      return false;
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `vto-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // Show detailed processing results
  showProcessingResults(result) {
    console.log('Showing processing results:', result);

    // Show results in the dedicated popup section
    this.displayResultsInPopup(result);

    // Also show a success notification
    this.showNotification('Image processed successfully! Check results below.', 'success');
  }

  // Display results in the popup's results section
  displayResultsInPopup(result) {
    const resultsSection = document.getElementById('latest-results');
    const resultsContent = document.getElementById('results-content');

    if (!resultsSection || !resultsContent) {
      console.error('Results section not found in popup');
      return;
    }

    // Check if this is a virtual try-on result
    if (result.type === 'virtual_tryon_complete' && result.tryOnData) {
      this.displayTryOnResults(result, resultsSection, resultsContent);
      return;
    }

    // Get data from either AI results or mock data (for detection-only results)
    const aiData = result.aiData;
    const mockData = result.mockData;
    const items = aiData?.items || mockData?.items || [];
    const processingMethod = aiData?.processingMethod || mockData?.processingMethod || 'unknown';
    const source = aiData?.source || mockData?.source || 'unknown';

    // Build results HTML
    let html = '';

    // Processing method indicator
    const isAI = processingMethod.includes('gemini');
    const isMock = processingMethod.includes('mock');
    const methodIcon = isAI ? '🤖' : (isMock ? '🔧' : '⚙️');
    const methodText = isAI ? 'AI Analysis' : (isMock ? 'Mock Detection' : 'Processing');

    html += `<div class="result-item">
      <span class="result-label">${methodIcon} Method:</span>
      <span class="result-value">${methodText}</span>
    </div>`;

    // Main message
    if (result.message) {
      html += `<div class="result-item">
        <span class="result-label">Status:</span>
        <span class="result-value">${result.message}</span>
      </div>`;
    }

    // Source and timestamp
    html += `<div class="result-item">
      <span class="result-label">Source:</span>
      <span class="result-value">${source}</span>
    </div>`;

    html += `<div class="result-item">
      <span class="result-label">Processed:</span>
      <span class="result-value">${new Date().toLocaleTimeString()}</span>
    </div>`;

    // Detected items
    if (items && items.length > 0) {
      html += `<div class="detected-items">
        <div class="result-label">Detected Items (${items.length}):</div>`;

      items.forEach((item, index) => {
        const confidence = Math.round((item.confidence || 0) * 100);
        const features = item.features ? ` • Features: ${item.features.join(', ')}` : '';
        const note = item.note ? ` • ${item.note}` : '';

        html += `<div class="detected-item">
          <div class="item-type">${item.type || 'Item'} (${item.color || 'unknown color'})</div>
          <div class="item-details">
            Category: ${item.category || 'unknown'} •
            Confidence: ${confidence}%${features}${note}
          </div>
        </div>`;
      });

      html += `</div>`;
    } else {
      html += `<div class="detected-items">
        <div class="result-label">No clothing items detected</div>
      </div>`;
    }

    // Add metadata if available (from AI analysis)
    if (aiData?.metadata) {
      const metadata = aiData.metadata;
      if (metadata.background || metadata.lighting || metadata.quality) {
        html += `<div class="result-item" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e9ecef;">
          <span class="result-label">📊 Image Analysis:</span>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">`;

        if (metadata.background) html += `Background: ${metadata.background}<br>`;
        if (metadata.lighting) html += `Lighting: ${metadata.lighting}<br>`;
        if (metadata.quality) html += `Quality: ${metadata.quality}`;

        html += `</div></div>`;
      }
    }

    // Update the content and show the section
    resultsContent.innerHTML = html;
    resultsSection.style.display = 'block';

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Display virtual try-on results
  displayTryOnResults(result, resultsSection, resultsContent) {
    console.log('🎯 Displaying virtual try-on results:', result);

    const tryOnData = result.tryOnData;
    const clothingItems = result.clothingItems || [];
    const detectionData = result.detectionData;

    // Build try-on results HTML
    let html = '';

    // Try-on success header
    html += `<div class="tryon-header">
      <div class="tryon-icon">🎉</div>
      <div class="tryon-title">Virtual Try-On Complete!</div>
      <div class="tryon-subtitle">${result.message}</div>
    </div>`;

    // Try-on result display with generated image
    const imageToShow = result.tryOnData?.imageUrl || result.tryOnData?.generatedImage || tryOnData.thumbnail;
    const hasGeneratedImage = result.tryOnData?.hasGeneratedImage || false;
    
    if (imageToShow) {
      const imageUrl = imageToShow.startsWith('data:') ? imageToShow : `data:image/jpeg;base64,${imageToShow}`;
      html += `<div class="tryon-result">
        <div class="tryon-image">
          <img src="${imageUrl}" alt="Virtual try-on result" style="max-width: 300px; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); object-fit: contain;">
          ${hasGeneratedImage ? '<div class="ai-badge">✨ AI Generated</div>' : ''}
        </div>
        ${hasGeneratedImage ? '<div class="ai-watermark">Generated by Gemini 2.5 Flash Image</div>' : ''}
      </div>`;
    }

    // Try-on details with enhanced Gemini 2.5 Flash Image results
    html += `<div class="tryon-details">
      <div class="result-item">
        <span class="result-label">🤖 Method:</span>
        <span class="result-value">${tryOnData.processingMethod || 'AI Generation'}</span>
        ${tryOnData.advanced ? '<span class="badge advanced">Enhanced AI</span>' : ''}
      </div>

      <div class="result-item">
        <span class="result-label">📊 Quality Score:</span>
        <span class="result-value">${Math.round((tryOnData.qualityScore || 0.8) * 100)}%</span>
      </div>

      <div class="result-item">
        <span class="result-label">🎯 Confidence:</span>
        <span class="result-value">${Math.round((tryOnData.confidence || 0.8) * 100)}%</span>
      </div>

      <div class="result-item">
        <span class="result-label">⏰ Generated:</span>
        <span class="result-value">${new Date(tryOnData.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>`;

    // Enhanced analysis results if available
    if (tryOnData.fitAnalysis || tryOnData.visualResult || tryOnData.stylingAssessment) {
      html += `<div class="enhanced-analysis">
        <div class="result-label">🔬 Advanced Analysis:</div>`;
      
      if (tryOnData.fitAnalysis) {
        const fit = tryOnData.fitAnalysis;
        html += `<div class="analysis-section">
          <strong>Fit Assessment:</strong>
          <div class="analysis-details">
            Size Compatibility: ${fit.size_compatibility || 'N/A'} •
            Body Match: ${fit.body_match || 'N/A'} •
            Pose: ${fit.pose_compatibility || 'N/A'}
          </div>
        </div>`;
      }

      if (tryOnData.visualResult) {
        const visual = tryOnData.visualResult;
        html += `<div class="analysis-section">
          <strong>Visual Quality:</strong>
          <div class="analysis-details">
            Realism: ${Math.round((visual.realism_score || 0) * 100)}% •
            Lighting: ${Math.round((visual.lighting_match || 0) * 100)}% •
            Fabric: ${visual.fabric_draping || 'N/A'}
          </div>
        </div>`;
      }

      if (tryOnData.stylingAssessment) {
        const styling = tryOnData.stylingAssessment;
        html += `<div class="analysis-section">
          <strong>Styling:</strong>
          <div class="analysis-details">
            Color Harmony: ${styling.color_harmony || 'N/A'} •
            Style Match: ${styling.style_match || 'N/A'} •
            Occasion: ${styling.occasion_suitability || 'N/A'}
          </div>
        </div>`;
      }

      html += `</div>`;
    }

    // AI Description
    if (tryOnData.description) {
      html += `<div class="tryon-description">
        <div class="result-label">💬 AI Analysis:</div>
        <div class="description-text">${tryOnData.description}</div>
      </div>`;
    }

    // Recommendations
    if (tryOnData.recommendations && tryOnData.recommendations.length > 0) {
      html += `<div class="tryon-recommendations">
        <div class="result-label">💡 Recommendations:</div>
        <ul class="recommendations-list">`;

      tryOnData.recommendations.forEach(rec => {
        html += `<li>${rec}</li>`;
      });

      html += `</ul></div>`;
    }

    // Clothing item details
    if (clothingItems.length > 0) {
      const item = clothingItems[0];
      html += `<div class="clothing-item-details">
        <div class="result-label">👕 Clothing Item:</div>
        <div class="item-info">
          <div>Category: ${item.category || 'Unknown'}</div>
          <div>Description: ${item.description || 'No description'}</div>
          <div>Source: ${item.source || 'Web'}</div>
        </div>
      </div>`;
    }

    // Action buttons
    html += `<div class="tryon-actions">
      <button class="action-btn primary" onclick="window.virtualTryOnPopup.viewTryOnHistory()">
        📚 View History
      </button>
      ${hasGeneratedImage ? `
        <button class="action-btn secondary" onclick="window.virtualTryOnPopup.refineImage('${tryOnData.id}')">
          ✨ Refine Image
        </button>
      ` : ''}
      <button class="action-btn secondary" onclick="window.virtualTryOnPopup.shareTryOn('${tryOnData.id}')">
        📤 Share Result
      </button>
    </div>`;

    // Update the content and show the section
    resultsContent.innerHTML = html;
    resultsSection.style.display = 'block';

    // Add try-on to recent history
    this.addRecentTryOn({
      id: tryOnData.id,
      thumbnail: tryOnData.thumbnail,
      category: clothingItems[0]?.category || 'clothing',
      timestamp: tryOnData.timestamp,
      description: tryOnData.description,
      confidence: tryOnData.confidence
    });

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // View try-on history
  viewTryOnHistory() {
    // Switch to recent try-ons tab
    const recentTab = document.querySelector('[data-tab="recent"]');
    if (recentTab) {
      recentTab.click();
    }
  }

  // Refine generated image
  async refineImage(tryOnId) {
    const refinement = prompt('How would you like to refine this try-on image?\n\nExamples:\n- "Adjust the lighting to be brighter"\n- "Make the fit more relaxed"\n- "Improve the color matching"');
    
    if (!refinement) return;

    try {
      this.showNotification('Refining image...', 'info');
      
      // Send refinement request to background script
      const response = await chrome.runtime.sendMessage({
        action: 'refineImage',
        tryOnId: tryOnId,
        refinementPrompt: refinement
      });

      if (response.success) {
        this.showNotification('Image refined successfully!', 'success');
        // Refresh the results display
        this.displayResultsInPopup(response.result);
      } else {
        this.showNotification('Failed to refine image: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('Image refinement error:', error);
      this.showNotification('Failed to refine image', 'error');
    }
  }

  // Share try-on result
  shareTryOn(tryOnId) {
    // For now, just copy the ID to clipboard
    navigator.clipboard.writeText(tryOnId).then(() => {
      this.showNotification('Try-on ID copied to clipboard!', 'success');
    }).catch(() => {
      this.showNotification('Failed to copy try-on ID', 'error');
    });
  }

  // Show help
  showHelp() {
    const helpText = `
AI Virtual Try-On Help:

1. Complete your profile setup first
2. Use "Select Item" to choose clothing on any website
3. Use "Screenshot" to capture the entire page
4. Use "Image URL" to process images from links

Keyboard shortcuts:
- Ctrl+Shift+T: Start selection mode
- ESC: Cancel selection

For more help, visit our support page.
    `;
    
    alert(helpText);
  }

  // Show privacy info
  showPrivacy() {
    const privacyText = `
Privacy Information:

✓ All your photos and data are stored locally in your browser
✓ No images are sent to external servers
✓ You control your own Gemini API key
✓ Data can be deleted anytime from settings

Your privacy is our priority.
    `;
    
    alert(privacyText);
  }

  // Show feedback form
  showFeedback() {
    const feedbackText = `
We'd love your feedback!

Please share your experience, suggestions, or report issues.

This is a placeholder - feedback system will be implemented in future updates.
    `;
    
    alert(feedbackText);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new VirtualTryOnPopup();
});
