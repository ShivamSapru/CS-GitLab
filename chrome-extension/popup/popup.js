// popup.js - Extension popup functionality

// DOM elements
let startBtn, stopBtn, statusDot, statusText;
let targetLanguageInput, showOriginalCheckbox, censorProfanityCheckbox;
let languageSearch, languageDropdown, searchableSelect;
let themeToggle, themeIcon;

// State variables
let isCapturing = false;
let currentSettings = {
  targetLanguage: 'en',
  showOriginal: false,
  censorProfanity: true,
  theme: 'light'
};

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
  initializeElements();
  loadSettings(); // Load saved settings first
  bindEvents();
  updateStatus(); // Check current capture status
  // Wait for settings to load before populating languages
  setTimeout(() => {
    fetchAndPopulateLanguages(currentSettings);
    initializeSearchableSelect();
  }, 100);
});

// Initialize DOM elements
function initializeElements() {
  startBtn = document.getElementById('startBtn');
  stopBtn = document.getElementById('stopBtn');
  statusDot = document.getElementById('statusDot');
  statusText = document.getElementById('statusText');
  
  targetLanguageInput = document.getElementById('targetLanguage');
  showOriginalCheckbox = document.getElementById('showOriginal');
  censorProfanityCheckbox = document.getElementById('censorProfanity');
  
  languageSearch = document.getElementById('languageSearch');
  languageDropdown = document.getElementById('languageDropdown');
  searchableSelect = document.querySelector('.searchable-select');
  
  themeToggle = document.getElementById('themeToggle');
  themeIcon = document.querySelector('.theme-icon');
}

// Initialize theme
function initializeTheme() {
  const savedTheme = currentSettings.theme || 'light';
  setTheme(savedTheme);
}

// Set theme
function setTheme(theme) {
  currentSettings.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  
  // Update theme icon
  if (themeIcon) {
    themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
  }
  
  saveSettings();
}

// Toggle theme
function toggleTheme() {
  const currentTheme = currentSettings.theme || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

async function fetchAndPopulateLanguages(currentSettings) {
  try {
    const AZURE_TRANSLATOR_LANGUAGES = "https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation";
    const response = await fetch(AZURE_TRANSLATOR_LANGUAGES);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const translations = data.translation;

    // Sort by language name
    const sortedLanguages = Object.entries(translations).sort(([, a], [, b]) =>
      a.name.localeCompare(b.name)
    );

    // Clear existing options
    languageDropdown.innerHTML = "";
    
    // Add "No Translation" option first
    const noTranslationDiv = document.createElement("div");
    noTranslationDiv.className = "language-option";
    noTranslationDiv.setAttribute("data-value", "none");
    noTranslationDiv.textContent = "🚫 No Translation";
    languageDropdown.appendChild(noTranslationDiv);

    // Populate new sorted options
    for (const [code, info] of sortedLanguages) {
      const div = document.createElement("div");
      div.className = "language-option";
      div.setAttribute("data-value", code);
      div.textContent = `${info.name}`;
      languageDropdown.appendChild(div);
    }

    // CRITICAL FIX: Set the saved language selection without overriding
    const savedLanguage = currentSettings.targetLanguage;
    const savedLanguageOption = languageDropdown.querySelector(`[data-value="${savedLanguage}"]`);
    if (savedLanguageOption) {
      // Don't call selectLanguage which triggers onSettingChange
      // Just update the UI to reflect the saved choice
      languageSearch.value = savedLanguageOption.textContent;
      languageSearch.setAttribute('data-value', savedLanguage);
      targetLanguageInput.value = savedLanguage;
      
      // Clear previous selection visual state
      const previousSelected = languageDropdown.querySelector('.language-option.selected');
      if (previousSelected) {
        previousSelected.classList.remove('selected');
        previousSelected.removeAttribute('data-selected');
      }
      
      // Set new selection visual state
      savedLanguageOption.classList.add('selected');
      savedLanguageOption.setAttribute('data-selected', 'true');
    }

  } catch (error) {
    console.error("Failed to load language options:", error);
    // Create a fallback with saved language preserved
    const savedLanguage = currentSettings.targetLanguage;
    languageDropdown.innerHTML = `
      <div class="language-option" data-value="none">🚫 No Translation</div>
      <div class="language-option" data-value="en">English</div>
      <div class="language-option" data-value="hi">Hindi</div>
    `;
    
    // Set saved language in fallback
    const fallbackOption = languageDropdown.querySelector(`[data-value="${savedLanguage}"]`);
    if (fallbackOption) {
      languageSearch.value = fallbackOption.textContent;
      targetLanguageInput.value = savedLanguage;
    }
  }
}

// Initialize searchable select functionality
function initializeSearchableSelect() {
  // Filter options based on search
  languageSearch.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const options = languageDropdown.querySelectorAll('.language-option');
    
    options.forEach(option => {
      const text = option.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        option.classList.remove('hidden');
      } else {
        option.classList.add('hidden');
      }
    });
    
    // Show dropdown if there's input
    if (searchTerm) {
      showDropdown();
    }
  });
  
  // Show dropdown on focus
  languageSearch.addEventListener('focus', function() {
    showDropdown();
  });
  
  // Handle option selection
  languageDropdown.addEventListener('click', function(e) {
    if (e.target.classList.contains('language-option')) {
      selectLanguage(e.target);
    }
  });
  
  // Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!searchableSelect.contains(e.target)) {
      hideDropdown();
    }
  });
  
  // Handle keyboard navigation
  languageSearch.addEventListener('keydown', function(e) {
    const visibleOptions = Array.from(languageDropdown.querySelectorAll('.language-option:not(.hidden)'));
    const currentHighlighted = languageDropdown.querySelector('.language-option.highlighted');
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightNextOption(visibleOptions, currentHighlighted, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightNextOption(visibleOptions, currentHighlighted, -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentHighlighted) {
        selectLanguage(currentHighlighted);
      }
    } else if (e.key === 'Escape') {
      hideDropdown();
    }
  });
}

function showDropdown() {
  languageDropdown.classList.remove('hidden');
  searchableSelect.classList.add('open');
}

function hideDropdown() {
  languageDropdown.classList.add('hidden');
  searchableSelect.classList.remove('open');
  
  // Clear any highlights
  const highlighted = languageDropdown.querySelector('.language-option.highlighted');
  if (highlighted) {
    highlighted.classList.remove('highlighted');
  }
}

function selectLanguage(option) {
  // Clear previous selection
  const previousSelected = languageDropdown.querySelector('.language-option.selected');
  if (previousSelected) {
    previousSelected.classList.remove('selected');
    previousSelected.removeAttribute('data-selected');
  }
  
  // Set new selection
  option.classList.add('selected');
  option.setAttribute('data-selected', 'true');
  
  // Update input values
  languageSearch.value = option.textContent;
  languageSearch.setAttribute('data-value', option.dataset.value);
  targetLanguageInput.value = option.dataset.value;
  
  // Hide dropdown
  hideDropdown();
  
  // Trigger settings change
  onSettingChange();
}

function highlightNextOption(visibleOptions, currentHighlighted, direction) {
  // Clear current highlight
  if (currentHighlighted) {
    currentHighlighted.classList.remove('highlighted');
  }
  
  if (visibleOptions.length === 0) return;
  
  let nextIndex = 0;
  
  if (currentHighlighted) {
    const currentIndex = visibleOptions.indexOf(currentHighlighted);
    nextIndex = currentIndex + direction;
    
    if (nextIndex < 0) {
      nextIndex = visibleOptions.length - 1;
    } else if (nextIndex >= visibleOptions.length) {
      nextIndex = 0;
    }
  }
  
  visibleOptions[nextIndex].classList.add('highlighted');
  visibleOptions[nextIndex].scrollIntoView({ block: 'nearest' });
}

// Bind event listeners
function bindEvents() {
  // Control buttons
  startBtn.addEventListener('click', startCapture);
  stopBtn.addEventListener('click', stopCapture);
  
  // Settings
  showOriginalCheckbox.addEventListener('change', onSettingChange);
  censorProfanityCheckbox.addEventListener('change', onSettingChange);
  
  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);
  
  // Help button
  document.getElementById('helpBtn').addEventListener('click', showHelp);
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
}

// Start capture
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
      showNotification('Started capturing captions', 'success');
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

// Stop capture
async function stopCapture() {
  try {
    const response = await sendMessageToBackground({
      type: 'STOP_CAPTURE'
    });
    
    if (response.success) {
      isCapturing = false;
      updateUI(false, 'stopped');
      showNotification('Stopped capturing captions', 'info');
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
      statusText.textContent = 'Capturing captions';
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
  currentSettings.targetLanguage = targetLanguageInput.value;
  currentSettings.showOriginal = showOriginalCheckbox.checked;
  currentSettings.censorProfanity = censorProfanityCheckbox.checked;
  
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
    
    // Update UI after settings are loaded but don't trigger save
    updateSettingsUIWithoutSave();
    initializeTheme();
  });
}

// Save settings to storage
function saveSettings() {
  chrome.storage.sync.set({
    subtitleSettings: currentSettings
  });
}

// Update settings UI with current values (without triggering save)
function updateSettingsUIWithoutSave() {
  if (showOriginalCheckbox) {
    showOriginalCheckbox.checked = currentSettings.showOriginal;
  }
  if (censorProfanityCheckbox) {
    censorProfanityCheckbox.checked = currentSettings.censorProfanity;
  }
  if (targetLanguageInput) {
    targetLanguageInput.value = currentSettings.targetLanguage;
  }
}

// Update settings UI with current values
function updateSettingsUI() {
  updateSettingsUIWithoutSave();
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
    isCapturing = response.isCapturing || false;
    updateUI(isCapturing, isCapturing ? 'active' : 'ready');
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
}

// Show help information
function showHelp() {
  const helpText = `
Subtitle Generator Help:

1. Click "Start Capture" to begin capturing captions from the current tab
2. Search and select target language for translation (100+ languages supported)
3. Toggle "Show original text" to control display
4. Subtitles will appear as an overlay on the webpage

Supported Platforms:
- YouTube (with captions enabled)
- Microsoft Teams (with live captions)
- Zoom (with live transcription)

Requirements:
- Keep the tab active while capturing
- Ensure captions are enabled on the platform

Developed by The Sentinels Team.
  `;
  
  alert(helpText);
}

// Cleanup on popup close
window.addEventListener('beforeunload', function() {
  saveSettings();
});