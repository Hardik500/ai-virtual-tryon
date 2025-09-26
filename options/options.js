// Options page script for AI Virtual Try-On extension

class VirtualTryOnOptions {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4;
    this.userProfile = {
      apiKey: '',
      photos: [],
      measurements: {},
      preferences: {},
      isComplete: false
    };
    this.uploadedPhotos = [];
    this.init();
  }

  async init() {
    await this.loadExistingData();
    this.setupEventListeners();
    this.updateUI();
    this.updateProgress();
  }

  // Load existing user data
  async loadExistingData() {
    try {
      if (window.storageManager) {
        const profile = await window.storageManager.getUserProfile();
        if (profile) {
          this.userProfile = { ...this.userProfile, ...profile };
        }
        
        const photos = await window.storageManager.getUserPhotos();
        this.uploadedPhotos = photos || [];
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // API Key section
    document.getElementById('gemini-api-key').addEventListener('input', (e) => {
      this.userProfile.apiKey = e.target.value;
      this.validateStep(1);
    });

    document.getElementById('toggle-api-key').addEventListener('click', () => {
      this.toggleApiKeyVisibility();
    });

    document.getElementById('test-api-btn').addEventListener('click', () => {
      this.testApiConnection();
    });

    // Photo upload section
    const photoInput = document.getElementById('photo-input');
    const uploadZone = document.getElementById('photo-upload-zone');

    uploadZone.addEventListener('click', () => {
      photoInput.click();
    });

    photoInput.addEventListener('change', (e) => {
      this.handlePhotoUpload(e.target.files);
    });

    // Drag and drop for photos
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      this.handlePhotoUpload(e.dataTransfer.files);
    });

    // Measurements section
    const measurementInputs = ['height', 'weight', 'chest', 'waist', 'hips', 'shoe-size'];
    measurementInputs.forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        this.updateMeasurements();
      });
    });

    // Unit selectors
    document.getElementById('height-unit').addEventListener('change', () => {
      this.updateMeasurements();
    });
    document.getElementById('weight-unit').addEventListener('change', () => {
      this.updateMeasurements();
    });
    document.getElementById('shoe-size-unit').addEventListener('change', () => {
      this.updateMeasurements();
    });

    // Preferences section
    const preferenceInputs = ['auto-detect-clothing', 'save-try-ons', 'high-quality-processing'];
    preferenceInputs.forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        this.updatePreferences();
      });
    });

    document.getElementById('default-category').addEventListener('change', () => {
      this.updatePreferences();
    });

    // Footer buttons
    document.getElementById('reset-btn').addEventListener('click', () => {
      this.resetAllData();
    });

    document.getElementById('save-btn').addEventListener('click', () => {
      this.completeSetup();
    });
  }

  // Toggle API key visibility
  toggleApiKeyVisibility() {
    const input = document.getElementById('gemini-api-key');
    const button = document.getElementById('toggle-api-key');
    
    if (input.type === 'password') {
      input.type = 'text';
      button.textContent = 'Hide';
    } else {
      input.type = 'password';
      button.textContent = 'Show';
    }
  }

  // Test API connection
  async testApiConnection() {
    const apiKey = document.getElementById('gemini-api-key').value.trim();
    const statusDiv = document.getElementById('api-status');
    const testBtn = document.getElementById('test-api-btn');
    
    if (!apiKey) {
      this.showStatus('api-status', 'Please enter an API key first', 'error');
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    
    try {
      // Test API connection (placeholder - will be implemented with actual Gemini integration)
      await this.simulateApiTest(apiKey);
      
      this.showStatus('api-status', 'API connection successful!', 'success');
      this.validateStep(1);
    } catch (error) {
      this.showStatus('api-status', 'API connection failed: ' + error.message, 'error');
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Test API Connection';
    }
  }

  // Simulate API test (placeholder)
  async simulateApiTest(apiKey) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (apiKey.length > 10) {
          resolve();
        } else {
          reject(new Error('Invalid API key format'));
        }
      }, 1500);
    });
  }

  // Handle photo upload
  async handlePhotoUpload(files) {
    const maxFiles = 5;
    const maxSize = 10 * 1024 * 1024; // 10MB per file
    
    if (this.uploadedPhotos.length + files.length > maxFiles) {
      alert(`You can upload a maximum of ${maxFiles} photos`);
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        continue;
      }
      
      if (file.size > maxSize) {
        alert(`${file.name} is too large. Maximum size is 10MB`);
        continue;
      }

      try {
        const photoData = await this.processPhotoFile(file);
        
        if (window.storageManager) {
          const photoId = await window.storageManager.saveUserPhoto(photoData);
          photoData.id = photoId;
        }
        
        this.uploadedPhotos.push(photoData);
      } catch (error) {
        console.error('Failed to process photo:', error);
        alert(`Failed to process ${file.name}`);
      }
    }

    this.updatePhotoDisplay();
    this.validateStep(2);
  }

  // Process photo file
  async processPhotoFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve({
          data: e.target.result,
          filename: file.name,
          size: file.size,
          type: file.type,
          timestamp: Date.now()
        });
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  // Update photo display
  updatePhotoDisplay() {
    const container = document.getElementById('uploaded-photos');
    
    if (this.uploadedPhotos.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this.uploadedPhotos.map((photo, index) => `
      <div class="photo-item">
        <img src="${photo.data}" alt="${photo.filename}">
        <button class="photo-remove" onclick="virtualTryOnOptions.removePhoto(${index})">&times;</button>
      </div>
    `).join('');
  }

  // Remove photo
  async removePhoto(index) {
    const photo = this.uploadedPhotos[index];
    
    if (photo.id && window.storageManager) {
      try {
        await window.storageManager.deleteUserPhoto(photo.id);
      } catch (error) {
        console.error('Failed to delete photo from storage:', error);
      }
    }
    
    this.uploadedPhotos.splice(index, 1);
    this.updatePhotoDisplay();
    this.validateStep(2);
  }

  // Update measurements
  updateMeasurements() {
    this.userProfile.measurements = {
      height: {
        value: document.getElementById('height').value,
        unit: document.getElementById('height-unit').value
      },
      weight: {
        value: document.getElementById('weight').value,
        unit: document.getElementById('weight-unit').value
      },
      chest: document.getElementById('chest').value,
      waist: document.getElementById('waist').value,
      hips: document.getElementById('hips').value,
      shoeSize: {
        value: document.getElementById('shoe-size').value,
        unit: document.getElementById('shoe-size-unit').value
      }
    };
    
    this.validateStep(3);
  }

  // Update preferences
  updatePreferences() {
    this.userProfile.preferences = {
      autoDetectClothing: document.getElementById('auto-detect-clothing').checked,
      saveTryOns: document.getElementById('save-try-ons').checked,
      highQualityProcessing: document.getElementById('high-quality-processing').checked,
      defaultCategory: document.getElementById('default-category').value
    };
    
    this.validateStep(4);
  }

  // Validate step completion
  validateStep(step) {
    let isValid = false;

    switch (step) {
      case 1:
        isValid = this.userProfile.apiKey.length > 10;
        document.getElementById('test-api-btn').disabled = !isValid;
        break;
      case 2:
        isValid = this.uploadedPhotos.length >= 1;
        break;
      case 3:
        // Measurements are optional
        isValid = true;
        break;
      case 4:
        // Preferences have defaults
        isValid = true;
        break;
    }

    this.updateStepStatus(step, isValid);
    this.updateProgress();
  }

  // Update step status
  updateStepStatus(step, isValid) {
    const section = document.getElementById(`${this.getStepId(step)}-section`);

    if (isValid) {
      section.classList.add('completed');
    } else {
      section.classList.remove('completed');
    }
  }

  // Get step ID
  getStepId(step) {
    const stepIds = ['', 'api', 'photos', 'measurements', 'preferences'];
    return stepIds[step];
  }

  // Update progress
  updateProgress() {
    const completedSteps = this.getCompletedSteps();
    const progress = (completedSteps / this.totalSteps) * 100;

    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `${Math.round(progress)}% Complete`;

    // Enable save button if all required steps are complete
    const canComplete = completedSteps >= 2; // API key and at least one photo
    document.getElementById('save-btn').disabled = !canComplete;

    // Update section active states
    for (let i = 1; i <= this.totalSteps; i++) {
      const section = document.getElementById(`${this.getStepId(i)}-section`);
      if (i <= completedSteps + 1) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    }
  }

  // Get number of completed steps
  getCompletedSteps() {
    let completed = 0;

    if (this.userProfile.apiKey.length > 10) completed++;
    if (this.uploadedPhotos.length >= 1) completed++;
    completed++; // Measurements (optional)
    completed++; // Preferences (always valid)

    return Math.min(completed, this.totalSteps);
  }

  // Show status message
  showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status-message ${type}`;
  }

  // Update UI with existing data
  updateUI() {
    // Populate API key
    if (this.userProfile.apiKey) {
      document.getElementById('gemini-api-key').value = this.userProfile.apiKey;
    }

    // Populate measurements
    if (this.userProfile.measurements) {
      const measurements = this.userProfile.measurements;

      if (measurements.height) {
        document.getElementById('height').value = measurements.height.value || '';
        document.getElementById('height-unit').value = measurements.height.unit || 'cm';
      }

      if (measurements.weight) {
        document.getElementById('weight').value = measurements.weight.value || '';
        document.getElementById('weight-unit').value = measurements.weight.unit || 'kg';
      }

      document.getElementById('chest').value = measurements.chest || '';
      document.getElementById('waist').value = measurements.waist || '';
      document.getElementById('hips').value = measurements.hips || '';

      if (measurements.shoeSize) {
        document.getElementById('shoe-size').value = measurements.shoeSize.value || '';
        document.getElementById('shoe-size-unit').value = measurements.shoeSize.unit || 'eu';
      }
    }

    // Populate preferences
    if (this.userProfile.preferences) {
      const prefs = this.userProfile.preferences;

      document.getElementById('auto-detect-clothing').checked = prefs.autoDetectClothing !== false;
      document.getElementById('save-try-ons').checked = prefs.saveTryOns !== false;
      document.getElementById('high-quality-processing').checked = prefs.highQualityProcessing === true;
      document.getElementById('default-category').value = prefs.defaultCategory || 'auto';
    }

    // Update photo display
    this.updatePhotoDisplay();

    // Validate all steps
    for (let i = 1; i <= this.totalSteps; i++) {
      this.validateStep(i);
    }
  }

  // Complete setup
  async completeSetup() {
    try {
      // Update profile with current data
      this.userProfile.photos = this.uploadedPhotos.map(photo => photo.id);
      this.userProfile.isComplete = true;
      this.userProfile.setupDate = Date.now();

      // Save to storage
      if (window.storageManager) {
        await window.storageManager.saveUserProfile(this.userProfile);
      }

      alert('Setup completed successfully! You can now start using AI Virtual Try-On.');

      // Close options page
      window.close();
    } catch (error) {
      console.error('Failed to complete setup:', error);
      alert('Failed to save setup. Please try again.');
    }
  }

  // Reset all data
  async resetAllData() {
    if (!confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      return;
    }

    try {
      if (window.storageManager) {
        await window.storageManager.clearAllData();
      }

      // Reset local state
      this.userProfile = {
        apiKey: '',
        photos: [],
        measurements: {},
        preferences: {},
        isComplete: false
      };
      this.uploadedPhotos = [];

      // Reset UI
      document.getElementById('gemini-api-key').value = '';
      document.querySelectorAll('input[type="number"]').forEach(input => input.value = '');
      document.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.checked = input.id === 'save-try-ons'; // Default checked
      });
      document.getElementById('default-category').value = 'auto';

      this.updatePhotoDisplay();
      this.updateProgress();

      alert('All data has been reset successfully.');
    } catch (error) {
      console.error('Failed to reset data:', error);
      alert('Failed to reset data. Please try again.');
    }
  }
}

// Initialize options page when DOM is loaded
let virtualTryOnOptions;
document.addEventListener('DOMContentLoaded', () => {
  virtualTryOnOptions = new VirtualTryOnOptions();
});
}
