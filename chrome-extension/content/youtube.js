// Initialize YouTube caption detection
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
      '.ytp-caption-window-container span' // Fallback 2
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        return Array.from(elements)
          .map(el => el.textContent.trim())
          .join(' ');
      }
    }
    return null;
  }

  // Main caption monitoring loop
  let lastCaption = '';
  const POLL_INTERVAL = 300; // ms
  
  const intervalId = setInterval(async () => {
    const caption = getCurrentCaptions();
    if (caption && caption !== lastCaption) {
      lastCaption = caption;
      await sendCaptionUpdate(caption, "YouTube");
    }
  }, POLL_INTERVAL);

  // Clean up when page changes
  window.addEventListener('beforeunload', () => {
    clearInterval(intervalId);
  });
}

async function sendCaptionUpdate(text, platform) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "updateCaption",
      text: text,
      platform: platform
    });
    
    if (!response?.status) {
      console.warn("No response from background");
    }
  } catch (error) {
    console.error("Failed to send caption update:", error);
  }
}
