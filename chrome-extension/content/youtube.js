// youtube.js - YouTube caption scraper
console.log("YouTube caption scraper loaded");

// Global variables for monitoring state
let isMonitoring = false;
let monitoringInterval = null;
let lastCaption = '';

// Initialize YouTube captions (but don't start monitoring yet)
initYouTubeCaptions();

async function initYouTubeCaptions() {
  console.log("YouTube: Initialized and waiting for user action - NO AUTO-LOADING");
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('YouTube: Received message:', message.type);
    
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
        console.log('YouTube: Settings updated:', message.settings);
        sendResponse({ success: true });
        break;
    }
  });

  // DO NOT send any initial detection messages
  // DO NOT start monitoring automatically
  // Wait for explicit user action via CAPTURE_STARTED message
}

// Start caption monitoring (only when user explicitly starts capture)
async function startCaptionMonitoring() {
  if (isMonitoring) {
    console.log("YouTube: Already monitoring captions");
    return;
  }
  
  console.log("YouTube: User started capture - beginning caption monitoring");
  isMonitoring = true;
  lastCaption = ''; // Reset caption tracking

  // Main caption monitoring loop
  const POLL_INTERVAL = 300; // Reduced frequency to 300ms for better performance
  
  monitoringInterval = setInterval(async () => {
    try {
      const caption = getCurrentCaptions();
      if (caption && caption !== lastCaption && caption.trim().length > 0) {
        console.log("YouTube: New caption detected:", caption);
        lastCaption = caption;
        await sendCaptionUpdate(caption, "YouTube");
      }
    } catch (error) {
      console.error("YouTube: Error in caption monitoring:", error);
    }
  }, POLL_INTERVAL);
}

// Stop caption monitoring
function stopCaptionMonitoring() {
  if (!isMonitoring) {
    console.log("YouTube: Not currently monitoring");
    return;
  }
  
  console.log("YouTube: Stopping caption monitoring");
  isMonitoring = false;
  
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  
  lastCaption = '';
}

// Modern caption detection with multiple fallback selectors
function getCurrentCaptions() {
  const selectors = [
    '.ytp-caption-segment', // Standard YouTube
    '.caption-visual-line', // Newer versions
    '#caption-window .caption-text', // Fallback 1
    '.ytp-caption-window-container span', // Fallback 2
    '.ytp-caption-window-bottom span', // Additional fallback
    '.caption-window .caption-text' // Legacy selector
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      const text = Array.from(elements)
        .map(el => el.textContent.trim())
        .filter(text => text.length > 0)
        .join(' ');
      if (text && text.length > 0) {
        return text;
      }
    }
  }
  return null;
}

// Send caption update to background script
async function sendCaptionUpdate(text, platform) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "updateCaption",
      text: text,
      platform: platform,
      timestamp: Date.now()
    });
    
    if (!response?.status) {
      console.log("YouTube: Caption update ignored (not capturing or from wrong tab)");
    } else {
      console.log("YouTube: Caption sent successfully");
    }
  } catch (error) {
    console.error("YouTube: Failed to send caption update:", error);
  }
}

// Monitor for video changes and reset caption tracking
let currentVideoId = getVideoId();
const videoChangeInterval = setInterval(() => {
  const newVideoId = getVideoId();
  if (newVideoId !== currentVideoId) {
    console.log("YouTube: Video changed, resetting caption tracking");
    currentVideoId = newVideoId;
    lastCaption = '';
    
    // If we were monitoring, restart monitoring for new video
    if (isMonitoring) {
      stopCaptionMonitoring();
      setTimeout(() => startCaptionMonitoring(), 1000); // Restart after 1 second delay
    }
  }
}, 3000); // Check every 3 seconds instead of 2 for better performance

// Get current video ID for tracking video changes
function getVideoId() {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get('v');
  } catch (e) {
    return null;
  }
}

// Clean up when page changes
window.addEventListener('beforeunload', () => {
  console.log("YouTube: Page unloading, cleaning up");
  stopCaptionMonitoring();
  if (videoChangeInterval) {
    clearInterval(videoChangeInterval);
  }
});

console.log("YouTube: Caption scraper ready - waiting for user to start capture");