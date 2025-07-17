// Platform detection
chrome.runtime.sendMessage({
  action: "updateCaption",
  platform: "Zoom",
  text: "Zoom meeting detected"
});

// MutationObserver for captions
const observer = new MutationObserver((mutations) => {
  const caption = document.querySelector('[aria-live="polite"][role="log"], .closed-caption-container');
  if (caption?.textContent?.trim()) {
    chrome.runtime.sendMessage({
      action: "updateCaption",
      platform: "Zoom",
      text: caption.textContent.trim()
    });
  }
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

// Fallback polling for older Zoom versions
setInterval(() => {
  const caption = document.querySelector('.zoom-caption-text');
  if (caption?.textContent?.trim()) {
    chrome.runtime.sendMessage({
      action: "updateCaption",
      platform: "Zoom",
      text: caption.textContent.trim()
    });
  }
}, 500);