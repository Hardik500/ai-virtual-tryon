# AI Virtual Try-On Chrome Extension - Installation Guide

## ✅ Current Status: **ENHANCED WITH GEMINI 2.5 FLASH IMAGE**
- Service worker errors resolved ✅
- Gemini 2.5 Flash Image integration complete ✅
- Advanced virtual try-on generation functional ✅
- Character consistency and multi-image fusion active ✅
- Enhanced safety validation and watermarking ✅
- Smart image processing optimizations ✅
- Real-time clothing detection with advanced analysis ✅
- Local storage and history working ✅

## Prerequisites

1. **Google Chrome Browser** (version 88 or higher)
2. **Google Gemini API Key** - Get one from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. **Developer Mode** enabled in Chrome Extensions

## Installation Steps

### Step 1: Download the Extension
1. Clone or download this repository to your local machine
2. Extract the files if downloaded as a ZIP

### Step 2: Enable Developer Mode
1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Toggle "Developer mode" ON in the top-right corner

### Step 3: Load the Extension
1. Click "Load unpacked" button
2. Select the `ai-virtual-tryon` folder (the one containing `manifest.json`)
3. The extension should appear in your extensions list
4. Pin the extension to your toolbar for easy access

### Step 4: Initial Setup
1. Click the extension icon in your Chrome toolbar
2. Click "Complete Setup" to open the options page
3. Follow the setup wizard:

#### API Configuration
- Enter your Google Gemini API key
- Click "Test API Connection" to verify it works
- The status should show "API connection successful!"

#### Profile Photos
- Upload 2-5 clear photos of yourself
- Include full body shots from different angles
- Wear form-fitting clothes to show your body shape
- Ensure good lighting and clear backgrounds

#### Body Measurements (Optional)
- Enter your measurements for better fitting
- All fields are optional but recommended
- Choose appropriate units (cm/ft, kg/lbs, etc.)

#### Preferences
- Configure your try-on preferences
- Enable/disable features as desired
- Set default clothing category

5. Click "Complete Setup" when finished

## Usage Instructions

### Method 1: Select Item Mode
1. Navigate to any shopping website
2. Click the extension icon
3. Click "Select Item"
4. Click on any clothing item image on the page
5. Wait for AI processing to complete
6. View your try-on result

### Method 2: Screenshot Mode
1. Navigate to any page with clothing items
2. Click the extension icon
3. Click "Screenshot"
4. The entire page will be captured and analyzed
5. AI will detect clothing items automatically
6. View generated try-on results

### Method 3: Image URL Mode
1. Click the extension icon
2. Click "Image URL"
3. Paste the URL of a clothing item image
4. Click "Process Image"
5. Wait for processing and view results

### Keyboard Shortcuts
- `Ctrl+Shift+T`: Start selection mode on current page
- `ESC`: Cancel selection mode

## Troubleshooting

### Installation Errors

#### Service Worker Registration Failed (Status code: 15)
This is a common error during installation. Try these solutions:
1. **Refresh the extension**: Go to `chrome://extensions/` and click the refresh icon
2. **Remove and reload**: Remove the extension and load it again
3. **Check file structure**: Ensure all files are in the correct locations
4. **Restart Chrome**: Close and reopen Chrome browser

#### Context Menu Errors
If you see "Cannot read properties of undefined (reading 'onClicked')":
1. The extension will still work - this is a non-critical error
2. Right-click context menu on images may not work initially
3. Use the main extension popup instead

### Common Issues

#### Extension Not Loading
- Ensure you selected the correct folder (containing manifest.json)
- Check that Developer mode is enabled
- Try refreshing the extensions page
- **If still failing**: See TROUBLESHOOTING.md for detailed solutions

#### API Connection Failed
- Verify your Gemini API key is correct
- Check your internet connection
- Ensure the API key has proper permissions
- Try generating a new API key

#### No Clothing Detected
- Ensure the image contains clear clothing items
- Try images with better lighting and contrast
- Avoid images with busy backgrounds
- Try different clothing categories

#### Try-On Not Generated
- Complete your profile setup first
- Upload at least one clear photo of yourself
- Ensure your API key is working
- Check that you have sufficient API quota

#### Photos Not Uploading
- Check file size (max 10MB per photo)
- Ensure files are in image format (JPG, PNG, etc.)
- Try uploading one photo at a time
- Clear browser cache if issues persist

### Performance Tips

1. **Image Quality**: Use high-quality, well-lit images for best results
2. **Internet Connection**: Ensure stable internet for AI processing
3. **Browser Resources**: Close unnecessary tabs for better performance
4. **API Limits**: Be aware of your Gemini API usage limits

### Privacy & Data

- All photos are stored locally in your browser
- No images are sent to external servers (except your Gemini API)
- You can delete all data anytime from settings
- API key is stored securely in browser storage

## Testing the Extension

### Basic Functionality Test
1. Install the extension following the steps above
2. Complete the setup with a valid API key
3. Upload at least one photo
4. Test each try-on method:
   - Select an item from a shopping site
   - Take a screenshot of a clothing page
   - Process an image URL

### Expected Results
- Extension icon appears in toolbar
- Setup page opens on first install
- API connection test passes with Gemini 2.5 Flash Image
- Photos upload successfully with AI optimization
- Try-on processing completes without errors using enhanced algorithms
- Results include advanced fit analysis and styling recommendations
- Safety validation passes for all content
- AI-generated content includes proper watermarks
- Results are saved and viewable with enhanced metadata

### Test Websites
Try the extension on these popular shopping sites:
- Amazon Fashion
- Zara
- H&M
- ASOS
- Uniqlo
- Target
- Nordstrom

## Development Mode

### For Developers
If you want to modify the extension:

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

### Debug Console
- Right-click the extension icon → "Inspect popup"
- Check browser console for error messages
- Use Chrome DevTools for debugging

## Uninstallation

### Remove Extension
1. Go to `chrome://extensions/`
2. Find "AI Virtual Try-On"
3. Click "Remove"
4. Confirm removal

### Clear Data
The extension stores data locally. To completely remove all data:
1. Before uninstalling, open the extension options
2. Click "Reset All Data"
3. Confirm data deletion
4. Then uninstall the extension

## Support

### Getting Help
- Check this installation guide first
- Review the main README.md for features and usage
- Check browser console for error messages
- Ensure all prerequisites are met

### Reporting Issues
When reporting issues, please include:
- Chrome version
- Extension version
- Steps to reproduce the problem
- Any error messages
- Screenshots if applicable

### Feature Requests
- Describe the desired functionality
- Explain the use case
- Suggest implementation approach if possible

## Testing the Upgrade

### Gemini 2.5 Flash Image Verification
To verify your extension is using the latest Gemini 2.5 Flash Image model:

1. Open any website with clothing items
2. Open Chrome Developer Tools (F12)
3. Go to the Console tab
4. Paste and run the test script from `test-gemini-2.5-flash.js`
5. Wait for the test results
6. Look for "SUCCESS! Your extension has been upgraded to Gemini 2.5 Flash Image!"

### New Features to Test
- **Enhanced Character Consistency**: Try on items and notice preserved facial features
- **Advanced Fit Analysis**: Check for detailed size and compatibility assessments
- **Styling Intelligence**: Look for color harmony and style match recommendations
- **Safety Validation**: Verify appropriate content filtering
- **AI Watermarks**: Confirm AI-generated content is properly marked

## Version History

### v2.5.0 (Current - Enhanced)
- Gemini 2.5 Flash Image integration
- Character consistency and multi-image fusion
- Advanced fit and styling analysis
- Enhanced safety validation and watermarking
- Smart image processing optimizations
- Improved error handling and diagnostics

### v1.0.0 (Previous)
- Initial release
- Basic try-on functionality
- Gemini AI integration
- Local storage system
- User profile management
- Cross-site compatibility

## License

This project is licensed under the MIT License. See LICENSE file for details.
