// Gemini API Integration for AI Virtual Try-On extension

class GeminiIntegration {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
    this.init();
  }

  async init() {
    // Load API key from storage
    try {
      const profile = await chrome.storage.local.get(['userProfile']);
      if (profile.userProfile && profile.userProfile.apiKey) {
        this.apiKey = profile.userProfile.apiKey;
      }
    } catch (error) {
      console.error('Failed to load API key:', error);
    }
  }

  // Set API key
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  // Test API connection
  async testConnection() {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    const testPrompt = {
      contents: [{
        parts: [{
          text: "Hello, can you confirm this API connection is working?"
        }]
      }]
    };

    try {
      const response = await this.makeApiCall(testPrompt);
      return response.candidates && response.candidates.length > 0;
    } catch (error) {
      throw new Error(`API test failed: ${error.message}`);
    }
  }

  // Detect clothing items in image
  async detectClothing(imageData, options = {}) {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    const prompt = this.buildClothingDetectionPrompt(options);
    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: this.getMimeType(imageData),
              data: this.getBase64Data(imageData)
            }
          }
        ]
      }]
    };

    try {
      const response = await this.makeApiCall(requestBody);
      return this.parseClothingDetectionResponse(response);
    } catch (error) {
      throw new Error(`Clothing detection failed: ${error.message}`);
    }
  }

  // Generate virtual try-on
  async generateTryOn(userPhoto, clothingItem, options = {}) {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    const prompt = this.buildTryOnPrompt(options);
    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: this.getMimeType(userPhoto),
              data: this.getBase64Data(userPhoto)
            }
          },
          {
            inline_data: {
              mime_type: this.getMimeType(clothingItem),
              data: this.getBase64Data(clothingItem)
            }
          }
        ]
      }]
    };

    try {
      const response = await this.makeApiCall(requestBody);
      return this.parseTryOnResponse(response);
    } catch (error) {
      throw new Error(`Try-on generation failed: ${error.message}`);
    }
  }

  // Build clothing detection prompt
  buildClothingDetectionPrompt(options) {
    const category = options.category || 'auto';
    const source = options.source || 'unknown';
    
    return `
Analyze this image and detect clothing items. Please provide a detailed analysis in JSON format with the following structure:

{
  "items": [
    {
      "category": "tops|bottoms|dresses|shoes|accessories",
      "type": "specific item type (e.g., t-shirt, jeans, sneakers)",
      "color": "primary color",
      "style": "style description",
      "confidence": 0.0-1.0,
      "boundingBox": {
        "x": 0, "y": 0, "width": 0, "height": 0
      },
      "features": ["list", "of", "notable", "features"]
    }
  ],
  "background": "background description",
  "lighting": "lighting conditions",
  "quality": "image quality assessment"
}

Focus on identifying wearable clothing items that could be virtually tried on. 
${category !== 'auto' ? `Prioritize detecting ${category}.` : ''}
Image source: ${source}

Provide accurate bounding boxes for each detected item and assess the suitability for virtual try-on.
    `.trim();
  }

  // Build try-on generation prompt
  buildTryOnPrompt(options) {
    const category = options.category || 'clothing';
    const preserveFeatures = options.preserveFeatures !== false;
    const highQuality = options.highQuality === true;
    
    return `
Generate a realistic virtual try-on by combining the user photo with the clothing item. 

Requirements:
1. Preserve the user's facial features, skin tone, and body proportions exactly
2. Apply the clothing item naturally to the user's body
3. Maintain realistic lighting, shadows, and fabric draping
4. Ensure proper fit and positioning for the clothing category: ${category}
5. Keep the background and pose as similar as possible to the original user photo
${preserveFeatures ? '6. Do not alter the user\'s appearance except for the clothing' : ''}
${highQuality ? '7. Generate high-quality, detailed result' : ''}

The result should look natural and realistic, as if the user is actually wearing the clothing item.
Focus on accurate sizing, proper positioning, and natural fabric behavior.

Return the result as a detailed description of how the try-on should look, including:
- Clothing placement and fit
- Color and lighting adjustments needed
- Any styling recommendations
- Confidence score for the try-on quality
    `.trim();
  }

  // Make API call to Gemini
  async makeApiCall(requestBody) {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    const url = `${this.baseUrl}?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  // Parse clothing detection response
  parseClothingDetectionResponse(response) {
    try {
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No response from API');
      }

      const content = response.candidates[0].content.parts[0].text;
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          items: result.items || [],
          metadata: {
            background: result.background,
            lighting: result.lighting,
            quality: result.quality
          },
          rawResponse: content
        };
      } else {
        // Fallback: parse text response
        return {
          success: true,
          items: [],
          metadata: { rawText: content },
          rawResponse: content
        };
      }
    } catch (error) {
      console.error('Failed to parse clothing detection response:', error);
      return {
        success: false,
        error: error.message,
        rawResponse: response
      };
    }
  }

  // Parse try-on response
  parseTryOnResponse(response) {
    try {
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No response from API');
      }

      const content = response.candidates[0].content.parts[0].text;
      
      return {
        success: true,
        description: content,
        recommendations: this.extractRecommendations(content),
        confidence: this.extractConfidence(content),
        rawResponse: content
      };
    } catch (error) {
      console.error('Failed to parse try-on response:', error);
      return {
        success: false,
        error: error.message,
        rawResponse: response
      };
    }
  }

  // Extract recommendations from response
  extractRecommendations(content) {
    const recommendations = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('recommend') || 
          line.toLowerCase().includes('suggest') ||
          line.toLowerCase().includes('advice')) {
        recommendations.push(line.trim());
      }
    }
    
    return recommendations;
  }

  // Extract confidence score from response
  extractConfidence(content) {
    const confidenceMatch = content.match(/confidence[:\s]+(\d+(?:\.\d+)?)/i);
    if (confidenceMatch) {
      return parseFloat(confidenceMatch[1]);
    }
    return 0.8; // Default confidence
  }

  // Get MIME type from image data
  getMimeType(imageData) {
    if (typeof imageData === 'string') {
      if (imageData.startsWith('data:')) {
        const mimeMatch = imageData.match(/data:([^;]+)/);
        return mimeMatch ? mimeMatch[1] : 'image/jpeg';
      }
    }
    return 'image/jpeg';
  }

  // Get base64 data from image
  getBase64Data(imageData) {
    if (typeof imageData === 'string') {
      if (imageData.startsWith('data:')) {
        return imageData.split(',')[1];
      }
      return imageData;
    }
    return imageData;
  }

  // Get usage statistics
  async getUsageStats() {
    // This would track API usage if needed
    return {
      requestsToday: 0,
      requestsThisMonth: 0,
      lastRequest: null
    };
  }
}

// Create global instance (compatible with both service worker and browser contexts)
if (typeof window !== 'undefined') {
  window.geminiIntegration = new GeminiIntegration();
} else {
  // In service worker context, make it available globally
  self.GeminiIntegration = GeminiIntegration;
}
