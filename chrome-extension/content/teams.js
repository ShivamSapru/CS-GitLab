// Platform detection
chrome.runtime.sendMessage({
  action: "updateCaption",
  platform: "Teams",
  text: "Teams meeting detected"
});

const pollingIntervalMs = 500;  // poll every 500ms

function getTeamsCaptions() {
  const captionElements = document.querySelectorAll('[data-tid="closed-caption-text"]');
  const captionAuthors = document.querySelectorAll('[data-tid="author"]');
  if (captionElements && captionElements.length > 0) {
      const captionText = captionElements[captionElements.length - 1].innerText.trim();
      const author = captionAuthors[captionAuthors.length - 1].innerText.trim();
      return [captionText, author];
  }
  return null;
}

async function sendCaptionUpdate(text, platform) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "updateCaption",
      text: text[0],
      platform: platform,
      author: text[1]
    });
    
    if (!response?.status) {
      console.warn("No response from background");
    }
  } catch (error) {
    console.error("Failed to send caption update:", error);
  }
}

function startTeamsCaptionPolling() {
  // Optimized polling
  let lastCaption = '';
  const POLL_INTERVAL = 300; // ms

  const intervalId = setInterval(async () => {
    const caption = getTeamsCaptions();
    if (caption && caption.length && caption[0] && caption[0] !== lastCaption) {
      lastCaption = caption[0];
      await sendCaptionUpdate(caption, "Teams");
    }
  }, POLL_INTERVAL);

  // Clean up when page changes
  window.addEventListener('beforeunload', () => {
    clearInterval(intervalId);
  });
}

window.addEventListener("load", () => {
  console.log("Microsoft Teams detected: Starting caption polling");
  startTeamsCaptionPolling();
});
