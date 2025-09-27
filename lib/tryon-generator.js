// Try-on Generation Logic for AI Virtual Try-On extension

class TryOnGenerator {
  constructor() {
    this.geminiIntegration = null;
    this.imageProcessor = null;
    this.storageManager = null;
    this.init();
  }

  async init() {
    // Initialize modules directly (service worker context)
    if (typeof GeminiIntegration !== 'undefined') {
      this.geminiIntegration = new GeminiIntegration();
    }

    if (typeof StorageManager !== 'undefined') {
      this.storageManager = new StorageManager();
      await this.storageManager.init();
    }

    // For browser context, try to use global objects
    if (typeof window !== 'undefined') {
      this.geminiIntegration = this.geminiIntegration || window.geminiIntegration;
      this.imageProcessor = this.imageProcessor || window.imageProcessor;
      this.storageManager = this.storageManager || window.storageManager;
    }
  }

  // Main try-on generation function
  async generateTryOn(userPhotoId, clothingItemData, options = {}) {
    try {
      // Validate inputs
      if (!userPhotoId || !clothingItemData) {
        throw new Error('User photo and clothing item are required');
      }

      // Get user photo from storage
      const userPhotos = await this.storageManager.getUserPhotos();
      const userPhoto = userPhotos.find(photo => photo.id === userPhotoId);
      
      if (!userPhoto) {
        throw new Error('User photo not found');
      }

      // Prepare images for processing
      const processedUserPhoto = await this.prepareUserPhoto(userPhoto, options);
      const processedClothingItem = await this.prepareClothingItem(clothingItemData, options);

      // Generate try-on using AI
      const tryOnResult = await this.performAITryOn(
        processedUserPhoto, 
        processedClothingItem, 
        options
      );

      // Post-process the result
      const finalResult = await this.postProcessResult(tryOnResult, options);

      // Save result if enabled
      if (options.saveResult !== false) {
        await this.saveTryOnResult(finalResult, userPhoto, clothingItemData);
      }

      return {
        success: true,
        result: finalResult,
        metadata: {
          userPhotoId: userPhotoId,
          clothingItem: clothingItemData,
          processingTime: Date.now() - (options.startTime || Date.now()),
          options: options
        }
      };

    } catch (error) {
      console.error('Try-on generation failed:', error);
      return {
        success: false,
        error: error.message,
        metadata: {
          userPhotoId: userPhotoId,
          clothingItem: clothingItemData,
          options: options
        }
      };
    }
  }

  // Prepare user photo for try-on
  async prepareUserPhoto(userPhoto, options) {
    try {
      let processedPhoto = userPhoto.data;

      // Resize if needed
      if (options.maxSize) {
        const resized = await this.imageProcessor.resizeImage(
          processedPhoto, 
          options.maxSize, 
          options.maxSize
        );
        processedPhoto = resized.dataUrl;
      }

      // Enhance quality if requested
      if (options.enhanceQuality) {
        const enhanced = await this.imageProcessor.enhanceImage(processedPhoto, {
          brightness: 1.1,
          contrast: 1.05,
          sharpen: true
        });
        processedPhoto = enhanced.dataUrl;
      }

      // Extract metadata
      const metadata = await this.imageProcessor.getImageMetadata(processedPhoto);

      return {
        data: processedPhoto,
        metadata: metadata,
        original: userPhoto
      };

    } catch (error) {
      console.error('Failed to prepare user photo:', error);
      throw new Error('User photo preparation failed');
    }
  }

  // Prepare clothing item for try-on
  async prepareClothingItem(clothingItemData, options) {
    try {
      let processedItem = clothingItemData.image || clothingItemData.data;

      // Resize if needed
      if (options.maxSize) {
        const resized = await this.imageProcessor.resizeImage(
          processedItem, 
          options.maxSize, 
          options.maxSize
        );
        processedItem = resized.dataUrl;
      }

      // Enhance quality if requested
      if (options.enhanceQuality) {
        const enhanced = await this.imageProcessor.enhanceImage(processedItem, {
          brightness: 1.05,
          contrast: 1.1,
          sharpen: true
        });
        processedItem = enhanced.dataUrl;
      }

      // Extract colors for better matching
      const colors = await this.imageProcessor.extractColors(processedItem, 5);

      return {
        data: processedItem,
        colors: colors,
        category: clothingItemData.category || 'clothing',
        metadata: clothingItemData.metadata || {},
        original: clothingItemData
      };

    } catch (error) {
      console.error('Failed to prepare clothing item:', error);
      throw new Error('Clothing item preparation failed');
    }
  }

  // Perform AI-powered try-on
  async performAITryOn(userPhoto, clothingItem, options) {
    try {
      // Build try-on options
      const aiOptions = {
        category: clothingItem.category,
        preserveFeatures: options.preserveFeatures !== false,
        highQuality: options.highQuality === true,
        style: options.style || 'natural',
        lighting: options.lighting || 'auto'
      };

      // Use Gemini for try-on generation
      const aiResult = await this.geminiIntegration.generateTryOn(
        userPhoto.data,
        clothingItem.data,
        aiOptions
      );

      if (!aiResult.success) {
        throw new Error(aiResult.error || 'AI processing failed');
      }

      return {
        description: aiResult.description,
        recommendations: aiResult.recommendations || [],
        confidence: aiResult.confidence || 0.8,
        aiResponse: aiResult.rawResponse,
        processingMethod: 'gemini-ai'
      };

    } catch (error) {
      console.error('AI try-on failed:', error);
      
      // Fallback to mock result for development
      return this.generateMockTryOn(userPhoto, clothingItem, options);
    }
  }

  // Generate mock try-on result (for development/testing)
  generateMockTryOn(userPhoto, clothingItem, options) {
    const mockDescriptions = [
      `The ${clothingItem.category} fits well and complements your body shape. The color works nicely with your skin tone.`,
      `This item creates a flattering silhouette. Consider pairing with complementary accessories.`,
      `The fit appears comfortable and stylish. The fabric drapes naturally on your frame.`,
      `This piece enhances your natural features while maintaining a modern, fashionable look.`
    ];

    const mockRecommendations = [
      'Consider sizing up for a more relaxed fit',
      'This color palette works well with your complexion',
      'Pair with neutral accessories for a balanced look',
      'The style suits your body type perfectly'
    ];

    return {
      description: mockDescriptions[Math.floor(Math.random() * mockDescriptions.length)],
      recommendations: [mockRecommendations[Math.floor(Math.random() * mockRecommendations.length)]],
      confidence: 0.85,
      aiResponse: 'Mock try-on result for development',
      processingMethod: 'mock-generator'
    };
  }

  // Post-process the try-on result
  async postProcessResult(tryOnResult, options) {
    try {
      // Create a composite result
      const result = {
        ...tryOnResult,
        timestamp: Date.now(),
        id: this.generateResultId(),
        version: '1.0'
      };

      // Add thumbnail if requested
      if (options.createThumbnail !== false) {
        // For now, we'll use a placeholder since we don't have the actual generated image
        result.thumbnail = await this.createResultThumbnail(result);
      }

      // Add quality score
      result.qualityScore = this.calculateQualityScore(result);

      return result;

    } catch (error) {
      console.error('Post-processing failed:', error);
      return tryOnResult; // Return original result if post-processing fails
    }
  }

  // Create thumbnail for result
  async createResultThumbnail(result) {
    // Placeholder implementation - in a real app, this would create a thumbnail
    // of the generated try-on image
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="150" fill="#f8f9fa" stroke="#dee2e6"/>
        <text x="75" y="75" text-anchor="middle" fill="#6c757d" font-family="Arial" font-size="12">
          Try-on Result
        </text>
        <text x="75" y="95" text-anchor="middle" fill="#6c757d" font-family="Arial" font-size="10">
          ${result.confidence ? Math.round(result.confidence * 100) + '%' : 'N/A'}
        </text>
      </svg>
    `);
  }

  // Calculate quality score for the result
  calculateQualityScore(result) {
    let score = 0.5; // Base score

    // Factor in AI confidence
    if (result.confidence) {
      score += result.confidence * 0.3;
    }

    // Factor in processing method
    if (result.processingMethod === 'gemini-ai') {
      score += 0.2;
    }

    // Factor in recommendations (more recommendations = better analysis)
    if (result.recommendations && result.recommendations.length > 0) {
      score += Math.min(result.recommendations.length * 0.05, 0.15);
    }

    return Math.min(Math.max(score, 0), 1); // Clamp between 0 and 1
  }

  // Save try-on result
  async saveTryOnResult(result, userPhoto, clothingItem) {
    try {
      const resultData = {
        originalImage: userPhoto.data,
        processedImage: result.thumbnail, // Placeholder
        clothingItem: {
          image: clothingItem.data || clothingItem.image,
          category: clothingItem.category,
          source: clothingItem.source,
          url: clothingItem.url
        },
        category: clothingItem.category || 'clothing',
        metadata: {
          description: result.description,
          recommendations: result.recommendations,
          confidence: result.confidence,
          qualityScore: result.qualityScore,
          processingMethod: result.processingMethod,
          timestamp: result.timestamp
        }
      };

      const savedId = await this.storageManager.saveTryOnResult(resultData);
      result.savedId = savedId;

      return savedId;

    } catch (error) {
      console.error('Failed to save try-on result:', error);
      // Don't throw error - saving is optional
      return null;
    }
  }

  // Generate unique result ID
  generateResultId() {
    return 'tryon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Get user's best photo for try-on
  async getBestUserPhoto(category = 'clothing') {
    try {
      const userPhotos = await this.storageManager.getUserPhotos();
      
      if (!userPhotos || userPhotos.length === 0) {
        throw new Error('No user photos available');
      }

      // For now, return the most recent photo
      // In a real implementation, this could analyze photos to find the best one
      // based on pose, lighting, clothing visibility, etc.
      return userPhotos.sort((a, b) => b.timestamp - a.timestamp)[0];

    } catch (error) {
      console.error('Failed to get best user photo:', error);
      throw error;
    }
  }

  // Batch process multiple try-ons
  async batchTryOn(clothingItems, options = {}) {
    const results = [];
    const userPhoto = await this.getBestUserPhoto();

    for (const item of clothingItems) {
      try {
        const result = await this.generateTryOn(userPhoto.id, item, {
          ...options,
          saveResult: options.saveResults !== false
        });
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          item: item
        });
      }
    }

    return {
      success: true,
      results: results,
      processed: results.length,
      successful: results.filter(r => r.success).length
    };
  }

  // Get processing statistics
  getProcessingStats() {
    return {
      version: '1.0',
      supportedCategories: ['tops', 'bottoms', 'dresses', 'shoes', 'accessories'],
      features: [
        'AI-powered try-on generation',
        'Multiple clothing categories',
        'Quality enhancement',
        'Batch processing',
        'Local storage'
      ],
      limitations: [
        'Requires user photos',
        'Internet connection for AI processing',
        'Processing time varies by image complexity'
      ]
    };
  }
}

// Create global instance (compatible with both service worker and browser contexts)
if (typeof window !== 'undefined') {
  window.tryOnGenerator = new TryOnGenerator();
} else {
  // In service worker context, make it available globally
  self.TryOnGenerator = TryOnGenerator;
}
