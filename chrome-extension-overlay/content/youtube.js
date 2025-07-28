// youtube.js - YouTube caption scraper
console.log("YouTube caption scraper loaded");

initYouTubeCaptions();

async function initYouTubeCaptions() {
  console.log("Initializing YouTube caption detection...");
  
  // Notify extension of platform detection
  await sendCaptionUpdate("YouTube detected - waiting for captions...", "YouTube");

  // Modern caption detection with multiple fallback selectors
  function getCurrentCaptions() {
    const selectors = [
      '.ytp-caption-segment', // Standard YouTube
      '.caption-visual-line', // Newer versions
      '#caption-window .caption-text', // Fallback 1
      '.ytp-caption-window-container span', // Fallback 2
      '.ytp-caption-window-bottom span', // Additional fallback
      '.caption-window .caption-text' // Legacy selector
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        const text = Array.from(elements)
          .map(el => el.textContent.trim())
          .filter(text => text.length > 0)
          .join('<br />');
        if (text) {
          console.log("YouTube: Found caption with selector:", selector, "->", text);
          return text;
        }
      }
    }
    return null;
  }

  // Main caption monitoring loop
  let lastCaption = '';
  const POLL_INTERVAL = 300; // ms - fast polling for real-time
  
  console.log("Starting caption monitoring loop...");
  
  const intervalId = setInterval(async () => {
    try {
      const caption = getCurrentCaptions();
      if (caption && caption !== lastCaption && caption.length > 2) {
        console.log("YouTube: New caption detected:", caption);
        lastCaption = caption;
        await sendCaptionUpdate(caption, "YouTube");
      }
    } catch (error) {
      console.error("YouTube: Error in caption monitoring:", error);
    }
  }, POLL_INTERVAL);

  // Clean up when page changes
  window.addEventListener('beforeunload', () => {
    console.log("YouTube: Cleaning up caption monitoring");
    clearInterval(intervalId);
  });
  
  // Also clean up when video changes
  let currentVideoId = getVideoId();
  setInterval(() => {
    const newVideoId = getVideoId();
    if (newVideoId !== currentVideoId) {
      console.log("YouTube: Video changed, resetting caption tracking");
      currentVideoId = newVideoId;
      lastCaption = '';
    }
  }, 2000);
}

// Get current video ID for tracking video changes
function getVideoId() {
  const url = new URL(window.location.href);
  return url.searchParams.get('v');
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
      console.warn("YouTube: No response from background");
    } else {
      console.log("YouTube: Caption sent successfully");
    }
  } catch (error) {
    console.error("YouTube: Failed to send caption update:", error);
  }
}

console.log("YouTube: Caption scraper initialized");
