function getTeamsCaptions() {
  const captionElements = document.querySelectorAll('[data-tid="closed-caption-text"]');
  const captionAuthors = document.querySelectorAll('[data-tid="author"]');
  if (captionElements && captionElements.length > 0) {
      const captionAuthor = captionAuthors[captionAuthors.length - 1].innerText.trim();
      const captionElement = captionElements[captionElements.length - 1].innerText.trim();
      // console.log("Teams Caption:", captionAuthor, ":", captionElement);
      captionText = captionAuthor + ": " + captionElement
      return captionText;
  }
  return null;
}

// Target language need to be set dynamically
const to_lang = "fr";

function startTeamsCaptionPolling() {
  let lastCaption = "";
  setInterval(() => {
    const caption = getTeamsCaptions();
    if (caption && caption !== lastCaption) {
      lastCaption = caption;
      chrome.runtime.sendMessage({ 
        action: "captionsDetected", 
        text: caption, 
        to_lang: to_lang
      });
    }
  }, 500); // Adjust interval if needed
}

window.addEventListener("load", () => {
  console.log("Microsoft Teams detected: Starting caption polling");
  startTeamsCaptionPolling();
});
