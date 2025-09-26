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
      
      if (response.success) {
        this.showTryOnResult(response.result);
      } else {
        this.showError('Failed to process image: ' + response.error);
      }
    } catch (error) {
      console.error('Image processing error:', error);
      this.showError('Failed to process selected image');
    }
    
    this.exitSelectionMode();
  }

  // Process image from URL (context menu)
  async processImageUrl(imageUrl) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'processImage',
        imageData: { url: imageUrl },
        options: {
          type: 'clothing_detection',
          source: 'context_menu'
        }
      });
      
      if (response.success) {
        this.showTryOnResult(response.result);
      } else {
        this.showError('Failed to process image: ' + response.error);
      }
    } catch (error) {
      console.error('Image URL processing error:', error);
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
        
        if (processResponse.success) {
          this.showTryOnResult(processResponse.result);
        } else {
          this.showError('Failed to process screenshot: ' + processResponse.error);
        }
      } else {
        this.showError('Failed to capture screenshot: ' + response.error);
      }
    } catch (error) {
      console.error('Screenshot capture error:', error);
      this.showError('Failed to capture screenshot');
    }
    
    this.exitSelectionMode();
  }

  // Show try-on result (placeholder)
  showTryOnResult(result) {
    // This will be implemented with proper UI in later phases
    console.log('Try-on result:', result);
    alert('Try-on processing complete! (Result will be shown in popup)');
  }

  // Show error message
  showError(message) {
    console.error('VTO Error:', message);
    alert('Error: ' + message);
  }
}

// Initialize content script
const virtualTryOn = new VirtualTryOnContent();
