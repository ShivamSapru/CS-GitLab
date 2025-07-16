const pollingIntervalMs = 500;  // poll every 500ms

function getTeamsCaptions() {
  const captionElements = document.querySelectorAll('[data-tid="closed-caption-text"]');
  const captionAuthors = document.querySelectorAll('[data-tid="author"]');
  if (captionElements && captionElements.length > 0) {
      const captionText = captionElements[captionElements.length - 1].innerText.trim();
      const author = captionAuthors[captionAuthors.length - 1].innerText.trim();
      // console.log(author, captionText);
      return [captionText, author];
  }
  return null;
}

// Target language need to be set dynamically
const to_lang = "fr";

function startTeamsCaptionPolling() {
  let lastCaption = "";
  setInterval(() => {
    const caption = getTeamsCaptions();
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
  console.log("Microsoft Teams detected: Starting caption polling");
  startTeamsCaptionPolling();
});
