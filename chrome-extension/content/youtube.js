let pollingIntervalId = null;
let lastCaption = "";

function isYouTubeVideoPlaying() {
  const video = document.querySelector("video");
  return video && !video.paused && !video.ended && video.readyState >= 2;
}

function getYouTubeCaptions() {
  const captionElements = document.querySelectorAll('.caption-window .ytp-caption-segment');
  if (captionElements.length > 0) {
    const texts = Array.from(captionElements).map(el => el.innerText.trim());
    return texts.join(' ');
  }
  return null;
}

function sendCaptionToBackground(caption) {
  try {
    chrome.runtime.sendMessage({
      action: "captionsDetected",
      text: caption,
      to_lang: to_lang
    });
    chrome.storage.local.set({ latestCaption: caption });
  } catch (error) {
    console.error("Failed to send message:", error.message);
  }
}

// Target language need to be set dynamically
const to_lang = "fr";

function startPollingCaptions() {
  const interval = setInterval(() => {
    const caption = getYouTubeCaptions();
    if (caption && caption !== lastCaption) {
      lastCaption = caption;
      sendCaptionToBackground(caption);
    }
    
    const video = document.querySelector("video");
    if (video && video.paused) {
      clearInterval(interval); // stop polling if video stops
    }
  }, 500); // poll every 500ms
}

function stopPollingCaptions() {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
}

function setupVideoListeners(video) {
  video.addEventListener("play", startPollingCaptions);
  video.addEventListener("pause", stopPollingCaptions);
  video.addEventListener("ended", stopPollingCaptions);

  // Auto-start if already playing
  if (!video.paused) startPollingCaptions();
}

function initCaptionExtraction() {
  const video = document.querySelector("video");

  if (video) {
    console.log("YouTube video detected.");
    setupVideoListeners(video);
  } else {
    console.log("No video yet. Retrying in 2s...");
    setTimeout(initCaptionExtraction, 2000);
  }
}

initCaptionExtraction();
