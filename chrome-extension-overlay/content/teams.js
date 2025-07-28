// teams.js - Microsoft Teams caption scraper
console.log("Teams caption scraper loaded (Improved Version)");

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
      console.warn("Teams: No response from background or status missing.");
    } else {
      console.log("Teams: Caption sent successfully:", text);
    }
  } catch (error) {
    console.error("Teams: Failed to send caption update:", error);
  }
}

// Function to get the current live captions and author from Teams DOM
function getTeamsCaptions() {
  const captionElements = document.querySelectorAll('[data-tid="closed-caption-text"]');
  const captionAuthors = document.querySelectorAll('[data-tid="author"]');

  if (captionElements && captionElements.length > 0) {
    // Get the text from the very last caption element
    const captionText = captionElements[captionElements.length - 1].innerText.trim();

    // Get the author from the very last author element
    // Ensure author element exists before trying to get its text
    const author = captionAuthors && captionAuthors.length > 0 ?
                   captionAuthors[captionAuthors.length - 1].innerText.trim() :
                   "Unknown Speaker"; // Default if author not found

    if (captionText) {
      return { text: captionText, author: author };
    }
  } else {
    return { text: " ", author: "" };
  }
  return null; // Return null if no valid caption is found
}

// Main function to start polling for Teams captions
function startTeamsCaptionPolling() {
  let lastCaptionText = ''; // Keep track of the last captured text
  const POLL_INTERVAL = 100; // Poll every 300ms for responsiveness

  console.log("Teams: Starting caption monitoring loop...");

  const intervalId = setInterval(async () => {
    try {
      const captionData = getTeamsCaptions(); // Get both text and author

      if (captionData && captionData.text && captionData.text !== lastCaptionText) {
        console.log("Teams: New caption detected:", captionData.text, "by", captionData.author);
        lastCaptionText = captionData.text;
        await sendCaptionUpdate(captionData.text, "Teams", captionData.author);
      }
    } catch (error) {
      console.error("Teams: Error in caption monitoring loop:", error);
    }
  }, POLL_INTERVAL);

  // Clean up the interval when the page is unloaded
  window.addEventListener('beforeunload', () => {
    console.log("Teams: Cleaning up caption monitoring interval.");
    clearInterval(intervalId);
  });
}

// Start the polling when the entire page has loaded
window.addEventListener("load", () => {
  console.log("Microsoft Teams page loaded: Attempting to start caption polling.");
  // Send an initial message to the background script to indicate Teams is detected
  chrome.runtime.sendMessage({
    action: "updateCaption",
    platform: "Teams",
    text: "Teams meeting detected - waiting for captions..."
  });
  startTeamsCaptionPolling();
});

console.log("Teams: Caption scraper script finished execution.");
