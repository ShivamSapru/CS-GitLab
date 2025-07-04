// popup.js
console.log("Subtitle Translator Popup Script Loaded!");

document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('authSection');
    const translationSection = document.getElementById('translationSection');
    const loginButton = document.getElementById('loginButton');
    const signupButton = document.getElementById('signupButton');
    const tempLoginButton = document.getElementById('tempLoginButton'); // New temp login button
    const translateButton = document.getElementById('translateButton');
    const logoutButton = document.getElementById('logoutButton');
    const statusMessage = document.getElementById('statusMessage');

    let isTranslating = false; // State for the translation button

    // Function to update UI based on authentication status
    function updateUI(isAuthenticated) {
        if (isAuthenticated) {
            authSection.style.display = 'none';
            translationSection.style.display = 'block';
            statusMessage.textContent = "Logged in.";
        } else {
            authSection.style.display = 'block';
            translationSection.style.display = 'none';
            statusMessage.textContent = "";
        }
    }

    // Check initial authentication status from background script (via storage)
    chrome.runtime.sendMessage({ action: "getAuthStatus" }, (response) => {
        if (response && response.status === "success") {
            updateUI(response.isAuthenticated);
        } else {
            // Default to showing auth section if status can't be determined
            updateUI(false);
        }
    });

    // Event Listeners for Auth Section
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            console.log("Login button clicked!");
            chrome.runtime.sendMessage({ action: "openLoginPage" }, (response) => {
                console.log("Response from background (openLoginPage):", response);
            });
        });
    }

    if (signupButton) {
        signupButton.addEventListener('click', () => {
            console.log("Sign Up button clicked!");
            chrome.runtime.sendMessage({ action: "openSignupPage" }, (response) => {
                console.log("Response from background (openSignupPage):", response);
            });
        });
    }

    if (tempLoginButton) { // New temp login button listener
        tempLoginButton.addEventListener('click', () => {
            console.log("Temp Login button clicked!");
            statusMessage.textContent = "Logging in as temporary user...";
            chrome.runtime.sendMessage({ action: "tempLogin" }, (response) => {
                console.log("Response from background (tempLogin):", response);
                if (response && response.status === "success") {
                    updateUI(true); // Force UI to translation section
                    statusMessage.textContent = "Temporary login successful.";
                } else {
                    statusMessage.textContent = response.message || "Temp login failed.";
                }
            });
        });
    }

    // Event Listener for Translation Section
    if (translateButton) {
        translateButton.addEventListener('click', () => {
            if (!isTranslating) {
                statusMessage.textContent = "Starting translation...";
                chrome.runtime.sendMessage({ action: "startTranslation" }, (response) => {
                    console.log("Response from background (startTranslation):", response);
                    if (response && response.status === "Translation initiated") {
                        isTranslating = true;
                        translateButton.textContent = "Stop Translation";
                        translateButton.classList.add('stop-button');
                        statusMessage.textContent = "Translation active.";
                    } else {
                        statusMessage.textContent = response.message || "Failed to start translation. Please login.";
                    }
                });
            } else {
                statusMessage.textContent = "Stopping translation...";
                chrome.runtime.sendMessage({ action: "stopTranslation" }, (response) => {
                    console.log("Response from background (stopTranslation):", response);
                    if (response && response.status === "Translation stopped") {
                        isTranslating = false;
                        translateButton.textContent = "Start Translation";
                        translateButton.classList.remove('stop-button');
                        statusMessage.textContent = "Translation stopped.";
                    } else {
                        statusMessage.textContent = response.message || "Failed to stop translation.";
                    }
                });
            }
        });
    } else {
        console.error("Translate button not found in popup.html");
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            console.log("Logout button clicked!");
            chrome.runtime.sendMessage({ action: "logout" }, (response) => {
                console.log("Response from background (logout):", response);
                if (response && response.status === "success") {
                    updateUI(false);
                    statusMessage.textContent = "Logged out successfully.";
                } else {
                    statusMessage.textContent = "Error during logout.";
                }
            });
        });
    }
});
