// Storage Manager for AI Virtual Try-On extension
// Handles all local data storage using IndexedDB and Chrome storage

class StorageManager {
  constructor() {
    this.dbName = 'VirtualTryOnDB';
    this.dbVersion = 1;
    this.db = null;
    this.init();
  }

  // Initialize IndexedDB
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('userPhotos')) {
          const photoStore = db.createObjectStore('userPhotos', { keyPath: 'id', autoIncrement: true });
          photoStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('tryOnResults')) {
          const resultStore = db.createObjectStore('tryOnResults', { keyPath: 'id', autoIncrement: true });
          resultStore.createIndex('timestamp', 'timestamp', { unique: false });
          resultStore.createIndex('category', 'category', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('clothingItems')) {
          const itemStore = db.createObjectStore('clothingItems', { keyPath: 'id', autoIncrement: true });
          itemStore.createIndex('source', 'source', { unique: false });
          itemStore.createIndex('category', 'category', { unique: false });
        }
      };
    });
  }

  // User Profile Management
  async saveUserProfile(profile) {
    try {
      await chrome.storage.local.set({ userProfile: profile });
      console.log('User profile saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save user profile:', error);
      throw error;
    }
  }

  async getUserProfile() {
    try {
      const result = await chrome.storage.local.get(['userProfile']);
      return result.userProfile || null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }

  // Photo Management
  async saveUserPhoto(photoData) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['userPhotos'], 'readwrite');
      const store = transaction.objectStore('userPhotos');
      
      const photoRecord = {
        data: photoData.data, // Base64 or blob
        filename: photoData.filename,
        size: photoData.size,
        type: photoData.type,
        timestamp: Date.now(),
        metadata: photoData.metadata || {}
      };
      
      const request = store.add(photoRecord);
      
      request.onsuccess = () => {
        console.log('Photo saved with ID:', request.result);
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to save photo:', request.error);
        reject(request.error);
      };
    });
  }

  async getUserPhotos() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['userPhotos'], 'readonly');
      const store = transaction.objectStore('userPhotos');
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to get user photos:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteUserPhoto(photoId) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['userPhotos'], 'readwrite');
      const store = transaction.objectStore('userPhotos');
      const request = store.delete(photoId);
      
      request.onsuccess = () => {
        console.log('Photo deleted:', photoId);
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('Failed to delete photo:', request.error);
        reject(request.error);
      };
    });
  }

  // Try-on Results Management
  async saveTryOnResult(resultData) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['tryOnResults'], 'readwrite');
      const store = transaction.objectStore('tryOnResults');
      
      const resultRecord = {
        originalImage: resultData.originalImage,
        processedImage: resultData.processedImage,
        clothingItem: resultData.clothingItem,
        category: resultData.category,
        timestamp: Date.now(),
        metadata: resultData.metadata || {},
        favorite: false
      };
      
      const request = store.add(resultRecord);
      
      request.onsuccess = () => {
        console.log('Try-on result saved with ID:', request.result);
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to save try-on result:', request.error);
        reject(request.error);
      };
    });
  }

  async getTryOnResults(limit = 50) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['tryOnResults'], 'readonly');
      const store = transaction.objectStore('tryOnResults');
      const index = store.index('timestamp');
      
      // Get results in descending order (newest first)
      const request = index.openCursor(null, 'prev');
      const results = [];
      let count = 0;
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && count < limit) {
          results.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => {
        console.error('Failed to get try-on results:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteTryOnResult(resultId) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['tryOnResults'], 'readwrite');
      const store = transaction.objectStore('tryOnResults');
      const request = store.delete(resultId);
      
      request.onsuccess = () => {
        console.log('Try-on result deleted:', resultId);
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('Failed to delete try-on result:', request.error);
        reject(request.error);
      };
    });
  }

  // Clothing Items Management
  async saveClothingItem(itemData) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['clothingItems'], 'readwrite');
      const store = transaction.objectStore('clothingItems');
      
      const itemRecord = {
        image: itemData.image,
        source: itemData.source, // 'screenshot', 'url', 'upload'
        category: itemData.category,
        url: itemData.url || null,
        title: itemData.title || 'Clothing Item',
        timestamp: Date.now(),
        metadata: itemData.metadata || {}
      };
      
      const request = store.add(itemRecord);
      
      request.onsuccess = () => {
        console.log('Clothing item saved with ID:', request.result);
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to save clothing item:', request.error);
        reject(request.error);
      };
    });
  }

  // Settings Management
  async saveSettings(settings) {
    try {
      await chrome.storage.local.set({ appSettings: settings });
      console.log('Settings saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  async getSettings() {
    try {
      const result = await chrome.storage.local.get(['appSettings']);
      return result.appSettings || this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to get settings:', error);
      throw error;
    }
  }

  getDefaultSettings() {
    return {
      autoDetectClothing: true,
      saveTryOns: true,
      highQualityProcessing: false,
      defaultCategory: 'auto',
      notifications: true,
      theme: 'light'
    };
  }

  // Data Management
  async clearAllData() {
    try {
      // Clear Chrome storage
      await chrome.storage.local.clear();
      
      // Clear IndexedDB
      if (this.db) {
        const stores = ['userPhotos', 'tryOnResults', 'clothingItems'];
        const transaction = this.db.transaction(stores, 'readwrite');
        
        stores.forEach(storeName => {
          const store = transaction.objectStore(storeName);
          store.clear();
        });
        
        await new Promise((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      }
      
      console.log('All data cleared successfully');
      return true;
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }

  async getStorageUsage() {
    try {
      // Get Chrome storage usage
      const chromeUsage = await chrome.storage.local.getBytesInUse();
      
      // Estimate IndexedDB usage (simplified)
      let dbUsage = 0;
      if (this.db) {
        const photos = await this.getUserPhotos();
        const results = await this.getTryOnResults();
        
        dbUsage = photos.reduce((total, photo) => total + (photo.size || 0), 0) +
                  results.reduce((total, result) => total + (result.size || 0), 0);
      }
      
      return {
        chrome: chromeUsage,
        indexedDB: dbUsage,
        total: chromeUsage + dbUsage
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { chrome: 0, indexedDB: 0, total: 0 };
    }
  }
}

// Create global instance
window.storageManager = new StorageManager();
