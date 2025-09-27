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

  // Enhance image quality for Gemini 2.5 Flash Image compatibility
  async enhanceImage(imageData, options = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        // Optimize canvas size for AI processing
        const maxDimension = 2048; // Optimal for Gemini 2.5 Flash Image
        const { width, height } = this.calculateOptimalDimensions(
          img.naturalWidth, 
          img.naturalHeight, 
          maxDimension
        );

        this.canvas.width = width;
        this.canvas.height = height;

        // Apply enhancements
        this.ctx.clearRect(0, 0, width, height);
        
        // Enable high-quality scaling
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Adjust brightness and contrast if specified
        if (options.brightness || options.contrast || options.saturation) {
          this.ctx.filter = this.buildFilterString(options);
        }
        
        this.ctx.drawImage(img, 0, 0, width, height);

        // Apply additional processing optimized for AI
        if (options.sharpen || options.aiOptimize) {
          this.applyAIOptimizedSharpen();
        }

        if (options.denoise || options.aiOptimize) {
          this.applySmartDenoise();
        }

        // Enhance contrast for better AI detection
        if (options.aiOptimize) {
          this.applyAIContrastEnhancement();
        }

        // Convert to data URL with high quality
        const enhancedDataUrl = this.canvas.toDataURL('image/jpeg', 0.95);
        
        resolve({
          dataUrl: enhancedDataUrl,
          width: width,
          height: height,
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight,
          enhancements: options,
          optimizedForAI: options.aiOptimize || false
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for enhancement'));
      };

      img.src = this.getImageSrc(imageData);
    });
  }

  // Calculate optimal dimensions for AI processing
  calculateOptimalDimensions(width, height, maxDimension) {
    if (width <= maxDimension && height <= maxDimension) {
      return { width, height };
    }

    const aspectRatio = width / height;
    if (width > height) {
      return {
        width: maxDimension,
        height: Math.round(maxDimension / aspectRatio)
      };
    } else {
      return {
        width: Math.round(maxDimension * aspectRatio),
        height: maxDimension
      };
    }
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

  // Apply AI-optimized sharpening filter
  applyAIOptimizedSharpen() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    // Enhanced sharpening kernel optimized for AI feature detection
    const kernel = [
      -0.5, -1, -0.5,
      -1, 6, -1,
      -0.5, -1, -0.5
    ];
    
    this.applyConvolution(data, this.canvas.width, this.canvas.height, kernel);
    this.ctx.putImageData(imageData, 0, 0);
  }

  // Apply sharpening filter (legacy method)
  applySharpen() {
    this.applyAIOptimizedSharpen();
  }

  // Apply smart denoising optimized for AI processing
  applySmartDenoise() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    // Gaussian blur kernel for smart noise reduction while preserving edges
    const kernel = [
      1/16, 2/16, 1/16,
      2/16, 4/16, 2/16,
      1/16, 2/16, 1/16
    ];
    
    this.applyConvolution(data, this.canvas.width, this.canvas.height, kernel);
    this.ctx.putImageData(imageData, 0, 0);
  }

  // Apply contrast enhancement for AI detection
  applyAIContrastEnhancement() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply adaptive contrast enhancement
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Apply S-curve for enhanced contrast
      const enhanced = this.applySCurve(luminance / 255) * 255;
      const factor = enhanced / Math.max(luminance, 1);
      
      data[i] = Math.min(255, Math.max(0, r * factor));
      data[i + 1] = Math.min(255, Math.max(0, g * factor));
      data[i + 2] = Math.min(255, Math.max(0, b * factor));
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }

  // Apply S-curve for enhanced contrast
  applySCurve(x) {
    // S-curve function for smooth contrast enhancement
    return x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x);
  }

  // Apply denoising (legacy method)
  applyDenoise() {
    this.applySmartDenoise();
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

  // Prepare image for Gemini 2.5 Flash Image processing
  async prepareForGemini(imageData, options = {}) {
    const { 
      maxSize = 2048, 
      quality = 0.95, 
      optimize = true,
      preserveAspectRatio = true 
    } = options;

    try {
      // First, validate the image
      const validation = await this.validateImage(imageData);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid image');
      }

      // Resize if needed
      let processedImage = imageData;
      if (validation.width > maxSize || validation.height > maxSize) {
        const resized = await this.resizeImage(imageData, maxSize, maxSize, quality);
        processedImage = resized.dataUrl;
      }

      // Apply AI optimizations if requested
      if (optimize) {
        const enhanced = await this.enhanceImage(processedImage, {
          aiOptimize: true,
          brightness: 1.05,
          contrast: 1.1,
          saturation: 1.02
        });
        processedImage = enhanced.dataUrl;
      }

      // Extract additional metadata for better AI processing
      const colors = await this.extractColors(processedImage, 5);
      const finalMetadata = await this.getImageMetadata(processedImage);

      return {
        success: true,
        imageData: processedImage,
        metadata: {
          ...finalMetadata,
          dominantColors: colors,
          optimizedForGemini: optimize,
          processingDate: new Date().toISOString()
        },
        originalSize: {
          width: validation.width,
          height: validation.height
        }
      };

    } catch (error) {
      console.error('Failed to prepare image for Gemini:', error);
      return {
        success: false,
        error: error.message,
        originalImage: imageData
      };
    }
  }

  // Batch prepare multiple images for Gemini processing
  async prepareBatchForGemini(images, options = {}) {
    const results = [];
    
    for (let i = 0; i < images.length; i++) {
      try {
        const result = await this.prepareForGemini(images[i], options);
        results.push({
          index: i,
          ...result
        });
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error.message,
          originalImage: images[i]
        });
      }
    }

    return {
      results: results,
      successful: results.filter(r => r.success).length,
      total: images.length
    };
  }
}

// Create global instance
window.imageProcessor = new ImageProcessor();
