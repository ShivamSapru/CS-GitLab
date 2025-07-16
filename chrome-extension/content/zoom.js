const pollingIntervalMs = 500;  // poll every 500ms

function getZoomIframe() {
  return document.getElementById("webclient");
}

function getZoomCaptionsFromIframe(iframe) {
  try {
    const captionElement = iframe.contentDocument.querySelector("#live-transcription-subtitle > span");
    if (captionElement && captionElement.innerText.trim()) {
      const captionText = captionElement.innerText.trim();
      const captionImageSrc = iframe.contentDocument.querySelector("#live-transcription-subtitle > img").src;
      const author = iframe.contentDocument.querySelector("[class=video-avatar__avatar-img][src='" + captionImageSrc + "']").alt;
      // console.log(author, captionText);
      return [captionText, author];
    }
  } catch (e) {
    console.warn("Unable to access iframe contents:", e);
  }
  return null;
}

// Target language need to be set dynamically
const to_lang = "fr";

function startZoomPolling() {
  const iframe = getZoomIframe();
  if (!iframe) {
    console.warn("Zoom iframe not found.");
    return;
  }

  let lastCaption = "";
  const interval = setInterval(() => {
    const caption = getZoomCaptionsFromIframe(iframe);
    if (caption && caption.length && caption[0] && caption[0] !== lastCaption) {
      lastCaption = caption[0];
      chrome.runtime.sendMessage({ 
        action: "captionsDetected", 
        text: caption[0], 
        to_lang: to_lang,
        author: caption[1]
      });
    }
  }, pollingIntervalMs);
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
