// Credentials should be injected via a secure runtime
const AZURE_TRANSLATOR_KEY = "6oUUQgiY2wIF1nqaNO85QHpQgSDEsA19WDxfStM2mCNUcyyNNPH0JQQJ99BFACULyCpXJ3w3AAAbACOGlrxz";
const AZURE_TRANSLATOR_REGION = "global";

// Azure Translation API function
async function translateText(text, to_lang) {
  const endpoint = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${to_lang}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_TRANSLATOR_REGION,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([{ Text: text }])
    });

    const result = await response.json();
    return result[0]?.translations[0]?.text || "[Translation failed]";
  } catch (err) {
    console.error("Translation error:", err);
    return "[Translation error]";
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "YOUTUBE_VIDEO_FOUND") {
        console.log("Message received from content script: Video detected on", sender.tab?.url);
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "captionsDetected") {
    const author = message.author?.trim() || "";
    const captionAuthor = author ? `${author}: ` : "";
    const originalText = message.text?.trim() || "";
    const targetLang = message.to_lang || "en";

    const captionText = captionAuthor + originalText;
    console.log("Caption received:", captionText);

    // Save original caption (optional)
    chrome.storage.local.set({ latestCaption: captionText });

    // Translate and store the translated caption
    translateText(originalText, targetLang)
      .then((translated) => {
        const translatedCaption = captionAuthor + translated;
        console.log("Translation received:", translatedCaption);

        // Save translated caption (optional)
        chrome.storage.local.set({ latestTranslatedCaption: translatedCaption });
      })
      .catch((error) => {
        console.error("Translation error:", error);
      });
  }
});
