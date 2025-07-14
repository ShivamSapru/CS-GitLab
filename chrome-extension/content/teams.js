function getTeamsCaptions() {
  const captionElements = document.querySelectorAll('[data-tid="closed-caption-text"]');
  if (captionElements && captionElements.length > 0) {
    const captionText = captionElements[captionElements.length - 1].innerText.trim();
    // console.log("Zoom Caption:", captionText);
    return captionText;
  }
  return null;
}

function startTeamsCaptionPolling() {
  let lastCaption = "";
  setInterval(() => {
    const caption = getTeamsCaptions();
    if (caption && caption !== lastCaption) {
      lastCaption = caption;
      chrome.runtime.sendMessage({ action: "captionsDetected", text: caption });
    }
  }, 500); // Adjust interval if needed
}

window.addEventListener("load", () => {
  console.log("Microsoft Teams detected: Starting caption polling");
  startTeamsCaptionPolling();
});
