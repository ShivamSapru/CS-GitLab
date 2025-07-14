document.addEventListener("DOMContentLoaded", () => {
    const captionBox = document.getElementById("caption-box");

    try {
        chrome.storage.local.get(["latestCaption"], (result) => {
            if (chrome.runtime.lastError) {
                captionBox.textContent = "Failed to load caption.";
                console.error("Runtime error:", chrome.runtime.lastError.message);
                return;
            }

            captionBox.textContent = result.latestCaption || "No captions detected.";
        });

        // Optional: keep updating every 1s
        setInterval(() => {
            chrome.storage.local.get(["latestCaption"], (result) => {
                captionBox.textContent = result.latestCaption || "Waiting for captions...";
            });
        }, 1000);
    } catch (e) {
        captionBox.textContent = "An unexpected error occurred.";
        console.error("Unexpected error:", e.message);
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "translatedCaption") {
    const box = document.getElementById("caption-box");
    if (box) {
      box.textContent = msg.text;
    }
  }
});
