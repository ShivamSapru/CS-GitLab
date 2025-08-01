// background.js - Service Worker for Chrome Extension

import { CONFIG } from './config.js';

// Azure Translator Service Configuration
const AZURE_TRANSLATOR_KEY = CONFIG.AZURE_TRANSLATOR_KEY;
const AZURE_TRANSLATOR_REGION = CONFIG.AZURE_TRANSLATOR_REGION;
const AZURE_TRANSLATOR_ENDPOINT = CONFIG.AZURE_TRANSLATOR_ENDPOINT;

// Global variables
let isCapturing = false;
let currentSettings = {
  targetLanguage: 'en',
  censorProfanity: true
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Live Subtitle Translator installed');
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background: Received message:', message.type || message.action);
  
  switch (message.type) {
    case 'START_CAPTURE':
      handleStartCapture(message.tabId, sendResponse);
      return true;

    case 'STOP_CAPTURE':
      handleStopCapture(sendResponse);
      return true;

    case 'GET_STATUS':
      sendResponse({ isCapturing });
      break;

    case 'TRANSLATE_TEXT':
      handleTranslateText(message.text, message.targetLanguage, sendResponse);
      return true;

    case 'UPDATE_SETTINGS':
      console.log('Settings updated:', message.settings);
      currentSettings = { ...currentSettings, ...message.settings };
      sendResponse({ success: true });
      break;

    default:
      console.log('Unknown message type:', message.type);
  }
  
  // Handle action-based messages from platform scrapers
  if (message.action === 'updateCaption') {
    console.log('Real caption:', message.platform, '-', message.text);
    handleRealCaptionUpdate(message.text, message.platform, message.author, sendResponse);
    return true;
  }
});

// Handle long-lived connections from content scripts
chrome.runtime.onConnect.addListener(function(port) {
    console.log("Background: Port connected from:", port.name);

    if (port.name === "youtube-caption-port" || port.name === "teams-caption-port") {
        port.onMessage.addListener(function(message) {
            console.log("Background: Received message on port:", message.action, "from", port.name);
            if (message.action === 'updateCaption') {
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
async function handleStartCapture(tabId, sendResponse) {
  try {
    if (isCapturing) {
      sendResponse({ success: false, error: 'Already capturing captions' });
      return;
    }

    console.log('Starting real caption mode');
    isCapturing = true;
    
    // Get active tab if tabId not provided
    if (!tabId) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw new Error('No active tab found');
      }
      tabId = tabs[0].id;
    }

    // Notify content script that capture started
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'CAPTURE_STARTED' });
      console.log('Subtitle display activated');
    } catch (e) {
      console.log('Could not notify content script:', e.message);
    }

    sendResponse({ success: true });

  } catch (error) {
    console.error('Failed to start caption mode:', error);
    isCapturing = false;
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

    // Notify all tabs that capture stopped
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_STOPPED' });
        console.log('Notified tab', tab.id, 'that capture stopped');
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

// Handle real caption updates from platform scrapers
async function handleRealCaptionUpdate(text, platform, author, sendResponse) {
  try {
    console.log('Processing real caption:', platform, '-', text);
    
    if (!text) {
      sendResponse({ status: false, error: 'No text captured' });
      return;
    }
    
    // Skip status/detection messages
    if (text.includes('detected') || text.includes('waiting')) {
      sendResponse({ status: true });
      return;
    }
    
    // Get translation if needed
    let translatedText = text;
    const captionAuthor = author ? `${author}: ` : "";
    if (currentSettings.targetLanguage && currentSettings.targetLanguage !== 'none') {
      try {
        translatedText = captionAuthor + await callAzureTranslator(text, currentSettings.targetLanguage, currentSettings.censorProfanity);
      } catch (error) {
        console.error('Translation failed:', error);
        translatedText = captionAuthor + text; // Fallback to original
      }
    }
    
    // Send caption to content script for display
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      try {
        await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'REAL_CAPTION_UPDATE',
          originalText: captionAuthor + text,
          translatedText: translatedText,
          platform: platform,
          timestamp: Date.now()
        });
        console.log('Caption sent to content script for display');
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

// Handle text translation using Azure Translator Service
async function handleTranslateText(text, targetLanguage, sendResponse) {
  try {
    console.log('Translating with Azure Translator:', text, 'to:', targetLanguage);
    
    if (targetLanguage === 'none') {
      sendResponse({ success: true, translatedText: text });
      return;
    }
    
    // Call Azure Translator API
    const translatedText = await callAzureTranslator(text, targetLanguage, currentSettings.censorProfanity);
    
    console.log('Azure Translator Result:', translatedText);
    sendResponse({ success: true, translatedText });
    
  } catch (error) {
    console.error('Azure Translator error:', error);
    sendResponse({ 
      success: false, 
      error: error.message, 
      translatedText: text // Fallback to original text
    });
  }
}

// Call Azure API Management
async function callAzureTranslator(text, targetLanguage, censorProfanity) {
  try {
    let url = `${AZURE_TRANSLATOR_ENDPOINT}/translate?api-version=3.0&to=${targetLanguage}`;
    if (censorProfanity) {
      url += "&profanityAction=Marked"
    }
    
    const headers = {
      'Content-Type': 'application/json'
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

// Generate GUID for Azure API tracking
function generateGUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isCapturing) {
    // Notify the reloaded tab if capture is active
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id === tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: 'CAPTURE_STATUS',
          isCapturing: true
        }).catch(() => {}); // Ignore errors
      }
    });
  }
});

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (isCapturing) {
    console.log('Active tab closed, stopping capture');
    handleStopCapture();
  }
});

// Cleanup on extension disable/uninstall
chrome.runtime.onSuspend.addListener(() => {
  if (isCapturing) {
    console.log('Extension suspending, stopping capture');
    handleStopCapture();
  }
});

console.log('Background script loaded');
// console.log('Azure Translator Key configured:', AZURE_TRANSLATOR_KEY.substring(0, 20) + '...');
// console.log('Translator Region:', AZURE_TRANSLATOR_REGION);
