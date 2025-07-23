// Platform detection
chrome.runtime.sendMessage({
  action: "updateCaption",
  platform: "YouTube",
  text: "YouTube website detected"
});

const selectors = [
  '.ytp-caption-segment', // Standard YouTube
  // '.caption-visual-line', // Newer versions
  // '#caption-window .caption-text', // Fallback 1
  // '.ytp-caption-window-container span' // Fallback 2
];

async function sendCaptionUpdate(el, text, platform) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "updateCaption",
      text: text,
      platform: platform
    });

    if (!response?.status) {
      console.warn("No response from background");
    } else if (response.translationEnabled) {
      el.textContent = response.translatedText;
    } else {
      el.textContent = text;
    }
  } catch (error) {
    console.error("Failed to send caption update:", error);
  }
}

// function getCurrentCaptions() {
//   for (const selector of selectors) {
//     const elements = document.querySelectorAll(selector);
//     if (elements && elements.length > 0) {
//       for (const el of elements) {
//         return el;
//       }
//       // return Array.from(elements)
//       //   .map(el => el.textContent.trim())
//       //   .join('<br />');
//     }
//   }
//   return null;
// }

function initYouTubeCaptions() {
  console.log("YouTube caption detection initialized");

  let lastCaption = '';
  const POLL_INTERVAL = 300;

  const intervalId = setInterval(async () => {
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        for (const el of elements) {
          const captionText = el.textContent.trim();
          if (captionText && captionText !== lastCaption) {
            lastCaption = captionText;
            await sendCaptionUpdate(el, captionText, "YouTube");
          }
        }
      }
    }
  }, POLL_INTERVAL);

  // Clean up when page changes
  window.addEventListener('beforeunload', () => {
    clearInterval(intervalId);
  });
}

function hasYouTubeVideoPlayer() {
  return document.querySelector("ytd-player#ytd-player") !== null;
}

// Main entry point
(function () {
  window.addEventListener("load", () => {
    const POLL_INTERVAL = 300;
    const interval = setInterval(() => {
      if (hasYouTubeVideoPlayer()) {
        clearInterval(interval);
        initYouTubeCaptions();
      }
    }, POLL_INTERVAL);
  });
})();
