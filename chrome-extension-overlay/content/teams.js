// teams.js - Microsoft Teams caption scraper
console.log("Teams caption scraper loaded");

initTeamsCaptions();

async function initTeamsCaptions() {
  console.log("Initializing Teams caption detection...");
  
  await sendCaptionUpdate("Teams detected - waiting for captions...", "Teams");

  // Teams caption detection with live chat selectors
  function getCurrentCaptions() {
    const selectors = [
      '[data-tid="closed-captions-text"]',
      '.ui-chat__message__content',
      '.closed-caption-container .text',
      '.live-captions .caption-text',
      '[data-tid="live-captions"] .text-content'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        const text = Array.from(elements)
          .map(el => el.textContent.trim())
          .filter(text => text.length > 0)
          .slice(-1)[0];
        if (text) {
          console.log("Teams: Found caption with selector:", selector, "->", text);
          return text;
        }
      }
    }
    return null;
  }

  // Main caption monitoring loop  
  let lastCaption = '';
  const POLL_INTERVAL = 500;
  
  console.log("Starting Teams caption monitoring loop...");
  
  const intervalId = setInterval(async () => {
    try {
      const caption = getCurrentCaptions();
      if (caption && caption !== lastCaption && caption.length > 2) {
        console.log("Teams: New caption detected:", caption);
        lastCaption = caption;
        await sendCaptionUpdate(caption, "Teams");
      }
    } catch (error) {
      console.error("Teams: Error in caption monitoring:", error);
    }
  }, POLL_INTERVAL);

  window.addEventListener('beforeunload', () => {
    console.log("Teams: Cleaning up caption monitoring");
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
      console.warn("Teams: No response from background");
    } else {
      console.log("Teams: Caption sent successfully");
    }
  } catch (error) {
    console.error("Teams: Failed to send caption update:", error);
  }
}

console.log("Teams: Caption scraper initialized");