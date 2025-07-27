// zoom.js - Zoom caption scraper
console.log("Zoom caption scraper loaded (Improved Version)");

// Function to send caption updates to the background script
async function sendCaptionUpdate(text, platform, author = null) {
  try {
    const message = {
      action: "updateCaption",
      text: text,
      platform: platform,
      timestamp: Date.now()
    };
    if (author) {
      message.author = author; // Add author
    }

    const response = await chrome.runtime.sendMessage(message);

    if (!response?.status) {
      console.warn("Zoom: No response from background or status missing.");
    } else {
      console.log("Zoom: Caption sent successfully:", text);
    }
  } catch (error) {
    console.error("Zoom: Failed to send caption update:", error);
  }
}

// Function to get the current live captions and author from Zoom DOM
function getZoomCaptions(iframe) {
  try {
    const captionElement = iframe.contentDocument.querySelector("#live-transcription-subtitle > span");
    if (captionElement && captionElement.innerText.trim()) {
      // Get the text from the very last caption element
      const captionText = captionElement.innerText.trim();

      // Get the author from the very last author element
      // Ensure author element exists before trying to get its text
      const captionImageSrc = iframe.contentDocument.querySelector("#live-transcription-subtitle > img").src;
      const captionAuthor = iframe.contentDocument.querySelector("[class=video-avatar__avatar-img][src='" + captionImageSrc + "']").alt;
      const author =  captionAuthor && captionAuthor.length > 0 ?
                      captionAuthor.trim() :
                      "Unknown Speaker"; // Default if author not found
      if (captionText) {
        return { text: captionText, author: author };
      }
    }
  } catch (e) {
    console.warn("Unable to access iframe contents:", e);
  }
  return null; // Return null if no valid caption is found
}

// Main function to start polling for Zoom captions
function startZoomCaptionPolling() {
  const iframe = getZoomIframe();
  if (!iframe) {
    console.warn("Zoom iframe not found.");
    return;
  }

  let lastCaptionText = ''; // Keep track of the last captured text
  const POLL_INTERVAL = 300; // Poll every 300ms for responsiveness

  console.log("Zoom: Starting caption monitoring loop...");

  const intervalId = setInterval(async () => {
    try {
      const captionData = getZoomCaptions(iframe); // Get both text and author

      if (captionData && captionData.text && captionData.text !== lastCaptionText && captionData.text.length > 2) {
        console.log("Zoom: New caption detected:", captionData.text, "by", captionData.author);
        lastCaptionText = captionData.text;
        await sendCaptionUpdate(captionData.text, "Zoom", captionData.author);
      }
    } catch (error) {
      console.error("Zoom: Error in caption monitoring loop:", error);
    }
  }, POLL_INTERVAL);

  // Clean up the interval when the page is unloaded
  window.addEventListener('beforeunload', () => {
    console.log("Zoom: Cleaning up caption monitoring interval.");
    clearInterval(intervalId);
  });
}

function getZoomIframe() {
  return document.getElementById("webclient");
}

// Start the polling when the entire page has loaded
window.addEventListener("load", () => {
  console.log("Zoom page loaded: Attempting to start caption polling.");
  // Send an initial message to the background script to indicate Zoom is detected
  chrome.runtime.sendMessage({
    action: "updateCaption",
    platform: "Zoom",
    text: "Zoom meeting detected - waiting for captions..."
  });
  const interval = setInterval(() => {
    const iframe = getZoomIframe();
    if (iframe && iframe.contentDocument?.readyState === "complete") {
      clearInterval(interval);
      console.log("Zoom iframe ready. Starting polling.");
      startZoomCaptionPolling();
    }
  }, 300);
});

console.log("Zoom: Caption scraper script finished execution.");
