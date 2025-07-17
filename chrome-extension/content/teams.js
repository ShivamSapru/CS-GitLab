// Platform detection
chrome.runtime.sendMessage({
  action: "updateCaption",
  platform: "Teams",
  text: "Teams meeting detected"
});

// Reliable caption finder
function getTeamsCaption() {
  // Try multiple selectors for different Teams versions
  const selectors = [
    '[data-tid="closed-caption-text"]',
    '[class*="transcript-text"]',
    '[class*="caption-text"]',
    '[aria-label*="caption"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element?.textContent?.trim()) {
      return element.textContent.trim();
    }
  }
  return null;
}

// Optimized polling
let lastCaption = "";
setInterval(() => {
  const caption = getTeamsCaption();
  if (caption && caption !== lastCaption) {
    lastCaption = caption;
    chrome.runtime.sendMessage({
      action: "updateCaption",
      platform: "Teams",
      text: caption
    });
  }
}, 400);