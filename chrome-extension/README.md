# Live Subtitle Translator - Chrome Extension

A Chrome extension that translates live captions from YouTube, Microsoft Teams, and Zoom into 100+ languages using Azure Translator API.

## 🔧 Setup Instructions

### 1. Configure Azure Translator API

1. Go to [Azure Portal](https://portal.azure.com)
2. Create or navigate to your Translator resource
3. Go to "Keys and Endpoint" section
4. Copy your API key and region
5. Open `background/config.js` and replace the placeholder values:

```javascript
export const CONFIG = {
  AZURE_TRANSLATOR_KEY: "your_actual_api_key_here",
  AZURE_TRANSLATOR_REGION: "your_region_here", // e.g., "eastus"
  AZURE_TRANSLATOR_ENDPOINT: "https://api.cognitive.microsofttranslator.com"
};
```

### 2. Install the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. The extension should now appear in your extensions list

## ✨ Features Fixed

### ✅ **Issue 1: Popup State Persistence**
- **Fixed**: Settings now properly persist between popup sessions
- **Solution**: Improved `chrome.storage.sync` integration with proper loading/saving
- **Benefit**: No need to reselect language and settings when reopening popup

### ✅ **Issue 2: Auto-Loading Prevention** 
- **Fixed**: Overlay no longer automatically loads on video pages
- **Solution**: Content scripts now wait for user to click "Start Capture"
- **Benefit**: User has full control over when translation begins

### ✅ **Issue 3: Proper State Management**
- **Fixed**: Coordinated communication between popup, background, and content scripts
- **Solution**: Centralized state management in background script
- **Benefit**: Consistent behavior across all extension components

### ✅ **Issue 4: User Experience Improvements**
- **Fixed**: Clear visual feedback for extension status
- **Solution**: Proper UI state management with status indicators
- **Benefit**: Users always know if extension is active or idle

## 🎮 How to Use

1. **Navigate** to a supported platform (YouTube, Teams, or Zoom)
2. **Click** the extension icon in your browser toolbar
3. **Select** your target language from the dropdown
4. **Configure** settings (show original, censor profanity)
5. **Click** "Start Capture" to begin translation
6. **View** translated captions in the overlay on the page
7. **Click** "Stop Capture" when done

## 🌐 Supported Platforms

- **YouTube** - Requires captions to be enabled on the video
- **Microsoft Teams** - Works with live captions during meetings  
- **Zoom** - Works with live transcription during meetings

## ⚙️ Settings

- **Target Language**: Choose from 100+ languages supported by Azure Translator
- **Show Original**: Display both original and translated text
- **Censor Profanity**: Filter inappropriate language in translations
- **Dark/Light Theme**: Toggle between visual themes

## 🔧 Troubleshooting

### Translation Not Working?
1. Verify Azure API credentials in `background/config.js`
2. Check browser console for error messages
3. Ensure you have an active internet connection

### Captions Not Appearing?
1. Make sure captions are enabled on the platform
2. Click "Start Capture" in the extension popup
3. Check if the page has captions available

### Extension Not Loading?
1. Refresh the browser page
2. Disable and re-enable the extension
3. Check for Chrome extension errors in `chrome://extensions/`

## 🔒 Privacy & Security

- ✅ Only processes captions when user explicitly starts capture
- ✅ No data stored locally except user preferences
- ✅ Translation API calls only made when translation is requested
- ✅ No tracking or analytics

## 🛠️ Technical Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Popup       │ ── │   Background     │ ── │  Content Scripts│
│  (User Control) │    │  (Coordination)  │    │   (Monitoring)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Azure Translator│
                    │       API        │
                    └──────────────────┘
```

## 📝 Development Notes

- **Manifest V3** compatibility
- **Service Worker** based background script
- **Modern ES6+** JavaScript throughout
- **Async/await** for better error handling
- **Chrome Storage API** for settings persistence

---

**Developed by The Sentinels Team**