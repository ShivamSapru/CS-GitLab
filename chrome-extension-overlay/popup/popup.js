// popup.js - Extension popup functionality

// DOM elements
let startBtn, stopBtn, statusDot, statusText;
let sourceLanguageSelect, targetLanguageSelect, showOriginalCheckbox, autoTranslateCheckbox;
let advancedModal, settingsBtn, closeModal;
let confidenceSlider, confidenceValue, maxSubtitlesInput;
let enableLoggingCheckbox, saveHistoryCheckbox;

// State variables
let isCapturing = false;
let currentSettings = {
  sourceLanguage: 'en-US',
  targetLanguage: 'hi',
  showOriginal: true,
  autoTranslate: true,
  confidence: 0.5,
  maxSubtitles: 20,
  enableLogging: false,
  saveHistory: true
};

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
  initializeElements();
  loadSettings();
  bindEvents();
  updateStatus();
});

// Initialize DOM elements
function initializeElements() {
  startBtn = document.getElementById('startBtn');
  stopBtn = document.getElementById('stopBtn');
  statusDot = document.getElementById('statusDot');
  statusText = document.getElementById('statusText');
  
  sourceLanguageSelect = document.getElementById('sourceLanguage');
  targetLanguageSelect = document.getElementById('targetLanguage');
  showOriginalCheckbox = document.getElementById('showOriginal');
  autoTranslateCheckbox = document.getElementById('autoTranslate');
  
  advancedModal = document.getElementById('advancedModal');
  settingsBtn = document.getElementById('settingsBtn');
  closeModal = document.getElementById('closeModal');
  
  confidenceSlider = document.getElementById('confidence');
  confidenceValue = document.getElementById('confidenceValue');
  maxSubtitlesInput = document.getElementById('maxSubtitles');
  enableLoggingCheckbox = document.getElementById('enableLogging');
  saveHistoryCheckbox = document.getElementById('saveHistory');
}

// Bind event listeners
function bindEvents() {
  // Control buttons
  startBtn.addEventListener('click', startCapture);
  stopBtn.addEventListener('click', stopCapture);
  
  // Settings
  sourceLanguageSelect.addEventListener('change', onSettingChange);
  targetLanguageSelect.addEventListener('change', onSettingChange);
  showOriginalCheckbox.addEventListener('change', onSettingChange);
  autoTranslateCheckbox.addEventListener('change', onSettingChange);
  
  // Modal controls
  settingsBtn.addEventListener('click', openAdvancedSettings);
  closeModal.addEventListener('click', closeAdvancedSettings);
  document.getElementById('saveSettings').addEventListener('click', saveAdvancedSettings);
  document.getElementById('resetSettings').addEventListener('click', resetSettings);
  
  // Advanced settings
  confidenceSlider.addEventListener('input', function() {
    confidenceValue.textContent = this.value;
    currentSettings.confidence = parseFloat(this.value);
  });
  
  maxSubtitlesInput.addEventListener('change', function() {
    currentSettings.maxSubtitles = parseInt(this.value);
  });
  
  enableLoggingCheckbox.addEventListener('change', function() {
    currentSettings.enableLogging = this.checked;
  });
  
  saveHistoryCheckbox.addEventListener('change', function() {
    currentSettings.saveHistory = this.checked;
  });
  
  // Help button
  document.getElementById('helpBtn').addEventListener('click', showHelp);
  
  // Close modal on outside click
  advancedModal.addEventListener('click', function(e) {
    if (e.target === advancedModal) {
      closeAdvancedSettings();
    }
  });
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
}

// Start audio capture
async function startCapture() {
  try {
    updateUI(true, 'starting');
    
    const response = await sendMessageToBackground({
      type: 'START_CAPTURE',
      tabId: await getCurrentTabId(),
      settings: currentSettings
    });
    
    if (response.success) {
      isCapturing = true;
      updateUI(true, 'active');
      showNotification('Started capturing audio', 'success');
    } else {
      updateUI(false, 'error');
      showNotification('Failed to start capture: ' + response.error, 'error');
    }
  } catch (error) {
    console.error('Start capture error:', error);
    updateUI(false, 'error');
    showNotification('Error starting capture', 'error');
  }
}

// Stop audio capture
async function stopCapture() {
  try {
    const response = await sendMessageToBackground({
      type: 'STOP_CAPTURE'
    });
    
    if (response.success) {
      isCapturing = false;
      updateUI(false, 'stopped');
      showNotification('Stopped capturing audio', 'info');
    } else {
      showNotification('Failed to stop capture: ' + response.error, 'error');
    }
  } catch (error) {
    console.error('Stop capture error:', error);
    showNotification('Error stopping capture', 'error');
  }
}

// Update UI based on capture state
function updateUI(capturing, status) {
  isCapturing = capturing;
  
  startBtn.classList.toggle('disabled', capturing);
  stopBtn.classList.toggle('disabled', !capturing);
  
  statusDot.className = 'status-dot';
  
  switch (status) {
    case 'starting':
      statusText.textContent = 'Starting capture...';
      statusDot.classList.add('active');
      break;
    case 'active':
      statusText.textContent = 'Capturing audio';
      statusDot.classList.add('active');
      break;
    case 'stopped':
      statusText.textContent = 'Ready to start';
      break;
    case 'error':
      statusText.textContent = 'Error occurred';
      statusDot.classList.add('error');
      break;
    default:
      statusText.textContent = 'Ready to start';
  }
}

// Handle setting changes
function onSettingChange() {
  currentSettings.sourceLanguage = sourceLanguageSelect.value;
  currentSettings.targetLanguage = targetLanguageSelect.value;
  currentSettings.showOriginal = showOriginalCheckbox.checked;
  currentSettings.autoTranslate = autoTranslateCheckbox.checked;
  
  saveSettings();
  
  // Update background script and content script with new settings
  sendMessageToBackground({
    type: 'UPDATE_SETTINGS',
    settings: currentSettings
  });
  
  // Also notify content script about settings change  
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'SETTINGS_UPDATED',
        settings: currentSettings
      }).catch(() => {}); // Ignore errors if content script not ready
    }
  });
}

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(['subtitleSettings'], function(result) {
    if (result.subtitleSettings) {
      currentSettings = { ...currentSettings, ...result.subtitleSettings };
    }
    
    updateSettingsUI();
  });
}

// Save settings to storage
function saveSettings() {
  chrome.storage.sync.set({
    subtitleSettings: currentSettings
  });
}

// Update settings UI with current values
function updateSettingsUI() {
  sourceLanguageSelect.value = currentSettings.sourceLanguage;
  targetLanguageSelect.value = currentSettings.targetLanguage;
  showOriginalCheckbox.checked = currentSettings.showOriginal;
  autoTranslateCheckbox.checked = currentSettings.autoTranslate;
  
  confidenceSlider.value = currentSettings.confidence;
  confidenceValue.textContent = currentSettings.confidence;
  maxSubtitlesInput.value = currentSettings.maxSubtitles;
  enableLoggingCheckbox.checked = currentSettings.enableLogging;
  saveHistoryCheckbox.checked = currentSettings.saveHistory;
}

// Get current tab ID
async function getCurrentTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id;
}

// Send message to background script
function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response || {});
      }
    });
  });
}

// Handle messages from background script
function handleBackgroundMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'CAPTURE_STATUS_CHANGED':
      updateUI(message.isCapturing, message.status);
      break;
      
    case 'ERROR':
      showNotification(message.message, 'error');
      break;
      
    default:
      console.log('Unknown message type:', message.type);
  }
}

// Update status from background script
async function updateStatus() {
  try {
    const response = await sendMessageToBackground({ type: 'GET_STATUS' });
    updateUI(response.isCapturing, response.isCapturing ? 'active' : 'ready');
  } catch (error) {
    console.error('Failed to get status:', error);
  }
}

// Show notification
function showNotification(message, type) {
  // Create a simple notification in the status area
  const originalText = statusText.textContent;
  statusText.textContent = message;
  
  // Reset after 3 seconds
  setTimeout(() => {
    if (statusText.textContent === message) {
      statusText.textContent = originalText;
    }
  }, 3000);
  
  if (currentSettings.enableLogging) {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// Advanced settings modal
function openAdvancedSettings() {
  advancedModal.classList.remove('hidden');
}

function closeAdvancedSettings() {
  advancedModal.classList.add('hidden');
}

function saveAdvancedSettings() {
  saveSettings();
  closeAdvancedSettings();
  showNotification('Settings saved', 'success');
}

function resetSettings() {
  currentSettings = {
    sourceLanguage: 'en-US',
    targetLanguage: 'hi',
    showOriginal: true,
    autoTranslate: true,
    confidence: 0.5,
    maxSubtitles: 20,
    enableLogging: false,
    saveHistory: true
  };
  
  updateSettingsUI();
  saveSettings();
  showNotification('Settings reset to defaults', 'info');
}

// Show help information
function showHelp() {
  const helpText = `
Real-time Subtitle Generator Help:

1. Click "Start Capture" to begin capturing captions from the current tab
2. Select source and target languages for translation
3. Subtitles will appear as an overlay on the webpage
4. Use Advanced Settings for fine-tuning

Requirements:
- Keep the tab active while capturing
- Ensure captions are enabled on the platform

Developed by The Sentinels Team.
  `;
  
  alert(helpText);
}

// Cleanup on popup close
window.addEventListener('beforeunload', function() {
  // Save any pending settings
  saveSettings();
});