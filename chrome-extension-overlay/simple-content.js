// simple-content.js - Content script for subtitle overlay display
console.log('Caption display script loaded');

let userSettings = {
  showOriginal: true,
  targetLanguage: 'hi',
  fontSize: 14, // Default font size for the main text
  overlayOpacity: 0.3 // Default opacity (0.0 to 1.0)
};

let currentFontSize = userSettings.fontSize; // Track current font size
let currentOpacity = userSettings.overlayOpacity; // Track current opacity
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;

// Function to apply font size to all relevant text elements
function applyFontSize(container, size) {
    if (!container) return;
    const originalTextContent = container.querySelectorAll('.original-text-content');
    const translatedTextContent = container.querySelectorAll('.translated-text-content');

    originalTextContent.forEach(span => span.style.fontSize = `${size}px`);
    translatedTextContent.forEach(span => span.style.fontSize = `${size}px`);
}

// Function to apply opacity to the main container
function applyOpacity(container, opacity) {
    if (container) {
        container.style.background = `rgba(0, 0, 0, ${opacity})`;
        // Also adjust controls bar background for consistency
        const controlsBar = container.querySelector('.controls-bar');
        if (controlsBar) {
            controlsBar.querySelectorAll('button').forEach(btn => {
                btn.style.background = `rgba(255,255,255,${opacity * 0.5})`; // Buttons slightly less opaque than main body
            });
        }
    }
}

// Create resizable and draggable caption display
function createRealCaptionDisplay() {
  const existing = document.getElementById('real-caption-display');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'real-caption-display';
  container.style.cssText = `
    position: fixed !important;
    bottom: 80px !important; /* Position at the bottom */
    left: 50% !important; /* Center horizontally */
    transform: translateX(-50%) !important; /* Adjust for centering */
    background: rgba(0, 0, 0, ${currentOpacity}) !important; /* Apply initial opacity */
    color: white !important;
    padding: 10px !important; /* Reduced padding for compactness */
    border-radius: 12px !important;
    font-family: 'Inter', sans-serif !important; /* Modern font */
    max-width: 1200px !important; /* Doubled width */
    min-width: 600px !important; /* Doubled min-width */
    z-index: 2147483647 !important; /* Max z-index for "always on top" */
    border: none !important; /* No border */
    box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important; /* Softer shadow */
    backdrop-filter: blur(8px) !important; /* Slightly less blur */
    resize: both !important; /* Native resize handle */
    overflow: hidden !important; /* Hide scrollbars unless content actually overflows */
    display: flex !important;
    flex-direction: column !important;
    gap: 5px !important; /* Reduced gap for compactness */
  `;

  container.innerHTML = `
    <div class="controls-bar" style="
        position: absolute;
        top: 5px;
        right: 5px;
        display: flex;
        gap: 5px; /* Reduced gap for compactness */
        align-items: center;
        z-index: 1; /* Ensure controls are above caption text */
        cursor: grab; /* DRAG HANDLE: Only this bar is draggable */
    ">
        <input type="range" class="opacity-slider" min="0" max="100" value="${currentOpacity * 100}" style="
            width: 60px; /* Compact slider */
            height: 15px;
            -webkit-appearance: none; /* Remove default slider styles */
            appearance: none;
            background: rgba(255,255,255,0.2);
            border-radius: 5px;
            outline: none;
            opacity: 0.7;
            transition: opacity .2s;
        ">
        <button class="resize-btn" data-action="decrease" style="
            background: rgba(255,255,255,${currentOpacity * 0.5}); /* Initial button opacity */
            border: none;
            color: white;
            font-size: 0.9em; /* Smaller font for buttons */
            width: 20px; /* Smaller button size */
            height: 20px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
            line-height: 1; /* Adjust line height for centering text */
            padding: 0;
        ">A-</button>
        <button class="resize-btn" data-action="increase" style="
            background: rgba(255,255,255,${currentOpacity * 0.5}); /* Initial button opacity */
            border: none;
            color: white;
            font-size: 0.9em;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
            line-height: 1;
            padding: 0;
        ">A+</button>
        <button class="close-btn" style="
            background: none;
            border: none;
            color: white;
            font-size: 1.2em; /* Adjusted size */
            line-height: 1;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
        ">&times;</button>
    </div>
    <div id="real-caption-text" style="
        min-height: 60px;
        line-height: 1.6;
        padding-top: 25px; /* Space for controls bar */
        overflow-y: auto; /* Allow scrolling for captions if content overflows */
        flex-grow: 1; /* Allow caption area to grow */
        display: flex; /* Use flex for internal content */
        flex-direction: column;
        justify-content: flex-end; /* Align content to bottom */
    ">
        <p class="no-captions-state" style="
            text-align: center;
            color: #bbb;
            font-size: 1.2em; /* Larger font */
            font-weight: bold; /* Bold */
            opacity: 1; /* Visible by default */
            transition: opacity 0.5s ease-in-out;
        ">Waiting for captions...</p>
    </div>
  `;

  // Make only the controls-bar draggable
  let isDragging = false;
  const controlsBar = container.querySelector('.controls-bar');
  controlsBar.onmousedown = (e) => {
    // Prevent dragging if clicking on buttons or slider within the controls bar
    if (e.target.closest('button') || e.target.closest('.opacity-slider')) {
        return;
    }
    isDragging = true;
    let startX = e.clientX - container.offsetLeft;
    let startY = e.clientY - container.offsetTop;

    controlsBar.style.cursor = 'grabbing'; // Change cursor while dragging

    document.onmousemove = (e) => {
      if (isDragging) {
        container.style.left = (e.clientX - startX) + 'px';
        container.style.top = (e.clientY - startY) + 'px';
      }
    };

    document.onmouseup = () => {
      isDragging = false;
      document.onmousemove = null;
      controlsBar.style.cursor = 'grab'; // Reset cursor
    };
  };

  // Close button functionality
  const closeBtn = container.querySelector('.close-btn');
  if (closeBtn) {
      closeBtn.onmouseover = () => closeBtn.style.color = '#FF4C4C';
      closeBtn.onmouseout = () => closeBtn.style.color = 'white';
      closeBtn.onclick = () => {
          const display = document.getElementById('real-caption-display');
          if (display) display.remove();
          console.log('Caption display removed by close button');
          chrome.runtime.sendMessage({ type: 'STOP_CAPTURE_FROM_OVERLAY_BUTTON' });
      };
  }

  // Resize buttons functionality
  container.querySelectorAll('.resize-btn').forEach(button => {
      button.onmouseover = () => button.style.background = `rgba(255,255,255,${currentOpacity * 0.75})`; // More hover effect
      button.onmouseout = () => button.style.background = `rgba(255,255,255,${currentOpacity * 0.5})`;
      button.onclick = (e) => {
          const action = e.target.dataset.action;
          if (action === 'increase') {
              currentFontSize = Math.min(MAX_FONT_SIZE, currentFontSize + 2);
          } else if (action === 'decrease') {
              currentFontSize = Math.max(MIN_FONT_SIZE, currentFontSize - 2);
          }
          applyFontSize(container, currentFontSize); // Apply new font size
          console.log('Font size adjusted to:', currentFontSize);
      };
  });

  // Opacity slider functionality
  const opacitySlider = container.querySelector('.opacity-slider');
  if (opacitySlider) {
      // Custom thumb style for WebKit browsers
      const style = document.createElement('style');
      style.textContent = `
          .opacity-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #4CAF50; /* Green thumb */
              cursor: pointer;
              box-shadow: 0 0 2px rgba(0,0,0,0.5);
          }
          .opacity-slider::-moz-range-thumb {
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #4CAF50;
              cursor: pointer;
              box-shadow: 0 0 2px rgba(0,0,0,0.5);
          }
      `;
      document.head.appendChild(style);


      opacitySlider.oninput = (e) => {
          currentOpacity = parseFloat(e.target.value) / 100;
          applyOpacity(container, currentOpacity);
          console.log('Overlay opacity adjusted to:', currentOpacity);
      };
  }

  document.body.appendChild(container);
  console.log('Created caption display container');
  return container;
}

// Handle caption messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message.type || message.action);

  // Handle settings updates from popup
  if (message.type === 'SETTINGS_UPDATED') {
    userSettings = { ...userSettings, ...message.settings };
    currentFontSize = userSettings.fontSize; // Update current font size from settings
    currentOpacity = userSettings.overlayOpacity; // Update current opacity from settings
    const container = document.getElementById('real-caption-display');
    if (container) {
        applyFontSize(container, currentFontSize);
        applyOpacity(container, currentOpacity);
        const opacitySlider = container.querySelector('.opacity-slider');
        if (opacitySlider) opacitySlider.value = currentOpacity * 100;
    }
    console.log('Settings updated:', userSettings);
    return;
  }

  // Create display when capture starts
  if (message.type === 'CAPTURE_STARTED') {
    createRealCaptionDisplay();
    console.log('Caption display activated');
  }

  // Handle caption updates from platform scrapers
  if (message.action === 'updateCaption' && message.text && message.text.length > 5) {
    console.log('Caption received:', message.platform, '-', message.text);

    let textDiv = document.getElementById('real-caption-text');
    if (!textDiv) {
      createRealCaptionDisplay();
      textDiv = document.getElementById('real-caption-text');
    }

    if (textDiv) {
      // Hide "No Captions" state message if it's visible
      const noCaptionsState = textDiv.querySelector('.no-captions-state');
      if (noCaptionsState) {
          noCaptionsState.style.opacity = '0';
          setTimeout(() => noCaptionsState.remove(), 500); // Remove after fade out
      }

      textDiv.innerHTML = ''; // Clear previous content

      // Create a new entry for this caption
      const captionEntry = document.createElement('div');
      captionEntry.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 3px; /* Smaller gap between original and translated */
        padding: 5px; /* Smaller padding */
        background: rgba(255,255,255,0.05); /* Very subtle white background */
        border-radius: 4px; /* Smaller border radius */
        transition: opacity 0.3s ease-in-out;
        opacity: 0;
        text-align: center; /* CENTER ALIGNMENT */
      `;

      // Show original text only if setting is enabled
      if (userSettings.showOriginal) {
        const originalTextSpan = document.createElement('span');
        originalTextSpan.className = 'original-text-content';
        originalTextSpan.style.cssText = `
          color: white; /* Original text is white */
          /* Removed border-left and padding-left for centering */
          font-size: ${currentFontSize}px; /* Use dynamic font size */
          line-height: 1.4;
        `;
        originalTextSpan.textContent = message.text;
        captionEntry.appendChild(originalTextSpan);
      }

      // Get translation for the caption
      chrome.runtime.sendMessage({
        type: 'TRANSLATE_TEXT',
        text: message.text,
        targetLanguage: userSettings.targetLanguage || 'hi'
      }, (response) => {
        if (response && response.success && response.translatedText !== message.text) {
          const translatedTextSpan = document.createElement('span');
          translatedTextSpan.className = 'translated-text-content';
          translatedTextSpan.style.cssText = `
            color: white; /* TRANSLATED TEXT IS NOW WHITE */
            font-style: italic; /* Keep italic for differentiation */
            /* Removed border-left and padding-left for centering */
            font-size: ${currentFontSize}px; /* Use dynamic font size */
            line-height: 1.4;
          `;
          translatedTextSpan.textContent = response.translatedText;
          captionEntry.appendChild(translatedTextSpan);
          console.log('Added translation');
        }

        // Append the whole entry and fade in after translation is ready
        textDiv.appendChild(captionEntry);
        setTimeout(() => captionEntry.style.opacity = '1', 10); // Fade in
      });
    }
    return;
  }

  // Handle processed caption updates from background (from WebSocket)
  if (message.type === 'REAL_CAPTION_UPDATE') {
    console.log('Processed caption:', message.originalText);

    let textDiv = document.getElementById('real-caption-text');
    if (!textDiv) {
      createRealCaptionDisplay();
      textDiv = document.getElementById('real-caption-text');
    }

    if (textDiv) {
      // Hide "No Captions" state message if it's visible
      const noCaptionsState = textDiv.querySelector('.no-captions-state');
      if (noCaptionsState) {
          noCaptionsState.style.opacity = '0';
          setTimeout(() => noCaptionsState.remove(), 500); // Remove after fade out
      }

      textDiv.innerHTML = ''; // Clear previous content

      // Create a new entry for this processed caption
      const captionEntry = document.createElement('div');
      captionEntry.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 3px; /* Smaller gap between original and translated */
        padding: 5px; /* Smaller padding */
        background: rgba(255,255,255,0.05); /* Very subtle white background */
        border-radius: 4px; /* Smaller border radius */
        transition: opacity 0.3s ease-in-out;
        opacity: 0;
        text-align: center; /* CENTER ALIGNMENT */
      `;

      // Show original only if setting is enabled
      if (userSettings.showOriginal) {
        const originalTextSpan = document.createElement('span');
        originalTextSpan.className = 'original-text-content';
        originalTextSpan.style.cssText = `
          color: white; /* Original text is white */
          /* Removed border-left and padding-left for centering */
          font-size: ${currentFontSize}px; /* Use dynamic font size */
          line-height: 1.4;
        `;
        originalTextSpan.textContent = message.originalText;
        captionEntry.appendChild(originalTextSpan);
      }

      // Always show translation
      const translatedTextSpan = document.createElement('span');
      translatedTextSpan.className = 'translated-text-content';
      translatedTextSpan.style.cssText = `
        color: white; /* TRANSLATED TEXT IS NOW WHITE */
        font-style: italic; /* Keep italic for differentiation */
        /* Removed border-left and padding-left for centering */
        font-size: ${currentFontSize}px; /* Use dynamic font size */
        line-height: 1.4;
      `;
      translatedTextSpan.textContent = message.translatedText;
      captionEntry.appendChild(translatedTextSpan);

      // Append the whole entry and fade in
      textDiv.appendChild(captionEntry);
      setTimeout(() => captionEntry.style.opacity = '1', 10); // Fade in
    }
  }

  // Remove display when capture stops
  if (message.type === 'CAPTURE_STOPPED') {
    const container = document.getElementById('real-caption-display');
    if (container) container.remove();
    console.log('Caption display removed');
  }
});

console.log('Caption display ready!');
