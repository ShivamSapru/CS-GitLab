// Azure Translation Config
const AZURE_TRANSLATOR_KEY = "n3z6pzIHvSepLuVyLq7yRTIP/u0g5Ac/edNVJ0puhi9uAa/MmymQ4aIuCfjdWyLZN2qCCjSX5zBW+ASt3n2B5g==";
const AZURE_REGION = "uksouth";

// Translation cache to reduce API calls
const translationCache = new Map();

// Initialize extension storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    latestCaption: "Waiting for captions...",
    platform: "-",
    translationEnabled: false,
    targetLanguage: "es",
    lastUpdated: 0
  });
});

// Unified message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "updateCaption":
      handleCaptionUpdate(request, sendResponse);
      break;
    case "translateCaption":
      handleTranslationRequest(request, sendResponse);
      break;
    case "getSettings":
      handleGetSettings(sendResponse);
      break;
    default:
      console.warn("Unknown action:", request.action);
  }
  return true; // Required for async responses
});

async function handleCaptionUpdate(request, sendResponse) {
  const settings = await chrome.storage.local.get(['translationEnabled', 'targetLanguage']);
  
  await chrome.storage.local.set({
    originalText: request.text,
    platform: request.platform || "Unknown",
    lastUpdated: Date.now()
  });

  if (settings.translationEnabled) {
    const translation = await translateText(request.text, settings.targetLanguage);
    await chrome.storage.local.set({ translatedText: translation });
  }

  sendResponse({ status: "success" });
}

async function handleTranslationRequest(request, sendResponse) {
  try {
    const translated = await translateText(request.text, request.targetLang);
    await chrome.storage.local.set({
      translatedText: translated,
      lastTranslation: Date.now()
    });
    sendResponse({ translatedText: translated });
  } catch (error) {
    console.error("Translation failed:", error);
    sendResponse({ error: error.message });
  }
}

async function handleGetSettings(sendResponse) {
  const settings = await chrome.storage.local.get([
    'translationEnabled', 
    'targetLanguage'
  ]);
  sendResponse(settings);
}

async function translateText(text, targetLang) {
  if (!text || !targetLang) return text;
  
  const cacheKey = `${text}-${targetLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const endpoint = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${targetLang}`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
      'Ocp-Apim-Subscription-Region': AZURE_REGION
    },
    body: JSON.stringify([{ Text: text }])
  });

  if (!response.ok) {
    throw new Error(`Azure API error: ${response.status}`);
  }

  const data = await response.json();
  const translatedText = data[0].translations[0].text;
  translationCache.set(cacheKey, translatedText);
  return translatedText;
}

// Test Azure connection on startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    const test = await translateText("test", "es");
    console.log("Azure connection test successful:", test);
  } catch (error) {
    console.error("Azure connection failed:", error);
  }
});
