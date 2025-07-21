// Platform detection
chrome.runtime.sendMessage({
  action: "updateCaption",
  platform: "Zoom",
  text: "Zoom meeting detected"
});

function getZoomIframe() {
  return document.getElementById("webclient");
}

function getZoomCaptions(iframe) {
  try {
    const captionElement = iframe.contentDocument.querySelector("#live-transcription-subtitle > span");
    if (captionElement && captionElement.innerText.trim()) {
      const captionText = captionElement.innerText.trim();
      const captionImageSrc = iframe.contentDocument.querySelector("#live-transcription-subtitle > img").src;
      const author = iframe.contentDocument.querySelector("[class=video-avatar__avatar-img][src='" + captionImageSrc + "']").alt;
      return [captionText, author];
    }
  } catch (e) {
    console.warn("Unable to access iframe contents:", e);
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

function startZoomPolling() {
  const iframe = getZoomIframe();
  if (!iframe) {
    console.warn("Zoom iframe not found.");
    return;
  }

  // Optimized polling
  let lastCaption = '';
  const POLL_INTERVAL = 300; // ms

  const intervalId = setInterval(async () => {
    const caption = getZoomCaptions(iframe);
    if (caption && caption.length && caption[0] && caption[0] !== lastCaption) {
      lastCaption = caption[0];
      await sendCaptionUpdate(caption, "Zoom");
    }
  }, POLL_INTERVAL);

  // Clean up when page changes
  window.addEventListener('beforeunload', () => {
    clearInterval(intervalId);
  });
}

window.addEventListener("load", () => {
  const interval = setInterval(() => {
    const iframe = getZoomIframe();
    if (iframe && iframe.contentDocument?.readyState === "complete") {
      clearInterval(interval);
      console.log("Zoom iframe ready. Starting polling.");
      startZoomPolling();
    }
  }, 300);
});
