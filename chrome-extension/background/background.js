import { CONFIG } from './config.js';

// Azure Translation Config
const AZURE_TRANSLATOR_KEY = CONFIG.AZURE_TRANSLATOR_KEY;
const AZURE_TRANSLATOR_REGION = CONFIG.AZURE_TRANSLATOR_REGION;
const AZURE_TRANSLATOR_ENDPOINT = CONFIG.AZURE_TRANSLATOR_ENDPOINT;

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
  const author = request.author?.trim() || "";
  const captionAuthor = author ? `${author}: ` : "";
  const captionText = captionAuthor + request.text;
  
  await chrome.storage.local.set({
    originalText: captionText,
    platform: request.platform || "Unknown",
    lastUpdated: Date.now()
  });

  let translatedCaption = "";
  if (settings.translationEnabled) {
    const translation = await translateText(request.text, settings.targetLanguage);
    translatedCaption = captionAuthor + translation;
    await chrome.storage.local.set({ translatedText: translatedCaption });
  }

  sendResponse({
    status: "success", 
    translatedText: translatedCaption,
    translationEnabled: settings.translationEnabled
  });
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

  const endpoint = `${AZURE_TRANSLATOR_ENDPOINT}/translate?api-version=3.0&to=${targetLang}`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
      'Ocp-Apim-Subscription-Region': AZURE_TRANSLATOR_REGION
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
