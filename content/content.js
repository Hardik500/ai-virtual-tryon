// Content script for AI Virtual Try-On extension
// Handles screenshot capture and image selection on web pages

class VirtualTryOnContent {
  constructor() {
    this.isSelectionMode = false;
    this.selectionOverlay = null;
    this.selectedElement = null;
    this.init();
  }

  init() {
    this.createSelectionOverlay();
    this.setupMessageListener();
    this.setupKeyboardShortcuts();

    // Signal that content script is ready
    console.log('AI Virtual Try-On content script initialized');
  }

  // Create overlay for image selection
  createSelectionOverlay() {
    this.selectionOverlay = document.createElement('div');
    this.selectionOverlay.id = 'vto-selection-overlay';
    this.selectionOverlay.className = 'vto-overlay hidden';
    
    const instructions = document.createElement('div');
    instructions.className = 'vto-instructions';
    instructions.innerHTML = `
      <div class="vto-instruction-text">
        <h3>AI Virtual Try-On</h3>
        <p>Click on a clothing item to try it on, or press ESC to cancel</p>
        <div class="vto-buttons">
          <button id="vto-screenshot-btn">Take Screenshot</button>
          <button id="vto-cancel-btn">Cancel</button>
        </div>
      </div>
    `;
    
    this.selectionOverlay.appendChild(instructions);
    document.body.appendChild(this.selectionOverlay);
    
    // Setup button event listeners
    document.getElementById('vto-screenshot-btn').addEventListener('click', () => {
      this.captureScreenshot();
    });
    
    document.getElementById('vto-cancel-btn').addEventListener('click', () => {
      this.exitSelectionMode();
    });
  }

  // Setup message listener for communication with background script
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'startSelection':
          this.enterSelectionMode();
          sendResponse({ success: true });
          break;
          
        case 'processClickedImage':
          this.processImageUrl(request.imageUrl);
          sendResponse({ success: true });
          break;
          
        case 'captureScreenshot':
          this.captureScreenshot();
          sendResponse({ success: true });
          break;

        case 'ping':
          sendResponse({ success: true, message: 'Content script is ready' });
          break;

        default:
          console.log('Unknown content script action:', request.action);
      }
    });
  }

  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // ESC key to exit selection mode
      if (event.key === 'Escape' && this.isSelectionMode) {
        this.exitSelectionMode();
      }
      
      // Ctrl+Shift+T to start try-on mode
      if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        this.enterSelectionMode();
      }
    });
  }

  // Enter selection mode for choosing clothing items
  enterSelectionMode() {
    this.isSelectionMode = true;
    this.selectionOverlay.classList.remove('hidden');
    document.body.style.cursor = 'crosshair';
    
    // Add click listeners to images
    this.addImageClickListeners();
  }

  // Exit selection mode
  exitSelectionMode() {
    this.isSelectionMode = false;
    this.selectionOverlay.classList.add('hidden');
    document.body.style.cursor = 'default';
    
    // Remove click listeners
    this.removeImageClickListeners();
  }

  // Add click listeners to all images on the page
  addImageClickListeners() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.addEventListener('click', this.handleImageClick.bind(this));
      img.classList.add('vto-selectable');
    });
  }

  // Remove click listeners from images
  removeImageClickListeners() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.removeEventListener('click', this.handleImageClick.bind(this));
      img.classList.remove('vto-selectable');
    });
  }

  // Handle image click for try-on
  handleImageClick(event) {
    if (!this.isSelectionMode) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const img = event.target;
    this.selectedElement = img;
    
    // Highlight selected image
    img.classList.add('vto-selected');
    
    // Process the selected image
    this.processImageElement(img);
  }

  // Process selected image element
  async processImageElement(imgElement) {
    // Show loading indicator
    this.showLoadingIndicator('Processing selected item...');

    try {
      const imageData = await this.extractImageData(imgElement);

      // Send to background script for AI processing
      const response = await chrome.runtime.sendMessage({
        action: 'processImage',
        imageData: imageData,
        options: {
          type: 'clothing_detection',
          source: 'element_selection'
        }
      });

      // Hide loading indicator
      this.hideLoadingIndicator();

      if (response.success) {
        this.showTryOnResult(response.result);
      } else {
        this.showError('Failed to process image: ' + response.error);
      }
    } catch (error) {
      console.error('Image processing error:', error);
      this.hideLoadingIndicator();
      this.showError('Failed to process selected image');
    }

    this.exitSelectionMode();
  }

  // Process image from URL (context menu)
  async processImageUrl(imageUrl) {
    // Show loading indicator
    this.showLoadingIndicator('Processing image from URL...');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'processImage',
        imageData: { url: imageUrl },
        options: {
          type: 'clothing_detection',
          source: 'context_menu'
        }
      });

      // Hide loading indicator
      this.hideLoadingIndicator();

      if (response.success) {
        this.showTryOnResult(response.result);
      } else {
        this.showError('Failed to process image: ' + response.error);
      }
    } catch (error) {
      console.error('Image URL processing error:', error);
      this.hideLoadingIndicator();
      this.showError('Failed to process image from URL');
    }
  }

  // Extract image data from element
  async extractImageData(imgElement) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/png');
        resolve({
          dataUrl: dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          src: imgElement.src
        });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = imgElement.src;
    });
  }

  // Capture screenshot of current page
  async captureScreenshot() {
    // Show loading indicator
    this.showLoadingIndicator('Capturing and processing screenshot...');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'captureScreenshot'
      });

      if (response.success) {
        // Process the screenshot for clothing detection
        const processResponse = await chrome.runtime.sendMessage({
          action: 'processImage',
          imageData: { dataUrl: response.screenshot },
          options: {
            type: 'clothing_detection',
            source: 'screenshot'
          }
        });

        // Hide loading indicator
        this.hideLoadingIndicator();

        if (processResponse.success) {
          this.showTryOnResult(processResponse.result);
        } else {
          this.showError('Failed to process screenshot: ' + processResponse.error);
        }
      } else {
        this.hideLoadingIndicator();
        this.showError('Failed to capture screenshot: ' + response.error);
      }
    } catch (error) {
      console.error('Screenshot capture error:', error);
      this.hideLoadingIndicator();
      this.showError('Failed to capture screenshot');
    }

    this.exitSelectionMode();
  }

  // Show try-on result
  showTryOnResult(result) {
    console.log('Try-on result:', result);

    // Create a visual notification overlay
    this.showSuccessNotification(result);

    // Also show alert as fallback
    if (result.message) {
      setTimeout(() => {
        alert(result.message);
      }, 500);
    }
  }

  // Show success notification overlay
  showSuccessNotification(result) {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.vto-success-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'vto-success-notification';
    notification.innerHTML = `
      <div class="vto-notification-content">
        <div class="vto-notification-icon">✅</div>
        <div class="vto-notification-text">
          <h3>Try-On Processing Complete!</h3>
          <p>${result.message || 'Image processed successfully'}</p>
          ${result.mockData ? `<small>Found: ${result.mockData.items[0]?.type || 'clothing item'}</small>` : ''}
        </div>
        <button class="vto-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .vto-notification-content {
        display: flex;
        align-items: center;
        padding: 16px;
        gap: 12px;
      }
      .vto-notification-icon {
        font-size: 24px;
        flex-shrink: 0;
      }
      .vto-notification-text h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
      }
      .vto-notification-text p {
        margin: 0 0 4px 0;
        font-size: 14px;
        opacity: 0.9;
      }
      .vto-notification-text small {
        font-size: 12px;
        opacity: 0.8;
      }
      .vto-notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        margin-left: auto;
        flex-shrink: 0;
      }
      .vto-notification-close:hover {
        background: rgba(255,255,255,0.2);
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);
  }

  // Show error message
  showError(message) {
    console.error('VTO Error:', message);

    // Create a visual error notification
    this.showErrorNotification(message);

    // Also show alert as fallback
    setTimeout(() => {
      alert('Error: ' + message);
    }, 500);
  }

  // Show error notification overlay
  showErrorNotification(message) {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.vto-error-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'vto-error-notification';
    notification.innerHTML = `
      <div class="vto-notification-content">
        <div class="vto-notification-icon">❌</div>
        <div class="vto-notification-text">
          <h3>Processing Failed</h3>
          <p>${message}</p>
        </div>
        <button class="vto-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 4000);
  }

  // Show loading indicator
  showLoadingIndicator(message = 'Processing...') {
    // Remove any existing loading indicator
    this.hideLoadingIndicator();

    const loader = document.createElement('div');
    loader.id = 'vto-loading-indicator';
    loader.innerHTML = `
      <div class="vto-loading-content">
        <div class="vto-loading-spinner"></div>
        <div class="vto-loading-text">${message}</div>
      </div>
    `;

    // Add styles
    loader.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Add spinner styles
    const style = document.createElement('style');
    style.id = 'vto-loading-styles';
    style.textContent = `
      .vto-loading-content {
        background: white;
        padding: 30px;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        max-width: 300px;
      }
      .vto-loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #007bff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px auto;
      }
      .vto-loading-text {
        font-size: 16px;
        color: #333;
        font-weight: 500;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(loader);
  }

  // Hide loading indicator
  hideLoadingIndicator() {
    const loader = document.getElementById('vto-loading-indicator');
    const styles = document.getElementById('vto-loading-styles');

    if (loader) {
      loader.remove();
    }
    if (styles) {
      styles.remove();
    }
  }
}

// Initialize content script
const virtualTryOn = new VirtualTryOnContent();
