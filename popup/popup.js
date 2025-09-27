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
    this.updateUI();
    await this.checkContentScriptStatus();
  }

  // Load user data from storage
  async loadUserData() {
    try {
      const result = await chrome.storage.local.get(['userProfile', 'recentTryOns']);
      this.userProfile = result.userProfile || null;
      this.recentTryOns = result.recentTryOns || [];

      // Clean up any external URLs in recent try-ons to prevent CSP violations
      this.recentTryOns = this.recentTryOns.filter(item => {
        return !item.thumbnail ||
               item.thumbnail.startsWith('data:') ||
               item.thumbnail.startsWith('blob:') ||
               !item.thumbnail.startsWith('http');
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
        this.showNotification('Image processed successfully!', 'success');
        this.hideUrlModal();
        
        // Add to recent try-ons (placeholder)
        this.addRecentTryOn({
          id: Date.now().toString(),
          title: 'URL Try-on',
          thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMSI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiLz48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSIvPjxwYXRoIGQ9Im0yMSAxNS0zLjA4Ni0zLjA4NmEyIDIgMCAwIDAtMi44MjggMEwxMiAxNSIvPjwvc3ZnPg==',
          timestamp: Date.now()
        });
      } else {
        this.showNotification('Failed to process image: ' + response.error, 'error');
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
