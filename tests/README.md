# AI Virtual Try-On Extension - Testing

This directory contains tests and debugging tools for the AI Virtual Try-On Chrome extension.

## 📁 Directory Structure

```
tests/
├── integration/     # Integration tests that require Chrome extension APIs
├── debug/          # Debugging and inspection tools
└── README.md       # This file
```

## 🧪 Integration Tests

### `integration/popup-test.js`
**Purpose**: Comprehensive end-to-end test for the virtual try-on functionality.

**How to Run**:
1. Load the extension in Chrome
2. Open the extension popup
3. Right-click → Inspect to open DevTools
4. Go to Console tab
5. Copy and paste the entire contents of `popup-test.js`
6. Press Enter to run

**What it Tests**:
- ✅ Chrome extension APIs availability
- ✅ API key configuration
- ✅ User photo storage
- ✅ Clothing detection workflow
- ✅ Virtual try-on generation
- ✅ Error handling and fallbacks

**Expected Output**:
```
🎨 Starting Extension Popup Image Generation Test...
✅ Chrome extension APIs available
✅ Prerequisites met
🎯 Virtual try-on generated successfully!
```

## 🔍 Debug Tools

### `debug/check-storage.js`
**Purpose**: Inspect the extension's local storage contents.

**How to Run**:
1. Open extension popup → Right-click → Inspect
2. Go to Console tab
3. Copy and paste the contents of `check-storage.js`
4. Press Enter to run

**What it Shows**:
- API key configuration status
- User profile completeness
- Number of uploaded photos
- Storage usage statistics
- Detailed storage structure

## 📋 Testing Checklist

Before releasing a new version, run through this checklist:

### Basic Functionality
- [ ] Extension loads without errors
- [ ] API key can be configured in settings
- [ ] User photos can be uploaded and stored
- [ ] Clothing detection works on various image URLs
- [ ] Virtual try-on generation completes successfully

### Error Handling
- [ ] Graceful handling of invalid API keys
- [ ] Proper error messages for network failures
- [ ] Fallback behavior when Gemini API is unavailable
- [ ] User-friendly error display in popup

### Performance
- [ ] Fast response times (< 15 seconds for try-on)
- [ ] Efficient API usage (minimal redundant calls)
- [ ] Proper caching of converted images
- [ ] No memory leaks in service worker

### Browser Compatibility
- [ ] Works in Chrome (primary target)
- [ ] Service worker operates correctly
- [ ] No console errors in extension contexts
- [ ] Proper manifest V3 compliance

## 🚀 Running Tests

### Quick Test (5 minutes)
1. Run `integration/popup-test.js` with a sample image URL
2. Verify successful try-on generation
3. Check console for any errors

### Full Test Suite (15 minutes)
1. Test various image URLs (Pinterest, Instagram, direct links)
2. Test with different user photos
3. Verify settings page functionality
4. Check error scenarios (invalid URLs, network issues)
5. Validate storage and caching behavior

## 📝 Test Results

Document test results with:
- Chrome version
- Extension version
- Test date
- Pass/fail status
- Any issues encountered
- Performance metrics

## 🔧 Troubleshooting

Common issues and solutions:

### "Chrome extension APIs not available"
- **Cause**: Running test outside extension context
- **Solution**: Run from extension popup console only

### "API key not configured"
- **Cause**: Missing or invalid Gemini API key
- **Solution**: Configure API key in extension settings

### "No user photos available"
- **Cause**: User hasn't uploaded photos
- **Solution**: Upload photos in settings → Profile Setup

### "Virtual try-on generation failed"
- **Cause**: Various (network, API limits, invalid images)
- **Solution**: Check console logs for specific error details

---

*Last updated: January 2025*
