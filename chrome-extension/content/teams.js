// teams.js - Microsoft Teams caption scraper
console.log("Teams caption scraper loaded");

// Global variables for monitoring state
let isMonitoring = false;
let monitoringInterval = null;
let lastCaptionText = '';

// Initialize Teams captions (but don't start monitoring yet)
initTeamsCaptions();

function initTeamsCaptions() {
  console.log("Teams: Initialized and waiting for user action - NO AUTO-LOADING");
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Teams: Received message:', message.type);
    
    switch (message.type) {
      case 'CAPTURE_STARTED':
        startCaptionMonitoring();
        sendResponse({ success: true });
        break;
        
      case 'CAPTURE_STOPPED':
        stopCaptionMonitoring();
        sendResponse({ success: true });
        break;
        
      case 'CAPTURE_STATUS':
        if (message.isCapturing) {
          startCaptionMonitoring();
        } else {
          stopCaptionMonitoring();
        }
        sendResponse({ success: true });
        break;
        
      case 'SETTINGS_UPDATED':
        console.log('Teams: Settings updated:', message.settings);
        sendResponse({ success: true });
        break;
    }
  });

  // DO NOT send any initial detection messages
  // DO NOT start monitoring automatically
  // Wait for explicit user action via CAPTURE_STARTED message
}

// Send caption updates to the background script
async function sendCaptionUpdate(text, platform, author = null) {
  try {
    const message = {
      action: "updateCaption",
      text: text,
      platform: platform,
      timestamp: Date.now()
    };
    if (author) {
      message.author = author;
    }

    const response = await chrome.runtime.sendMessage(message);

    if (!response?.status) {
      console.log("Teams: Caption update ignored (not capturing or from wrong tab)");
    } else {
      console.log("Teams: Caption sent successfully:", text);
    }
  } catch (error) {
    console.error("Teams: Failed to send caption update:", error);
  }
}

// Get the current live captions and author from Teams DOM
function getTeamsCaptions() {
  try {
    const captionElements = document.querySelectorAll('[data-tid="closed-caption-text"]');
    const captionAuthors = document.querySelectorAll('[data-tid="author"]');

    if (captionElements && captionElements.length > 0) {
      // Get the text from the very last caption element
      const captionText = captionElements[captionElements.length - 1].innerText.trim();

      // Get the author from the very last author element
      const author = captionAuthors && captionAuthors.length > 0 ?
                     captionAuthors[captionAuthors.length - 1].innerText.trim() :
                     "Unknown Speaker";

      if (captionText && captionText.length > 0) {
        return { text: captionText, author: author };
      }
    }
  } catch (e) {
    console.warn("Teams: Error accessing caption elements:", e);
  }
  return null;
}

// Start caption monitoring (only when user explicitly starts capture)
async function startCaptionMonitoring() {
  if (isMonitoring) {
    console.log("Teams: Already monitoring captions");
    return;
  }
  
  console.log("Teams: User started capture - beginning caption monitoring");
  isMonitoring = true;
  lastCaptionText = ''; // Reset caption tracking

  const POLL_INTERVAL = 300; // Reduced frequency to 300ms for better performance

  monitoringInterval = setInterval(async () => {
    try {
      const captionData = getTeamsCaptions();

      if (captionData && captionData.text && captionData.text !== lastCaptionText) {
        console.log("Teams: New caption detected:", captionData.text, "by", captionData.author);
        lastCaptionText = captionData.text;
        await sendCaptionUpdate(captionData.text, "Teams", captionData.author);
      }
    } catch (error) {
      console.error("Teams: Error in caption monitoring loop:", error);
    }
  }, POLL_INTERVAL);
}

// Stop caption monitoring
function stopCaptionMonitoring() {
  if (!isMonitoring) {
    console.log("Teams: Not currently monitoring");
    return;
  }
  
  console.log("Teams: Stopping caption monitoring");
  isMonitoring = false;
  
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  
  lastCaptionText = '';
}

// Clean up when page changes
window.addEventListener('beforeunload', () => {
  console.log("Teams: Page unloading, cleaning up");
  stopCaptionMonitoring();
});

console.log("Teams: Caption scraper ready - waiting for user to start capture");