// content.js
console.log("Subtitle Translator Content Script Loaded on this page!");

// This script runs directly within the context of the web page.
// It can interact with the page's HTML, CSS, and JavaScript.
// In future steps, you would add logic here to:
// 1. Detect video players or live caption elements.
// 2. Extract text from those elements.
// 3. Send that text to the background script for translation.

// Example: Send a message back to the background script (for testing communication)
// This message will appear in the background script's console (service worker).
chrome.runtime.sendMessage({ action: "contentScriptLoaded", url: window.location.href });

// You can also interact with the page directly, for example:
// alert("Hello from Subtitle Translator!"); // This would pop up on every page! (Don't keep this)
