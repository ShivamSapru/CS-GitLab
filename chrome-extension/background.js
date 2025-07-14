chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "translateCaption") {
    translateText(msg.text).then((translated) => {
      chrome.runtime.sendMessage({ action: "translatedCaption", text: translated });
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "YOUTUBE_VIDEO_FOUND") {
        console.log("Message received from content script: Video detected on", sender.tab?.url);
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "captionsDetected") {
    console.log("Caption received:", message.text);
    chrome.storage.local.set({ 
        latestCaption: message.text 
    });
  }
});
