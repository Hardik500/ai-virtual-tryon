// Image Processing utilities for AI Virtual Try-On extension

class ImageProcessor {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.init();
  }

  init() {
    // Create off-screen canvas for image processing
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  // Resize image to specified dimensions
  async resizeImage(imageData, maxWidth = 1024, maxHeight = 1024, quality = 0.9) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        const { width, height } = this.calculateDimensions(
          img.naturalWidth, 
          img.naturalHeight, 
          maxWidth, 
          maxHeight
        );

        // Set canvas size
        this.canvas.width = width;
        this.canvas.height = height;

        // Draw and resize image
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(img, 0, 0, width, height);

        // Convert to data URL
        const resizedDataUrl = this.canvas.toDataURL('image/jpeg', quality);
        
        resolve({
          dataUrl: resizedDataUrl,
          width: width,
          height: height,
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for resizing'));
      };

      img.src = this.getImageSrc(imageData);
    });
  }

  // Calculate optimal dimensions maintaining aspect ratio
  calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
    let width = originalWidth;
    let height = originalHeight;

    // Scale down if necessary
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  // Crop image to specified region
  async cropImage(imageData, cropArea) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const { x, y, width, height } = cropArea;
        
        // Validate crop area
        if (x < 0 || y < 0 || x + width > img.naturalWidth || y + height > img.naturalHeight) {
          reject(new Error('Invalid crop area'));
          return;
        }

        // Set canvas size to crop dimensions
        this.canvas.width = width;
        this.canvas.height = height;

        // Draw cropped image
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

        // Convert to data URL
        const croppedDataUrl = this.canvas.toDataURL('image/jpeg', 0.9);
        
        resolve({
          dataUrl: croppedDataUrl,
          width: width,
          height: height,
          cropArea: cropArea
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for cropping'));
      };

      img.src = this.getImageSrc(imageData);
    });
  }

  // Enhance image quality
  async enhanceImage(imageData, options = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.canvas.width = img.naturalWidth;
        this.canvas.height = img.naturalHeight;

        // Apply enhancements
        this.ctx.clearRect(0, 0, img.naturalWidth, img.naturalHeight);
        
        // Adjust brightness and contrast if specified
        if (options.brightness || options.contrast) {
          this.ctx.filter = this.buildFilterString(options);
        }
        
        this.ctx.drawImage(img, 0, 0);

        // Apply additional processing
        if (options.sharpen) {
          this.applySharpen();
        }

        if (options.denoise) {
          this.applyDenoise();
        }

        // Convert to data URL
        const enhancedDataUrl = this.canvas.toDataURL('image/jpeg', 0.95);
        
        resolve({
          dataUrl: enhancedDataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          enhancements: options
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for enhancement'));
      };

      img.src = this.getImageSrc(imageData);
    });
  }

  // Build CSS filter string for enhancements
  buildFilterString(options) {
    const filters = [];
    
    if (options.brightness) {
      filters.push(`brightness(${options.brightness})`);
    }
    
    if (options.contrast) {
      filters.push(`contrast(${options.contrast})`);
    }
    
    if (options.saturation) {
      filters.push(`saturate(${options.saturation})`);
    }
    
    return filters.join(' ');
  }

  // Apply sharpening filter (simplified)
  applySharpen() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    // Simple sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];
    
    this.applyConvolution(data, this.canvas.width, this.canvas.height, kernel);
    this.ctx.putImageData(imageData, 0, 0);
  }

  // Apply denoising (simplified)
  applyDenoise() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    // Simple blur kernel for noise reduction
    const kernel = [
      1/9, 1/9, 1/9,
      1/9, 1/9, 1/9,
      1/9, 1/9, 1/9
    ];
    
    this.applyConvolution(data, this.canvas.width, this.canvas.height, kernel);
    this.ctx.putImageData(imageData, 0, 0);
  }

  // Apply convolution kernel
  applyConvolution(data, width, height, kernel) {
    const output = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels
          let sum = 0;
          
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              const kernelIdx = (ky + 1) * 3 + (kx + 1);
              sum += data[idx] * kernel[kernelIdx];
            }
          }
          
          const outputIdx = (y * width + x) * 4 + c;
          output[outputIdx] = Math.max(0, Math.min(255, sum));
        }
      }
    }
    
    data.set(output);
  }

  // Convert image to different format
  async convertFormat(imageData, format = 'jpeg', quality = 0.9) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.canvas.width = img.naturalWidth;
        this.canvas.height = img.naturalHeight;

        this.ctx.clearRect(0, 0, img.naturalWidth, img.naturalHeight);
        this.ctx.drawImage(img, 0, 0);

        const mimeType = `image/${format}`;
        const convertedDataUrl = this.canvas.toDataURL(mimeType, quality);
        
        resolve({
          dataUrl: convertedDataUrl,
          format: format,
          quality: quality,
          size: this.estimateSize(convertedDataUrl)
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for format conversion'));
      };

      img.src = this.getImageSrc(imageData);
    });
  }

  // Create thumbnail
  async createThumbnail(imageData, size = 150) {
    return this.resizeImage(imageData, size, size, 0.8);
  }

  // Extract dominant colors
  async extractColors(imageData, colorCount = 5) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        // Resize to small size for faster processing
        const sampleSize = 100;
        this.canvas.width = sampleSize;
        this.canvas.height = sampleSize;

        this.ctx.clearRect(0, 0, sampleSize, sampleSize);
        this.ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imageData = this.ctx.getImageData(0, 0, sampleSize, sampleSize);
        const colors = this.analyzeColors(imageData.data, colorCount);
        
        resolve(colors);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for color extraction'));
      };

      img.src = this.getImageSrc(imageData);
    });
  }

  // Analyze colors in image data
  analyzeColors(data, colorCount) {
    const colorMap = new Map();
    
    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a > 128) { // Skip transparent pixels
        const color = `rgb(${r},${g},${b})`;
        colorMap.set(color, (colorMap.get(color) || 0) + 1);
      }
    }
    
    // Sort by frequency and return top colors
    return Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, colorCount)
      .map(([color, count]) => ({ color, count }));
  }

  // Get image source from various input types
  getImageSrc(imageData) {
    if (typeof imageData === 'string') {
      return imageData;
    } else if (imageData.dataUrl) {
      return imageData.dataUrl;
    } else if (imageData.src) {
      return imageData.src;
    } else {
      throw new Error('Invalid image data format');
    }
  }

  // Estimate file size from data URL
  estimateSize(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    return Math.round((base64.length * 3) / 4);
  }

  // Validate image
  async validateImage(imageData) {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          valid: true,
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight
        });
      };

      img.onerror = () => {
        resolve({
          valid: false,
          error: 'Invalid image format or corrupted file'
        });
      };

      img.src = this.getImageSrc(imageData);
    });
  }

  // Get image metadata
  async getImageMetadata(imageData) {
    const validation = await this.validateImage(imageData);
    
    if (!validation.valid) {
      return validation;
    }

    const size = this.estimateSize(this.getImageSrc(imageData));
    const colors = await this.extractColors(imageData, 3);
    
    return {
      ...validation,
      size: size,
      dominantColors: colors,
      format: this.getImageFormat(imageData)
    };
  }

  // Get image format
  getImageFormat(imageData) {
    const src = this.getImageSrc(imageData);
    if (src.includes('data:image/')) {
      const match = src.match(/data:image\/([^;]+)/);
      return match ? match[1] : 'unknown';
    }
    return 'unknown';
  }
}

// Create global instance
window.imageProcessor = new ImageProcessor();
