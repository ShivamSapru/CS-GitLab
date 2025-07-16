function getZoomIframe() {
  return document.getElementById("webclient");
}

function getZoomCaptionsFromIframe(iframe) {
  try {
    const captionElement = iframe.contentDocument.querySelector("#live-transcription-subtitle");
    if (captionElement && captionElement.innerText.trim()) {
      const captionText = captionElement.innerText.trim();
      // console.log("Zoom Caption:", captionText);
      return captionText;
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
    if (caption && caption !== lastCaption) {
      lastCaption = caption;
      chrome.runtime.sendMessage({ 
        action: "captionsDetected", 
        text: caption, 
        to_lang: to_lang
      });
    }
  }, 500);
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
