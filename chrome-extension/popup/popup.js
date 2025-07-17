document.addEventListener('DOMContentLoaded', initializePopup);

async function initializePopup() {
  // DOM Elements
  const platformEl = document.getElementById('platform');
  const captionEl = document.getElementById('caption');
  const languageSelect = document.getElementById('language');
  const toggleBtn = document.getElementById('toggle');
  
  // Load initial settings
  const settings = await getSettings();
  updateUI(settings);
  
  // Set up event listeners
  toggleBtn.addEventListener('click', toggleTranslation);
  languageSelect.addEventListener('change', updateLanguage);
  
  // Listen for updates
  chrome.storage.local.onChanged.addListener(handleStorageChanges);
}

async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get([
      'platform',
      'translatedText',
      'originalText',
      'translationEnabled',
      'targetLanguage'
    ], resolve);
  });
}

function updateUI(settings) {
  document.getElementById('platform').textContent = settings.platform || '-';
  
  const captionEl = document.getElementById('caption');
  if (settings.translationEnabled && settings.translatedText) {
    captionEl.textContent = settings.translatedText;
  } else {
    captionEl.textContent = settings.originalText || 'No captions detected';
  }
  
  document.getElementById('toggle').textContent = 
    settings.translationEnabled ? 'Disable Translation' : 'Enable Translation';
  
  if (settings.targetLanguage) {
    document.getElementById('language').value = settings.targetLanguage;
  }
}

async function toggleTranslation() {
  const settings = await getSettings();
  const newState = !settings.translationEnabled;
  
  await chrome.storage.local.set({ 
    translationEnabled: newState 
  });
  
  // If enabling translation, force update
  if (newState && settings.originalText) {
    const translation = await chrome.runtime.sendMessage({
      action: "translateCaption",
      text: settings.originalText,
      targetLang: settings.targetLanguage || 'es'
    });
    
    if (translation?.translatedText) {
      document.getElementById('caption').textContent = translation.translatedText;
    }
  } else if (!newState && settings.originalText) {
    document.getElementById('caption').textContent = settings.originalText;
  }
  
  document.getElementById('toggle').textContent = 
    newState ? 'Disable Translation' : 'Enable Translation';
}

async function updateLanguage() {
  const newLang = document.getElementById('language').value;
  await chrome.storage.local.set({ targetLanguage: newLang });
  
  // If translation is active, retranslate current text
  const settings = await getSettings();
  if (settings.translationEnabled && settings.originalText) {
    const translation = await chrome.runtime.sendMessage({
      action: "translateCaption",
      text: settings.originalText,
      targetLang: newLang
    });
    
    if (translation?.translatedText) {
      document.getElementById('caption').textContent = translation.translatedText;
    }
  }
}

function handleStorageChanges(changes) {
  const captionEl = document.getElementById('caption');
  
  if (changes.translatedText) {
    captionEl.textContent = changes.translatedText.newValue;
  } 
  else if (changes.originalText) {
    chrome.storage.local.get(['translationEnabled'], (result) => {
      captionEl.textContent = result.translationEnabled 
        ? "(Translating...)" 
        : changes.originalText.newValue;
    });
  }
  
  if (changes.platform) {
    document.getElementById('platform').textContent = changes.platform.newValue;
  }
}
