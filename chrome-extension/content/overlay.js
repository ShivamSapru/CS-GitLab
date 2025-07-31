// overlay.js - Content script for subtitle overlay display
console.log('Caption display script loaded');

let userSettings = {
    showOriginal: false,
    targetLanguage: 'en',
    fontSize: 14, // Default font size for the main text
    overlayOpacity: 0.3 // Default opacity (0.0 to 1.0)
};

let currentFontSize = userSettings.fontSize; // Track current font size
let currentOpacity = userSettings.overlayOpacity; // Track current opacity
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;

// Constants for custom resizing and dragging
const RESIZE_HANDLE_SIZE = 8; // Pixels from the edge to activate resize
const MIN_OVERLAY_WIDTH = 300;
const MIN_OVERLAY_HEIGHT = 50; // Reduced minimum height for compactness
const INITIAL_OVERLAY_WIDTH = 600;
const INITIAL_OVERLAY_HEIGHT = 100; // Reduced initial height for compactness
const INITIAL_BOTTOM_OFFSET = 80; // How far from the bottom it should initially be

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

    // Calculate initial position for bottom-middle
    const initialLeft = (window.innerWidth / 2) - (INITIAL_OVERLAY_WIDTH / 2);
    const initialTop = window.innerHeight - INITIAL_OVERLAY_HEIGHT - INITIAL_BOTTOM_OFFSET;

    container.style.cssText = `
        position: fixed !important;
        top: ${initialTop}px !important; /* Set initial top position */
        left: ${initialLeft}px !important; /* Set initial left position */
        width: ${INITIAL_OVERLAY_WIDTH}px !important; /* Set initial width */
        height: ${INITIAL_OVERLAY_HEIGHT}px !important; /* Set initial height */
        background: rgba(0, 0, 0, ${currentOpacity}) !important; /* Apply initial opacity */
        color: white !important;
        padding: 5px !important; /* Reduced padding for compactness (from 10px) */
        border-radius: 12px !important;
        font-family: 'Inter', sans-serif !important; /* Modern font */
        min-width: ${MIN_OVERLAY_WIDTH}px !important;
        min-height: ${MIN_OVERLAY_HEIGHT}px !important;
        max-width: 1200px !important; /* Doubled width */
        z-index: 2147483647 !important; /* Max z-index for "always on top" */
        border: none !important; /* No border */
        box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important; /* Softer shadow */
        backdrop-filter: blur(8px) !important; /* Slightly less blur */
        overflow: hidden !important; /* Hide scrollbars unless content actually overflows */
        display: flex !important;
        flex-direction: column !important;
        gap: 0px !important; /* Removed gap between controls and text */
        cursor: grab; /* Default cursor for movability */
        transition: background 0.2s ease; /* Smooth transition for background on hover */
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
            opacity: 0; /* Initially hidden */
            transition: opacity 0.3s ease-in-out; /* Smooth fade in/out */
            pointer-events: none; /* Allow clicks to pass through when hidden */
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
                pointer-events: auto; /* Re-enable pointer events for slider */
            ">
            <button class="resize-btn" data-action="decrease" style="
                background: rgba(255,255,255,${currentOpacity * 0.5}); /* Initial button opacity */
                border: none;
                color: white; /* White text for A- */
                font-size: 0.9em; /* Smaller font for buttons */
                width: 20px; /* Smaller button size */
                height: 20px;
                border-radius: 50%;
                cursor: pointer; /* Ensure pointer cursor for buttons */
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
                line-height: 1; /* Adjust line height for centering text */
                padding: 0;
                pointer-events: auto; /* Re-enable pointer events for button */
            ">A-</button>
            <button class="resize-btn" data-action="increase" style="
                background: rgba(255,255,255,${currentOpacity * 0.5}); /* Initial button opacity */
                border: none;
                color: white; /* White text for A+ */
                font-size: 0.9em;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                cursor: pointer; /* Ensure pointer cursor for buttons */
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
                line-height: 1;
                padding: 0;
                pointer-events: auto; /* Re-enable pointer events for button */
            ">A+</button>
            <button class="close-btn" style="
                background: none;
                border: none;
                color: white;
                font-size: 1.2em; /* Adjusted size */
                line-height: 1;
                cursor: pointer; /* Ensure pointer cursor for buttons */
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.2s;
                pointer-events: auto; /* Re-enable pointer events for button */
            ">&times;</button>
        </div>
        <div id="real-caption-text" style="
            min-height: 40px; /* Reduced min-height for compactness */
            line-height: 1.6;
            padding-top: 5px; /* Reduced padding-top to remove gap */
            padding-bottom: 5px; /* Added padding-bottom for vertical centering */
            overflow-y: auto; /* Allow scrolling for captions if content overflows */
            flex-grow: 1; /* Allow caption area to grow */
            display: flex; /* Use flex for internal content */
            flex-direction: column;
            justify-content: center; /* Center content vertically */
            align-items: center;
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

    document.body.appendChild(container);
    console.log('Created caption display container');

    // Setup custom drag and resize interactions
    setupOverlayInteractions(container);

    return container;
}

// --- Custom Interaction Logic (Drag & Resize) ---
function setupOverlayInteractions(container) {
    let isDragging = false;
    let isResizing = false;
    let resizeDirection = '';
    let startX, startY, startWidth, startHeight, startLeft, startTop;

    const controlsBar = container.querySelector('.controls-bar');

    // Function to determine resize direction and set cursor
    function getResizeDirection(e) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        const onLeft = x < rect.left + RESIZE_HANDLE_SIZE;
        const onRight = x > rect.right - RESIZE_HANDLE_SIZE;
        const onTop = y < rect.top + RESIZE_HANDLE_SIZE;
        const onBottom = y > rect.bottom - RESIZE_HANDLE_SIZE;

        if (onRight && onBottom) return 'se';
        if (onLeft && onBottom) return 'sw';
        if (onRight && onTop) return 'ne';
        if (onLeft && onTop) return 'nw';
        if (onRight) return 'e';
        if (onLeft) return 'w';
        if (onTop) return 'n';
        if (onBottom) return 's';
        return '';
    }

    // Mousemove for cursor changes on the container
    container.addEventListener('mousemove', (e) => {
        if (isDragging || isResizing) return; // Don't change cursor if already dragging/resizing

        // Check if cursor is over a button or slider within controlsBar
        if (e.target.closest('button') || e.target.closest('.opacity-slider')) {
            container.style.cursor = 'pointer'; // Show pointer for interactive elements
            return;
        }

        const currentDirection = getResizeDirection(e);
        if (currentDirection) {
            switch (currentDirection) {
                case 'n':
                case 's':
                    container.style.cursor = 'ns-resize';
                    break;
                case 'e':
                case 'w':
                    container.style.cursor = 'ew-resize';
                    break;
                case 'ne':
                case 'sw':
                    container.style.cursor = 'nesw-resize';
                    break;
                case 'nw':
                case 'se':
                    container.style.cursor = 'nwse-resize';
                    break;
            }
        } else {
            // If not over a resize handle or interactive element, show grab cursor for general dragging
            container.style.cursor = 'grab';
        }
    });

    // Mouseleave to reset cursor
    container.addEventListener('mouseleave', () => {
        if (!isDragging && !isResizing) {
            container.style.cursor = 'default';
        }
    });

    // Mousedown to start drag or resize
    container.addEventListener('mousedown', (e) => {
        if (e.target.closest('button') || e.target.closest('.opacity-slider')) {
            return;
        }

        const currentDirection = getResizeDirection(e);

        if (currentDirection) { // User clicked on a resize handle
            isResizing = true;
            resizeDirection = currentDirection;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = container.offsetWidth;
            startHeight = container.offsetHeight;
            startLeft = container.offsetLeft;
            startTop = container.offsetTop;

            document.addEventListener('mousemove', doResize);
            document.addEventListener('mouseup', stopInteraction);
            e.preventDefault(); // Prevent text selection
        } else {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = container.offsetLeft;
            startTop = container.offsetTop;

            container.style.cursor = 'grabbing'; // Visual cue for dragging
            document.addEventListener('mousemove', doDrag);
            document.addEventListener('mouseup', stopInteraction);
            e.preventDefault(); // Prevent text selection
        }
    });

    // Function to perform dragging
    function doDrag(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        container.style.left = `${startLeft + dx}px`;
        container.style.top = `${startTop + dy}px`;
    }

    // Function to perform resizing
    function doResize(e) {
        if (!isResizing) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        switch (resizeDirection) {
            case 'e': // Right edge: only width changes, left stays fixed
                newWidth = Math.max(MIN_OVERLAY_WIDTH, startWidth + dx);
                break;
            case 'w': // Left edge: width changes, left position changes
                newWidth = Math.max(MIN_OVERLAY_WIDTH, startWidth - dx);
                newLeft = startLeft + dx;
                break;
            case 's': // Bottom edge: only height changes, top stays fixed
                newHeight = Math.max(MIN_OVERLAY_HEIGHT, startHeight + dy);
                break;
            case 'n': // Top edge: height changes, top position changes
                newHeight = Math.max(MIN_OVERLAY_HEIGHT, startHeight - dy);
                newTop = startTop + dy;
                break;
            case 'se': // Bottom-right corner: width and height change, top/left stay fixed
                newWidth = Math.max(MIN_OVERLAY_WIDTH, startWidth + dx);
                newHeight = Math.max(MIN_OVERLAY_HEIGHT, startHeight + dy);
                break;
            case 'sw': // Bottom-left corner: width and height change, left position changes
                newWidth = Math.max(MIN_OVERLAY_WIDTH, startWidth - dx);
                newHeight = Math.max(MIN_OVERLAY_HEIGHT, startHeight + dy);
                newLeft = startLeft + dx;
                break;
            case 'ne': // Top-right corner: width and height change, top position changes
                newWidth = Math.max(MIN_OVERLAY_WIDTH, startWidth + dx);
                newHeight = Math.max(MIN_OVERLAY_HEIGHT, startHeight - dy);
                newTop = startTop + dy;
                break;
            case 'nw': // Top-left corner: width and height change, top and left positions change
                newWidth = Math.max(MIN_OVERLAY_WIDTH, startWidth - dx);
                newHeight = Math.max(MIN_OVERLAY_HEIGHT, startHeight - dy);
                newLeft = startLeft + dx;
                newTop = startTop + dy;
                break;
        }

        // Apply new styles
        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;
        container.style.left = `${newLeft}px`;
        container.style.top = `${newTop}px`;
    }

    // Function to stop both dragging and resizing
    function stopInteraction() {
        isDragging = false;
        isResizing = false;
        resizeDirection = '';
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('mousemove', doResize); // Ensure both are removed
        document.removeEventListener('mouseup', stopInteraction);
        container.style.cursor = 'grab'; // Reset to grab after interaction
    }

    // --- Auto-hide Controls Logic ---
    let controlsTimeout;

    // Function to show controls
    function showControls() {
        clearTimeout(controlsTimeout);
        controlsBar.style.opacity = '1';
        controlsBar.style.pointerEvents = 'auto'; // Re-enable pointer events
    }

    // Function to hide controls
    function hideControls() {
        // Only hide if not currently dragging or resizing
        if (!isDragging && !isResizing) {
            controlsTimeout = setTimeout(() => {
                controlsBar.style.opacity = '0';
                controlsBar.style.pointerEvents = 'none'; // Disable pointer events when hidden
            }, 1000); // Hide after 1 second of inactivity
        }
    }

    // Event listeners for showing/hiding controls
    container.addEventListener('mouseover', showControls);
    container.addEventListener('mouseleave', hideControls);
    // Also show controls when interaction starts
    container.addEventListener('mousedown', showControls);
    // Hide controls when interaction stops after a delay
    document.addEventListener('mouseup', hideControls);


    // Close button functionality
    const closeBtn = container.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.onmouseover = () => closeBtn.style.color = '#FF4C4C';
        closeBtn.onmouseout = () => closeBtn.style.color = 'white';
        closeBtn.onclick = () => {
            const display = document.getElementById('real-caption-display');
            if (display) display.remove();
            console.log('Caption display removed by close button');
            chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' });
        };
    }

    // Resize buttons functionality
    container.querySelectorAll('.resize-btn').forEach(button => {
        button.onmouseover = () => button.style.background = `rgba(255,255,255,${currentOpacity * 0.75})`;
        button.onmouseout = () => button.style.background = `rgba(255,255,255,${currentOpacity * 0.5})`;
        button.onclick = (e) => {
            const action = e.target.dataset.action;
            if (action === 'increase') {
                currentFontSize = Math.min(MAX_FONT_SIZE, currentFontSize + 2);
            } else if (action === 'decrease') {
                currentFontSize = Math.max(MIN_FONT_SIZE, currentFontSize - 2);
            }
            applyFontSize(container, currentFontSize);
            console.log('Font size adjusted to:', currentFontSize);
        };
    });

    // Opacity slider functionality
    const opacitySlider = container.querySelector('.opacity-slider');
    if (opacitySlider) {
        const style = document.createElement('style');
        style.textContent = `
            .opacity-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: white; /* Changed to white */
                cursor: pointer;
                box-shadow: 0 0 2px rgba(0,0,0,0.5);
            }
            .opacity-slider::-moz-range-thumb {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: white; /* Changed to white */
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
}

// Handle caption messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received:', message.type || message.action);

    if (message.type === 'SETTINGS_UPDATED') {
        userSettings = { ...userSettings, ...message.settings };
        currentFontSize = userSettings.fontSize;
        currentOpacity = userSettings.overlayOpacity;
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

    if (message.type === 'CAPTURE_STARTED') {
        createRealCaptionDisplay();
        console.log('Caption display activated');
    }

    if (message.action === 'updateCaption' && message.text && message.text.length > 5) {
        console.log('Caption received:', message.platform, '-', message.text);

        let textDiv = document.getElementById('real-caption-text');
        if (!textDiv) {
            createRealCaptionDisplay();
            textDiv = document.getElementById('real-caption-text');
        }

        if (textDiv) {
            const noCaptionsState = textDiv.querySelector('.no-captions-state');
            if (noCaptionsState) {
                noCaptionsState.style.opacity = '0';
                setTimeout(() => noCaptionsState.remove(), 500);
            }

            textDiv.innerHTML = '';

            const captionEntry = document.createElement('div');
            captionEntry.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 3px;
                padding: 5px;
                background: rgba(255,255,255,0.05);
                border-radius: 4px;
                transition: opacity 0.3s ease-in-out;
                opacity: 0;
                text-align: center;
                justify-content: center;
                align-items: center;
            `;

            if (userSettings.showOriginal) {
                const originalTextSpan = document.createElement('span');
                originalTextSpan.className = 'original-text-content';
                originalTextSpan.style.cssText = `
                    color: white;
                    font-size: ${currentFontSize}px;
                    line-height: 1.4;
                `;
                originalTextSpan.innerHTML = message.text;
                captionEntry.appendChild(originalTextSpan);
            }

            chrome.runtime.sendMessage({
                type: 'TRANSLATE_TEXT',
                text: message.text,
                targetLanguage: userSettings.targetLanguage || 'hi'
            }, (response) => {
                if (response && response.success && response.translatedText !== message.text) {
                    const translatedTextSpan = document.createElement('span');
                    translatedTextSpan.className = 'translated-text-content';
                    translatedTextSpan.style.cssText = `
                        color: white;
                        font-style: italic;
                        font-size: ${currentFontSize}px;
                        line-height: 1.4;
                    `;
                    translatedTextSpan.innerHTML = response.translatedText;
                    captionEntry.appendChild(translatedTextSpan);
                    console.log('Added translation');
                }

                textDiv.appendChild(captionEntry);
                setTimeout(() => captionEntry.style.opacity = '1', 10);
            });
        }
        return;
    }

    if (message.type === 'REAL_CAPTION_UPDATE') {
        console.log('Processed caption:', message.originalText);

        let textDiv = document.getElementById('real-caption-text');
        if (!textDiv) {
            createRealCaptionDisplay();
            textDiv = document.getElementById('real-caption-text');
        }

        if (textDiv) {
            const noCaptionsState = textDiv.querySelector('.no-captions-state');
            if (noCaptionsState) {
                noCaptionsState.style.opacity = '0';
                setTimeout(() => noCaptionsState.remove(), 500);
            }

            textDiv.innerHTML = '';

            const captionEntry = document.createElement('div');
            captionEntry.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 3px;
                padding: 5px;
                background: rgba(255,255,255,0.05);
                border-radius: 4px;
                transition: opacity 0.3s ease-in-out;
                opacity: 0;
                text-align: center;
                justify-content: center;
                align-items: center;
            `;

            if (userSettings.showOriginal) {
                const originalTextSpan = document.createElement('span');
                originalTextSpan.className = 'original-text-content';
                originalTextSpan.style.cssText = `
                    color: white;
                    font-size: ${currentFontSize}px;
                    line-height: 1.4;
                `;
                originalTextSpan.innerHTML = message.originalText;
                captionEntry.appendChild(originalTextSpan);
            }

            const translatedTextSpan = document.createElement('span');
            translatedTextSpan.className = 'translated-text-content';
            translatedTextSpan.style.cssText = `
                color: white;
                font-style: italic;
                font-size: ${currentFontSize}px;
                line-height: 1.4;
            `;
            translatedTextSpan.innerHTML = message.translatedText;
            captionEntry.appendChild(translatedTextSpan);

            textDiv.appendChild(captionEntry);
            setTimeout(() => captionEntry.style.opacity = '1', 10);
        }
    }

    if (message.type === 'CAPTURE_STOPPED') {
        const container = document.getElementById('real-caption-display');
        if (container) container.remove();
        console.log('Caption display removed');
    }
});

console.log('Caption display ready!');
