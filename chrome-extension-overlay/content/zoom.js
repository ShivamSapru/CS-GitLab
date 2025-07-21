// zoom.js - Zoom caption scraper  
console.log("Zoom caption scraper loaded");

initZoomCaptions();

async function initZoomCaptions() {
  console.log("Initializing Zoom caption detection...");
  
  await sendCaptionUpdate("Zoom detected - waiting for captions...", "Zoom");

  // Zoom caption detection with live caption selectors
  function getCurrentCaptions() {
    const selectors = [
      '.closed-caption__text',
      '.live-transcription-text',
      '.caption-content .text',
      '[data-testid="live-transcription"] .text-content',
      '.zm-caption-container .caption-text'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        const text = Array.from(elements)
          .map(el => el.textContent.trim())
          .filter(text => text.length > 0)
          .slice(-1)[0];
        if (text) {
          console.log("Zoom: Found caption with selector:", selector, "->", text);
          return text;
        }
      }
    }
    return null;
  }

  // Main caption monitoring loop
  let lastCaption = '';
  const POLL_INTERVAL = 400;
  
  console.log("Starting Zoom caption monitoring loop...");
  
  const intervalId = setInterval(async () => {
    try {
      const caption = getCurrentCaptions();
      if (caption && caption !== lastCaption && caption.length > 2) {
        console.log("Zoom: New caption detected:", caption);
        lastCaption = caption;
        await sendCaptionUpdate(caption, "Zoom");
      }
    } catch (error) {
      console.error("Zoom: Error in caption monitoring:", error);
    }
  }, POLL_INTERVAL);

  window.addEventListener('beforeunload', () => {
    console.log("Zoom: Cleaning up caption monitoring");
    clearInterval(intervalId);
  });
}

async function sendCaptionUpdate(text, platform) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "updateCaption",
      text: text,
      platform: platform,
      timestamp: Date.now()
    });
    
    if (!response?.status) {
      console.warn("Zoom: No response from background");
    } else {
      console.log("Zoom: Caption sent successfully");
    }
  } catch (error) {
    console.error("Zoom: Failed to send caption update:", error);
  }
}

console.log("Zoom: Caption scraper initialized");