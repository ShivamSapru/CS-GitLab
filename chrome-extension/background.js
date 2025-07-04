// background.js
console.log("Subtitle Translator Background Service Worker Loaded!");

let activeTranslationTabId = null; // To keep track of which tab is actively translating

// --- Authentication State Variables ---
let isAuthenticated = false;
let userToken = null; // Store JWT or similar token
let userId = null; // Store user ID

// Function to update and persist authentication state
async function setAuthState(authStatus) {
    isAuthenticated = authStatus.isAuthenticated;
    userToken = authStatus.userToken || null;
    userId = authStatus.userId || null;

    // Persist state in Chrome local storage
    await chrome.storage.local.set({
        isAuthenticated: isAuthenticated,
        userToken: userToken,
        userId: userId
    });
    console.log("Auth state updated and saved:", { isAuthenticated, userId });
}

// Function to load authentication state from storage on startup
async function loadAuthState() {
    const storedState = await chrome.storage.local.get(['isAuthenticated', 'userToken', 'userId']);
    isAuthenticated = storedState.isAuthenticated || false;
    userToken = storedState.userToken || null;
    userId = storedState.userId || null;
    console.log("Auth state loaded:", { isAuthenticated, userId });
}

// Load state when the service worker starts
loadAuthState();

// Listen for when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("Subtitle Translator Extension Installed or Updated!");
  // Clear any old state on fresh install/update to ensure clean start
  setAuthState({ isAuthenticated: false, userToken: null, userId: null });
});

// Listen for messages from other parts of the extension (popup, content scripts)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script received message:", message);
  console.log("Sender details:", sender);

  // --- Authentication Related Messages ---
  if (message.action === "getAuthStatus") {
    sendResponse({
        status: "success",
        isAuthenticated: isAuthenticated,
        userId: userId // Send user ID if available
    });
    return false; // Sync response

  } else if (message.action === "openLoginPage") {
    const loginPageUrl = "http://localhost:3000/login"; // Your FastAPI frontend login page
    chrome.tabs.create({ url: loginPageUrl }); // Open in a new tab
    sendResponse({ status: "success", message: "Login page opened." });
    return false; // Sync response

  } else if (message.action === "openSignupPage") {
    const signupPageUrl = "http://localhost:3000/signup"; // Your FastAPI frontend signup page
    chrome.tabs.create({ url: signupPageUrl }); // Open in a new tab
    sendResponse({ status: "success", message: "Signup page opened." });
    return false; // Sync response

  } else if (message.action === "tempLogin") { // NEW: Temporary login for development
    setAuthState({ isAuthenticated: true, userToken: "TEMP_DEV_TOKEN_123", userId: "temp-dev-user-id-456" })
        .then(() => {
            sendResponse({ status: "success", message: "Temporary login successful." });
        })
        .catch(error => {
            console.error("Error setting temp auth state:", error);
            sendResponse({ status: "error", message: "Failed to set temporary authentication state." });
        });
    return true; // Async because setAuthState is async

  } else if (message.action === "setAuthenticatedUser") {
    // This message will come from the content script on the login success page
    const { token, id } = message;
    if (token && id) {
        setAuthState({ isAuthenticated: true, userToken: token, userId: id })
            .then(() => {
                sendResponse({ status: "success", message: "User authenticated." });
            })
            .catch(error => {
                console.error("Error setting auth state:", error);
                sendResponse({ status: "error", message: "Failed to save authentication state." });
            });
    } else {
        sendResponse({ status: "error", message: "Missing token or user ID." });
    }
    return true; // Async because setAuthState is async

  } else if (message.action === "logout") {
    setAuthState({ isAuthenticated: false, userToken: null, userId: null });
    sendResponse({ status: "success", message: "Logged out." });
    return true; // Async because setAuthState is async

  // --- Translation Related Messages ---
  } else if (message.action === "startTranslation") {
    if (!isAuthenticated) {
        sendResponse({ status: "Error", message: "Please log in first to start translation." });
        return false;
    }

    // Get the currently active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        activeTranslationTabId = activeTab.id;

        console.log(`Background: Sending 'startCapture' message to tab ID: ${activeTranslationTabId}`);

        chrome.tabs.sendMessage(activeTranslationTabId, { action: "startCapture", userId: userId }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message to content script:", chrome.runtime.lastError.message);
            sendResponse({ status: "Error", message: "Could not start capture on page. Content script might not be ready." });
          } else {
            console.log("Response from content script (start):", response);
            sendResponse({ status: "Translation initiated", message: "Background script is now processing." });
          }
        });
      } else {
        console.warn("Background: No active tab found to start translation.");
        sendResponse({ status: "Error", message: "No active tab found." });
      }
    });
    return true;

  } else if (message.action === "stopTranslation") {
    if (activeTranslationTabId) {
      console.log(`Background: Sending 'stopCapture' message to tab ID: ${activeTranslationTabId}`);
      chrome.tabs.sendMessage(activeTranslationTabId, { action: "stopCapture" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error sending stop message to content script:", chrome.runtime.lastError.message);
        } else {
            console.log("Response from content script (stop):", response);
        }
      });
      activeTranslationTabId = null;
    }
    console.log("Background: Stopping real-time translation...");
    sendResponse({ status: "Translation stopped", message: "Background script has stopped processing." });
    return true;

  } else if (message.action === "contentScriptLoaded") {
    console.log(`Background: Content script loaded on URL: ${message.url}`);
    sendResponse({ status: "Acknowledged content script load." });
    return false;

  } else if (message.action === "captionData") {
    console.log("Background: Received caption data from content script:", message.data);
    // TODO: Make API call to FastAPI backend for translation here
    // Use userToken for authentication if isAuthenticated is true
    // This is where you'd use the `userToken` and `userId` for your actual backend calls.
    // For temp login, userToken will be "TEMP_DEV_TOKEN_123" and userId "temp-dev-user-id-456"

    sendResponse({ status: "Received", message: "Caption data processed by background." });
    return true;

  } else {
    console.warn("Background: Received unknown message action:", message.action);
    sendResponse({ status: "Error", message: "Unknown action." });
    return false;
  }
});
