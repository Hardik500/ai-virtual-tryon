# AI Virtual Try-On Chrome Extension

A Chrome extension that allows users to virtually try on clothing, shoes, and accessories from any website using AI-powered image processing.

## Features

- **Advanced Virtual Try-On**: Try on clothing items from any website using Gemini 2.5 Flash Image
- **Character Consistency**: Maintains exact facial features and body proportions
- **Multi-Image Fusion**: Seamlessly blends clothing items with user photos
- **Enhanced Fit Analysis**: Advanced assessment of size, body match, and pose compatibility
- **Styling Intelligence**: Color harmony, style matching, and occasion suitability analysis
- **Screenshot Capture**: Capture items directly from web pages with AI optimization
- **Image URL Support**: Process clothing items from image URLs with enhanced quality
- **Safety Validation**: Built-in content safety checks and AI-generated content watermarks
- **Local Storage**: All data stored locally in your browser for privacy
- **Smart Image Processing**: AI-optimized preprocessing for better results
- **Usage Analytics**: Track API usage and performance metrics
- **User Profile**: Customizable profile with photos and measurements
- **Cross-Site Compatibility**: Works on any website

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension will appear in your Chrome toolbar

## Setup

1. Click the extension icon and select "Complete Setup"
2. Enter your Google Gemini API key (get one from [Google AI Studio](https://makersuite.google.com/app/apikey))
3. Upload 2-5 photos of yourself (full body, different angles)
4. Optionally add your body measurements for better fitting
5. Configure your preferences
6. Click "Complete Setup"

## Usage

### Method 1: Selection Mode
1. Click the extension icon
2. Click "Select Item"
3. Click on any clothing item on the webpage
4. The AI will process and generate a try-on result

### Method 2: Screenshot
1. Click the extension icon
2. Click "Screenshot"
3. The entire page will be captured and processed for clothing items

### Method 3: Image URL
1. Click the extension icon
2. Click "Image URL"
3. Enter the URL of a clothing item image
4. Click "Process Image"

### Keyboard Shortcuts
- `Ctrl+Shift+T`: Start selection mode
- `ESC`: Cancel selection mode

## Privacy & Security

- **Local Storage Only**: All your photos and data are stored locally in your browser
- **No External Servers**: No images are sent to external servers except your own Gemini API
- **User-Controlled API**: You provide and control your own Gemini API key
- **Data Management**: Clear all data anytime from the settings

## Technical Details

### Architecture
- **Manifest V3**: Modern Chrome extension architecture
- **IndexedDB**: Local database for storing photos and results
- **Chrome Storage API**: Settings and profile data
- **Content Scripts**: Cross-site functionality
- **Service Worker**: Background processing

### AI Processing
- **Gemini 2.5 Flash Image**: Latest Google AI model with enhanced image capabilities
- **Advanced Clothing Detection**: Automatic identification with detailed analysis
- **Realistic Try-On Generation**: Character-consistent virtual try-on with preserved user features
- **Multi-Turn Editing**: Support for iterative refinements and adjustments
- **Safety First**: Built-in content validation and AI-generated content marking
- **Category Support**: Tops, bottoms, dresses, shoes, accessories with specialized handling

### File Structure
```
ai-virtual-tryon/
├── manifest.json              # Extension configuration
├── background.js              # Service worker
├── content/
│   ├── content.js            # Content script for web pages
│   └── content.css           # Overlay styles
├── popup/
│   ├── popup.html            # Extension popup interface
│   ├── popup.js              # Popup functionality
│   └── popup.css             # Popup styles
├── options/
│   ├── options.html          # User setup page
│   ├── options.js            # Setup functionality
│   └── options.css           # Setup page styles
├── lib/
│   ├── storage-manager.js    # Local storage management
│   ├── gemini-integration.js # AI processing (to be implemented)
│   ├── image-processor.js    # Image utilities (to be implemented)
│   └── tryon-generator.js    # Try-on logic (to be implemented)
├── assets/
│   └── icons/               # Extension icons
└── README.md
```

## Development Status

### ✅ Completed
- [x] Basic extension structure (Manifest V3)
- [x] User interface (popup, options page)
- [x] Screenshot capture functionality
- [x] Local storage system (IndexedDB)
- [x] User profile setup
- [x] Photo upload and management
- [x] Settings and preferences
- [x] Gemini 2.5 Flash Image API integration
- [x] Advanced AI prompt engineering for clothing detection
- [x] Enhanced try-on generation with character consistency
- [x] Smart image processing utilities
- [x] Safety validation and content watermarking
- [x] Multi-image fusion capabilities
- [x] Advanced fit and styling analysis

### 🚧 In Progress
- [ ] Performance optimizations for large images
- [ ] Enhanced user onboarding experience
- [ ] Advanced error handling and recovery

### 📋 Planned
- [ ] Batch processing capabilities for multiple items
- [ ] Export/sharing functionality with privacy controls
- [ ] Machine learning model fine-tuning
- [ ] Integration with popular fashion e-commerce platforms
- [ ] Advanced pose estimation and body measurements

## API Requirements

You'll need a Google Gemini API key to use this extension:

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Enter it in the extension setup

## Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Chromium-based browsers (Edge, Brave, etc.)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Disclaimer

This extension is for educational and personal use. Ensure you have permission to process images from websites you visit. The quality of try-on results depends on the input images and AI model capabilities.
