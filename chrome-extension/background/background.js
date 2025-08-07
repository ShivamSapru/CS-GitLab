// background.js - Service Worker for Chrome Extension

import { CONFIG } from './config.js';

// Azure API Management Configuration
const AZURE_APIM_ENDPOINT = CONFIG.AZURE_APIM_ENDPOINT;
const AZURE_APIM_SUBSCRIPTION_KEY = CONFIG.AZURE_APIM_SUBSCRIPTION_KEY;

// Global variables
let isCapturing = false;
let captureTabId = null;
let currentSettings = {
  targetLanguage: 'en',
  censorProfanity: true,
  showOriginal: false
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Live Subtitle Translator installed');
  // Initialize settings from storage
  chrome.storage.sync.get(['subtitleSettings'], (result) => {
    if (result.subtitleSettings) {
      currentSettings = { ...currentSettings, ...result.subtitleSettings };
    }
  });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background: Received message:', message.type || message.action);
  
  switch (message.type) {
    case 'START_CAPTURE':
      handleStartCapture(message.tabId, message.settings, sendResponse);
      return true;

    case 'STOP_CAPTURE':
      handleStopCapture(sendResponse);
      return true;

    case 'GET_STATUS':
      sendResponse({ 
        isCapturing: isCapturing,
        tabId: captureTabId 
      });
      break;

    case 'TRANSLATE_TEXT':
      handleTranslateText(message.text, message.targetLanguage, sendResponse);
      return true;

    case 'UPDATE_SETTINGS':
      console.log('Settings updated:', message.settings);
      currentSettings = { ...currentSettings, ...message.settings };
      // Save settings to storage
      chrome.storage.sync.set({ subtitleSettings: currentSettings });
      sendResponse({ success: true });
      break;

    default:
      console.log('Unknown message type:', message.type);
  }
  
  // CRITICAL: Only handle caption updates when actively capturing
  // This prevents automatic processing before user consent
  if (message.action === 'updateCaption') {
    if (isCapturing && sender.tab && sender.tab.id === captureTabId) {
      console.log('Processing caption from authorized tab:', message.platform, '-', message.text);
      handleRealCaptionUpdate(message.text, message.platform, message.author, sendResponse);
      return true;
    } else {
      // Silently ignore captions when not capturing or from wrong tab
      console.log('Ignoring caption update - not capturing or wrong tab');
      sendResponse({ status: false, error: 'Not actively capturing from this tab' });
      return true;
    }
  }
});

// Handle long-lived connections from content scripts
chrome.runtime.onConnect.addListener(function(port) {
    console.log("Background: Port connected from:", port.name);

    if (port.name === "youtube-caption-port" || port.name === "teams-caption-port") {
        port.onMessage.addListener(function(message) {
            console.log("Background: Received message on port:", message.action, "from", port.name);
            // Only process if actively capturing from the correct tab
            if (message.action === 'updateCaption' && isCapturing) {
                handleRealCaptionUpdate(message.text, message.platform, message.author, (response) => {
                    console.log("Background: handleRealCaptionUpdate response status:", response?.status);
                });
            }
        });
        port.onDisconnect.addListener(function() {
            console.log("Background: Port disconnected from:", port.name);
        });
    }
});

// Handle start capture
async function handleStartCapture(tabId, settings, sendResponse) {
  try {
    if (isCapturing) {
      sendResponse({ success: false, error: 'Already capturing captions' });
      return;
    }

    console.log('Starting caption capture mode');
    isCapturing = true;
    captureTabId = tabId;
    
    // Update settings if provided
    if (settings) {
      currentSettings = { ...currentSettings, ...settings };
      chrome.storage.sync.set({ subtitleSettings: currentSettings });
    }
    
    // Get active tab if tabId not provided
    if (!tabId) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw new Error('No active tab found');
      }
      tabId = tabs[0].id;
      captureTabId = tabId;
    }

    // Notify content script that capture started
    try {
      await chrome.tabs.sendMessage(tabId, { 
        type: 'CAPTURE_STARTED',
        settings: currentSettings
      });
      console.log('Caption capture activated on tab:', tabId);
    } catch (e) {
      console.log('Could not notify content script:', e.message);
      // Don't fail if content script not ready, it will get status on next message
    }

    sendResponse({ success: true });

  } catch (error) {
    console.error('Failed to start caption mode:', error);
    isCapturing = false;
    captureTabId = null;
    sendResponse({ 
      success: false, 
      error: error.message || 'Failed to start caption mode'
    });
  }
}

// Handle stop capture
async function handleStopCapture(sendResponse) {
  try {
    console.log('Stopping caption capture');
    isCapturing = false;
    const previousTabId = captureTabId;
    captureTabId = null;

    // Notify specific tab if we know which one was capturing
    if (previousTabId) {
      try {
        await chrome.tabs.sendMessage(previousTabId, { type: 'CAPTURE_STOPPED' });
        console.log('Notified tab', previousTabId, 'that capture stopped');
      } catch (e) {
        console.log('Could not notify previous capture tab:', e.message);
      }
    }

    // Also notify all tabs as fallback
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_STOPPED' });
      } catch (e) {
        // Ignore errors for tabs that can't receive messages
      }
    }

    console.log('Caption capture stopped successfully');
    if (sendResponse) {
      sendResponse({ success: true });
    }
  } catch (error) {
    console.error('Failed to stop caption capture:', error);
    if (sendResponse) {
      sendResponse({ success: false, error: error.message });
    }
  }
}

// Handle real caption updates from platform scrapers (only when capturing)
async function handleRealCaptionUpdate(text, platform, author, sendResponse) {
  try {
    if (!isCapturing) {
      sendResponse({ status: false, error: 'Not currently capturing' });
      return;
    }

    console.log('Processing real caption:', platform, '-', text);
    
    if (!text || text.trim().length === 0) {
      sendResponse({ status: false, error: 'No text captured' });
      return;
    }
    
    // Skip status/detection messages to prevent auto-overlay creation
    if (text.includes('detected') || text.includes('waiting') || text.includes('ready')) {
      sendResponse({ status: true });
      return;
    }
    
    // Get translation if needed
    let translatedText = text;
    const captionAuthor = author ? `${author}: ` : "";
    
    if (currentSettings.targetLanguage && currentSettings.targetLanguage !== 'none') {
      try {
        const translationResult = await callAzureAPIManagement(text, currentSettings.targetLanguage, currentSettings.censorProfanity);
        translatedText = captionAuthor + translationResult;
      } catch (error) {
        console.error('Translation failed:', error);
        translatedText = captionAuthor + text; // Fallback to original
      }
    } else {
      translatedText = captionAuthor + text;
    }
    
    // Send caption to the specific tab that's capturing
    const targetTabId = captureTabId;
    if (targetTabId) {
      try {
        await chrome.tabs.sendMessage(targetTabId, {
          type: 'REAL_CAPTION_UPDATE',
          originalText: captionAuthor + text,
          translatedText: translatedText,
          platform: platform,
          timestamp: Date.now()
        });
        console.log('Caption sent to content script for display on tab:', targetTabId);
      } catch (e) {
        console.log('Could not send caption to content script:', e.message);
      }
    }
    
    sendResponse({ status: true });
  } catch (error) {
    console.error('Error handling real caption:', error);
    sendResponse({ status: false, error: error.message });
  }
}

// Handle text translation using Azure API Management
async function handleTranslateText(text, targetLanguage, sendResponse) {
  try {
    console.log('Translating with Azure API Management:', text, 'to:', targetLanguage);
    
    if (targetLanguage === 'none') {
      sendResponse({ success: true, translatedText: text });
      return;
    }
    
    // Call Azure API Management
    const translatedText = await callAzureAPIManagement(text, targetLanguage, currentSettings.censorProfanity);
    
    console.log('Azure API Management Result:', translatedText);
    sendResponse({ success: true, translatedText });
    
  } catch (error) {
    console.error('Azure API Management error:', error);
    sendResponse({ 
      success: false, 
      error: error.message, 
      translatedText: text // Fallback to original text
    });
  }
}

// Call Azure API Management (APIM) for translation
async function callAzureAPIManagement(text, targetLanguage, censorProfanity) {
  try {
    let url = `${AZURE_APIM_ENDPOINT}/translate?api-version=3.0&to=${targetLanguage}`;
    if (censorProfanity) {
      url += "&profanityAction=Marked";
    }
    
    // Azure API Management uses Ocp-Apim-Subscription-Key header
    const headers = {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': AZURE_APIM_SUBSCRIPTION_KEY
    };
    
    const body = JSON.stringify([{ text: text }]);
    
    console.log('Calling Azure API Management:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Management error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('API Management response:', result);
    
    if (result && result[0] && result[0].translations && result[0].translations[0]) {
      return result[0].translations[0].text;
    } else {
      throw new Error('Invalid response format from API Management');
    }
    
  } catch (error) {
    console.error('API Management call failed:', error);
    throw error;
  }
}

// Handle tab updates - stop capture if active tab changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isCapturing && tabId === captureTabId) {
    // Notify the reloaded tab if it's the one we're capturing
    chrome.tabs.sendMessage(tabId, {
      type: 'CAPTURE_STATUS',
      isCapturing: true,
      settings: currentSettings
    }).catch(() => {}); // Ignore errors
  }
});

// Handle tab removal - stop capture if the capturing tab is closed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (isCapturing && tabId === captureTabId) {
    console.log('Active capture tab closed, stopping capture');
    isCapturing = false;
    captureTabId = null;
  }
});

// Cleanup on extension disable/uninstall
chrome.runtime.onSuspend.addListener(() => {
  if (isCapturing) {
    console.log('Extension suspending, stopping capture');
    handleStopCapture();
  }
});

console.log('Background script loaded with Azure API Management support');