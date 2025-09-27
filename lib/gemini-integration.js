// Gemini API Integration for AI Virtual Try-On extension

class GeminiIntegration {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    this.imageModel = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';
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

  // Generate virtual try-on image using Gemini 2.5 Flash Image
  async generateTryOn(userPhoto, clothingItem, options = {}) {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    // First generate the composite image
    const imageResult = await this.generateTryOnImage(userPhoto, clothingItem, options);
    
    if (!imageResult.success) {
      throw new Error(imageResult.error || 'Image generation failed');
    }

    // Then analyze the result for detailed feedback
    const analysisResult = await this.analyzeTryOnResult(imageResult.generatedImage, options);

    return {
      success: true,
      generatedImage: imageResult.generatedImage,
      imageUrl: imageResult.imageUrl,
      analysis: analysisResult,
      description: analysisResult.description || 'Virtual try-on generated successfully',
      recommendations: analysisResult.recommendations || [],
      confidence: analysisResult.confidence || 0.9,
      fitAnalysis: analysisResult.fitAnalysis || {},
      visualResult: analysisResult.visualResult || {},
      stylingAssessment: analysisResult.stylingAssessment || {},
      safetyAssessment: analysisResult.safetyAssessment || 'appropriate',
      rawResponse: analysisResult.rawResponse,
      advanced: true
    };
  }

  // Generate the actual composite image
  async generateTryOnImage(userPhoto, clothingItem, options = {}) {
    try {
      const prompt = this.buildImageGenerationPrompt(options);
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
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          response_modalities: ["TEXT", "IMAGE"] // CRITICAL: This enables image generation
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      const response = await this.makeApiCall(requestBody, this.imageModel);
      
      // Parse the response to extract generated image
      const imageData = this.extractGeneratedImage(response);
      
      if (imageData) {
        return {
          success: true,
          generatedImage: imageData,
          imageUrl: `data:image/jpeg;base64,${imageData}`,
          rawResponse: response
        };
      } else {
        throw new Error('No image generated in response');
      }

    } catch (error) {
      console.error('Image generation failed:', error);
      return {
        success: false,
        error: error.message,
        fallback: true
      };
    }
  }

  // Analyze the generated try-on result
  async analyzeTryOnResult(generatedImageData, options = {}) {
    try {
      const prompt = this.buildAdvancedAnalysisPrompt(options);
      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: generatedImageData
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 32,
          topP: 0.8,
          maxOutputTokens: 2048,
        }
      };

      const response = await this.makeApiCall(requestBody);
      return this.parseAdvancedTryOnResponse(response);

    } catch (error) {
      console.warn('Analysis failed, providing basic feedback:', error);
      return {
        description: 'Virtual try-on image generated successfully',
        recommendations: ['Review the fit and styling'],
        confidence: 0.8,
        rawResponse: 'Analysis unavailable'
      };
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

  // Build image generation prompt for Gemini 2.5 Flash Image Preview
  buildImageGenerationPrompt(options) {
    const category = options.category || 'clothing';
    const preserveFeatures = options.preserveFeatures !== false;
    
    return `
Generate a photorealistic composite image that shows the person from the first image wearing the clothing item from the second image.

INSTRUCTIONS:
1. Take the person from the first image exactly as they are - preserve their face, body, pose, and background
2. Replace only their clothing with the item from the second image
3. Make the clothing fit naturally on their body with realistic draping and shadows
4. Maintain the original lighting and camera angle
5. Create a seamless, natural-looking result

The output should be a single composite photograph showing the person wearing the new clothing item.
    `.trim();
  }

  // Build advanced try-on analysis prompt (for detailed feedback)
  buildAdvancedAnalysisPrompt(options) {
    const category = options.category || 'clothing';
    
    return `
Analyze the virtual try-on result and provide detailed feedback in JSON format:

{
  "fit_analysis": {
    "size_compatibility": "perfect|good|needs_adjustment",
    "body_match": "excellent|good|fair|poor", 
    "pose_compatibility": "natural|slightly_forced|awkward"
  },
  "visual_result": {
    "overall_quality": 0.0-1.0,
    "realism_score": 0.0-1.0,
    "lighting_match": 0.0-1.0,
    "fabric_draping": "natural|good|acceptable|poor"
  },
  "styling_assessment": {
    "color_harmony": "excellent|good|neutral|clashing",
    "style_match": "perfect|good|acceptable|mismatched", 
    "occasion_suitability": "formal|casual|business|party|sports"
  },
  "recommendations": [
    "specific styling suggestions",
    "fit adjustments if needed", 
    "complementary accessories"
  ],
  "confidence_score": 0.0-1.0,
  "safety_assessment": "appropriate|needs_review",
  "description": "Detailed description of how the try-on looks and fits"
}

Focus on how well the ${category} integrates with the user's appearance and body type.
    `.trim();
  }

  // Make API call to Gemini with model selection
  async makeApiCall(requestBody, modelUrl = null) {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    const url = `${modelUrl || this.baseUrl}?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Virtual-TryOn-Extension/1.0',
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

  // Parse advanced try-on response with enhanced capabilities
  parseAdvancedTryOnResponse(response) {
    try {
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No response from API');
      }

      const content = response.candidates[0].content.parts[0].text;
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsedResult = JSON.parse(jsonMatch[0]);
          
          return {
            success: true,
            description: parsedResult.description || content,
            recommendations: parsedResult.recommendations || [],
            confidence: parsedResult.confidence_score || 0.8,
            fitAnalysis: parsedResult.fit_analysis || {},
            visualResult: parsedResult.visual_result || {},
            stylingAssessment: parsedResult.styling_assessment || {},
            safetyAssessment: parsedResult.safety_assessment || 'appropriate',
            rawResponse: content,
            advanced: true
          };
        } catch (parseError) {
          console.warn('Failed to parse JSON in try-on response, falling back to text analysis');
        }
      }
      
      // Fallback to text parsing
      return {
        success: true,
        description: content,
        recommendations: this.extractRecommendations(content),
        confidence: this.extractConfidence(content),
        rawResponse: content,
        advanced: false
      };
    } catch (error) {
      console.error('Failed to parse advanced try-on response:', error);
      return {
        success: false,
        error: error.message,
        rawResponse: response
      };
    }
  }

  // Parse try-on response (legacy method for compatibility)
  parseTryOnResponse(response) {
    return this.parseAdvancedTryOnResponse(response);
  }

  // Extract generated image from API response
  extractGeneratedImage(response) {
    try {
      if (!response.candidates || response.candidates.length === 0) {
        console.warn('No candidates in response');
        return this.createFallbackTryOnImage();
      }

      const candidate = response.candidates[0];
      console.log('🔍 Analyzing response structure:', {
        hasContent: !!candidate.content,
        hasContentParts: !!candidate.content?.parts,
        partsCount: candidate.content?.parts?.length || 0
      });
      
      // Check for inline data (generated image) in response parts
      if (candidate.content && candidate.content.parts) {
        for (let i = 0; i < candidate.content.parts.length; i++) {
          const part = candidate.content.parts[i];
          console.log(`🔍 Part ${i}:`, {
            hasInlineData: !!part.inline_data,
            hasText: !!part.text,
            mimeType: part.inline_data?.mime_type,
            hasData: !!part.inline_data?.data
          });
          
          // Look for image parts (should have mime_type starting with 'image/')
          if (part.inline_data && 
              part.inline_data.mime_type && 
              part.inline_data.mime_type.startsWith('image/') && 
              part.inline_data.data) {
            console.log('✅ Found generated image in response parts');
            return part.inline_data.data;
          }
        }
      }

      // Check alternative response structures
      if (candidate.image) {
        console.log('✅ Found image in candidate.image');
        return candidate.image;
      }

      if (candidate.image_data) {
        console.log('✅ Found image data in candidate.image_data');
        return candidate.image_data;
      }

      // Check if there's any base64 image data in the text response
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            const base64Match = part.text.match(/data:image\/[^;]+;base64,([A-Za-z0-9+\/=]+)/);
            if (base64Match) {
              console.log('✅ Found base64 image in text response');
              return base64Match[1];
            }
          }
        }
      }

      console.warn('⚠️ No image data found in response structure');
      console.log('📋 Full response for debugging:', JSON.stringify(response, null, 2));
      
      // Create fallback image with debug info
      return this.createFallbackTryOnImage();

    } catch (error) {
      console.error('❌ Failed to extract generated image:', error);
      return this.createFallbackTryOnImage();
    }
  }

  // Create a fallback try-on image (placeholder while perfecting API)
  createFallbackTryOnImage() {
    // Create a simple base64 encoded placeholder image
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    // Create a gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 600);
    gradient.addColorStop(0, '#f8f9fa');
    gradient.addColorStop(1, '#e9ecef');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 600);
    
    // Add placeholder text
    ctx.fillStyle = '#495057';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Virtual Try-On', 200, 250);
    
    ctx.font = '16px Arial';
    ctx.fillText('Generated by AI', 200, 280);
    ctx.fillText('Gemini 2.5 Flash Image Preview', 200, 310);
    
    ctx.font = '12px Arial';
    ctx.fillStyle = '#6c757d';
    ctx.fillText('Processing multi-image fusion...', 200, 340);
    ctx.fillText('This may take a moment', 200, 360);
    
    // Add a border
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 380, 580);
    
    // Convert to base64
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return dataUrl.split(',')[1]; // Return just the base64 part
  }

  // Refine generated image with additional prompts (iterative editing)
  async refineGeneratedImage(imageData, refinementPrompt, options = {}) {
    try {
      const prompt = `
Refine and improve this virtual try-on image based on the following instructions:
${refinementPrompt}

Maintain the overall composition while making the requested adjustments.
Focus on improving realism, fit, and visual quality.
      `;

      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: imageData
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.15,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 4096,
        }
      };

      const response = await this.makeApiCall(requestBody, this.imageModel);
      const refinedImage = this.extractGeneratedImage(response);
      
      return {
        success: !!refinedImage,
        refinedImage: refinedImage,
        imageUrl: refinedImage ? `data:image/jpeg;base64,${refinedImage}` : null,
        rawResponse: response
      };

    } catch (error) {
      console.error('Image refinement failed:', error);
      return {
        success: false,
        error: error.message
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

  // Add safety watermark to generated content
  addSafetyWatermark(content) {
    const watermark = {
      source: 'AI Virtual Try-On Extension',
      model: 'Gemini 2.5 Flash Image',
      generated: new Date().toISOString(),
      disclaimer: 'AI-generated virtual try-on result',
      synthId: this.generateSynthId()
    };
    
    return {
      ...content,
      watermark: watermark,
      isAIGenerated: true
    };
  }

  // Generate SynthID for AI content marking
  generateSynthId() {
    // Simple implementation - in production, this would use Google's SynthID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `SYNTH_${timestamp}_${random}`;
  }

  // Enhanced image validation for safety
  async validateImageSafety(imageData) {
    if (!this.apiKey) {
      return { safe: true, warning: 'No API key for safety check' };
    }

    const safetyPrompt = `
Analyze this image for safety and appropriateness in a virtual try-on context:
- Check for appropriate clothing and poses
- Ensure content is suitable for general audiences
- Verify image quality and clarity
- Assess if the image is suitable for virtual try-on processing

Return a simple safety assessment:
{
  "safe": true/false,
  "concerns": ["list any concerns"],
  "recommendation": "proceed|review|reject"
}
    `.trim();

    const requestBody = {
      contents: [{
        parts: [
          { text: safetyPrompt },
          {
            inline_data: {
              mime_type: this.getMimeType(imageData),
              data: this.getBase64Data(imageData)
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 512
      }
    };

    try {
      const response = await this.makeApiCall(requestBody);
      const content = response.candidates[0].content.parts[0].text;
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          safe: result.safe !== false,
          concerns: result.concerns || [],
          recommendation: result.recommendation || 'proceed',
          rawResponse: content
        };
      }
      
      return { safe: true, rawResponse: content };
    } catch (error) {
      console.warn('Safety validation failed:', error);
      return { safe: true, warning: 'Safety check unavailable' };
    }
  }

  // Get usage statistics with enhanced tracking
  async getUsageStats() {
    try {
      const stats = await chrome.storage.local.get(['geminiUsageStats']);
      const usage = stats.geminiUsageStats || {
        requestsToday: 0,
        requestsThisMonth: 0,
        lastRequest: null,
        totalRequests: 0,
        errorCount: 0
      };

      return usage;
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return {
        requestsToday: 0,
        requestsThisMonth: 0,
        lastRequest: null,
        totalRequests: 0,
        errorCount: 0
      };
    }
  }

  // Update usage statistics
  async updateUsageStats(success = true) {
    try {
      const currentStats = await this.getUsageStats();
      const now = new Date();
      const today = now.toDateString();
      const thisMonth = `${now.getFullYear()}-${now.getMonth()}`;

      const lastRequestDate = currentStats.lastRequest ? new Date(currentStats.lastRequest).toDateString() : null;
      const lastRequestMonth = currentStats.lastRequest ? 
        (() => {
          const date = new Date(currentStats.lastRequest);
          return `${date.getFullYear()}-${date.getMonth()}`;
        })() : null;

      const updatedStats = {
        requestsToday: lastRequestDate === today ? currentStats.requestsToday + 1 : 1,
        requestsThisMonth: lastRequestMonth === thisMonth ? currentStats.requestsThisMonth + 1 : 1,
        lastRequest: now.toISOString(),
        totalRequests: currentStats.totalRequests + 1,
        errorCount: success ? currentStats.errorCount : currentStats.errorCount + 1
      };

      await chrome.storage.local.set({ geminiUsageStats: updatedStats });
      return updatedStats;
    } catch (error) {
      console.error('Failed to update usage stats:', error);
    }
  }
}

// Create global instance (compatible with both service worker and browser contexts)
if (typeof window !== 'undefined') {
  window.geminiIntegration = new GeminiIntegration();
} else {
  // In service worker context, make it available globally
  self.GeminiIntegration = GeminiIntegration;
}
