document.addEventListener('DOMContentLoaded', initializePopup);

async function initializePopup() {
  // DOM Elements
  const languageSelect = document.getElementById('language');
  const toggleBtn = document.getElementById('toggle');
  
  // Load initial settings
  const settings = await getSettings();
  updateUI(settings);
  fetchAndPopulateLanguages(settings);
  
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
    captionEl.innerHTML = settings.translatedText;
  } else {
    captionEl.innerHTML = settings.originalText || 'No captions detected';
  }
  
  document.getElementById('toggle').textContent = 
    settings.translationEnabled ? 'Disable Translation' : 'Enable Translation';
  
  if (settings.targetLanguage) {
    document.getElementById('language').value = settings.targetLanguage;
  }
}

async function fetchAndPopulateLanguages(settings) {
  try {
    const AZURE_TRANSLATOR_LANGUAGES = "https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation";
    const response = await fetch(AZURE_TRANSLATOR_LANGUAGES);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const translations = data.translation;

    // Clear existing options
    const languageSelect = document.getElementById('language');
    languageSelect.innerHTML = "";

    // Populate new options
    for (const [code, info] of Object.entries(translations)) {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = `${info.name}`;
      languageSelect.appendChild(option);
    }

    // Optionally, set a default selected language
    languageSelect.value = settings.targetLanguage || "en";
  } catch (error) {
    console.error("Failed to load language options:", error);
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
      targetLang: settings.targetLanguage || 'en'
    });
    
    if (translation?.translatedText) {
      document.getElementById('caption').innerHTML = translation.translatedText;
    }
  } else if (!newState && settings.originalText) {
    document.getElementById('caption').innerHTML = settings.originalText;
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
      document.getElementById('caption').innerHTML = translation.translatedText;
    }
  }
}

function handleStorageChanges(changes) {
  const captionEl = document.getElementById('caption');
  
  if (changes.translatedText) {
    captionEl.innerHTML = changes.translatedText.newValue;
  } 
  else if (changes.originalText) {
    chrome.storage.local.get(['translationEnabled'], (result) => {
      captionEl.innerHTML = result.translationEnabled 
        ? "(Translating...)" 
        : changes.originalText.newValue;
    });
  }
  
  if (changes.platform) {
    document.getElementById('platform').textContent = changes.platform.newValue;
  }
}
