// zoom.js - Zoom caption scraper
console.log("Zoom caption scraper loaded");

// Global variables for monitoring state
let isMonitoring = false;
let monitoringInterval = null;
let lastCaptionText = '';
let zoomIframe = null;

// Initialize Zoom captions (but don't start monitoring yet)
initZoomCaptions();

function initZoomCaptions() {
  console.log("Zoom: Initialized and waiting for user action - NO AUTO-LOADING");
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Zoom: Received message:', message.type);
    
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
        console.log('Zoom: Settings updated:', message.settings);
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
      console.log("Zoom: Caption update ignored (not capturing or from wrong tab)");
    } else {
      console.log("Zoom: Caption sent successfully:", text);
    }
  } catch (error) {
    console.error("Zoom: Failed to send caption update:", error);
  }
}

// Get the current live captions and author from Zoom DOM
function getZoomCaptions(iframe) {
  try {
    if (!iframe || !iframe.contentDocument) {
      return null;
    }

    const captionElement = iframe.contentDocument.querySelector("#live-transcription-subtitle > span");
    if (captionElement && captionElement.innerText.trim()) {
      const captionText = captionElement.innerText.trim();

      // Try to get the author
      let author = "Unknown Speaker";
      try {
        const captionImageSrc = iframe.contentDocument.querySelector("#live-transcription-subtitle > img")?.src;
        if (captionImageSrc) {
          const captionAuthor = iframe.contentDocument.querySelector(`[class*="video-avatar"][src="${captionImageSrc}"]`)?.alt;
          if (captionAuthor && captionAuthor.length > 0) {
            author = captionAuthor.trim();
          }
        }
      } catch (e) {
        console.log("Zoom: Could not determine caption author:", e);
      }

      if (captionText && captionText.length > 0) {
        return { text: captionText, author: author };
      }
    }
  } catch (e) {
    console.warn("Zoom: Unable to access iframe contents:", e);
  }
  return null;
}

// Start caption monitoring (only when user explicitly starts capture)
async function startCaptionMonitoring() {
  if (isMonitoring) {
    console.log("Zoom: Already monitoring captions");
    return;
  }
  
  console.log("Zoom: User started capture - beginning caption monitoring");
  
  // Wait for iframe to be ready
  zoomIframe = await waitForZoomIframe();
  if (!zoomIframe) {
    console.warn("Zoom: Could not find iframe, cannot start monitoring");
    return;
  }
  
  isMonitoring = true;
  lastCaptionText = ''; // Reset caption tracking

  const POLL_INTERVAL = 300; // Reduced frequency to 300ms for better performance

  monitoringInterval = setInterval(async () => {
    try {
      const captionData = getZoomCaptions(zoomIframe);

      if (captionData && captionData.text && captionData.text !== lastCaptionText) {
        console.log("Zoom: New caption detected:", captionData.text, "by", captionData.author);
        lastCaptionText = captionData.text;
        await sendCaptionUpdate(captionData.text, "Zoom", captionData.author);
      }
    } catch (error) {
      console.error("Zoom: Error in caption monitoring loop:", error);
    }
  }, POLL_INTERVAL);
}

// Stop caption monitoring
function stopCaptionMonitoring() {
  if (!isMonitoring) {
    console.log("Zoom: Not currently monitoring");
    return;
  }
  
  console.log("Zoom: Stopping caption monitoring");
  isMonitoring = false;
  
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  
  lastCaptionText = '';
  zoomIframe = null;
}

// Get Zoom iframe element
function getZoomIframe() {
  return document.getElementById("webclient");
}

// Wait for Zoom iframe to be ready with improved timeout handling
function waitForZoomIframe() {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 20; // 6 seconds total (300ms * 20)
    
    const checkIframe = () => {
      attempts++;
      const iframe = getZoomIframe();
      
      if (iframe && iframe.contentDocument?.readyState === "complete") {
        console.log("Zoom: Iframe ready after", attempts, "attempts");
        resolve(iframe);
      } else if (attempts >= maxAttempts) {
        console.warn("Zoom: Iframe not ready after", maxAttempts, "attempts, giving up");
        resolve(null);
      } else {
        setTimeout(checkIframe, 300);
      }
    };
    
    checkIframe();
  });
}

// Clean up when page changes
window.addEventListener('beforeunload', () => {
  console.log("Zoom: Page unloading, cleaning up");
  stopCaptionMonitoring();
});

console.log("Zoom: Caption scraper ready - waiting for user to start capture");