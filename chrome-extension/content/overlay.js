// overlay.js - Content script for subtitle overlay display
console.log('Caption overlay script loaded');

let userSettings = {
    showOriginal: false,
    targetLanguage: 'en',
    fontSize: 14,
    overlayOpacity: 0.3
};

let currentFontSize = userSettings.fontSize;
let currentOpacity = userSettings.overlayOpacity;
let isCaptureActive = false; // CRITICAL: Track if capture is actually active

// Constants for overlay
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const RESIZE_HANDLE_SIZE = 8;
const MIN_OVERLAY_WIDTH = 300;
const MIN_OVERLAY_HEIGHT = 50;
const INITIAL_OVERLAY_WIDTH = 600;
const INITIAL_OVERLAY_HEIGHT = 100;
const INITIAL_BOTTOM_OFFSET = 80;

// Apply font size to text elements
function applyFontSize(container, size) {
    if (!container) return;
    const originalTextContent = container.querySelectorAll('.original-text-content');
    const translatedTextContent = container.querySelectorAll('.translated-text-content');

    originalTextContent.forEach(span => span.style.fontSize = `${size}px`);
    translatedTextContent.forEach(span => span.style.fontSize = `${size}px`);
}

// Apply opacity to container
function applyOpacity(container, opacity) {
    if (container) {
        container.style.background = `rgba(0, 0, 0, ${opacity})`;
        const controlsBar = container.querySelector('.controls-bar');
        if (controlsBar) {
            controlsBar.querySelectorAll('button').forEach(btn => {
                btn.style.background = `rgba(255,255,255,${opacity * 0.5})`;
            });
        }
    }
}

// Create caption display ONLY when capture is explicitly active
function createRealCaptionDisplay() {
    // CRITICAL CHECK: Only create overlay if capture is explicitly active
    if (!isCaptureActive) {
        console.log('Overlay: NOT creating display - capture is NOT active');
        return null;
    }

    console.log('Overlay: Creating caption display - capture is active');
    
    const existing = document.getElementById('real-caption-display');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'real-caption-display';

    // Calculate initial position for bottom-middle
    const initialLeft = (window.innerWidth / 2) - (INITIAL_OVERLAY_WIDTH / 2);
    const initialTop = window.innerHeight - INITIAL_OVERLAY_HEIGHT - INITIAL_BOTTOM_OFFSET;

    container.style.cssText = `
        position: fixed !important;
        top: ${initialTop}px !important;
        left: ${initialLeft}px !important;
        width: ${INITIAL_OVERLAY_WIDTH}px !important;
        height: ${INITIAL_OVERLAY_HEIGHT}px !important;
        background: rgba(0, 0, 0, ${currentOpacity}) !important;
        color: white !important;
        padding: 5px !important;
        border-radius: 12px !important;
        font-family: 'Inter', sans-serif !important;
        min-width: ${MIN_OVERLAY_WIDTH}px !important;
        min-height: ${MIN_OVERLAY_HEIGHT}px !important;
        max-width: 1200px !important;
        z-index: 2147483647 !important;
        border: none !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
        backdrop-filter: blur(8px) !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 0px !important;
        cursor: grab;
        transition: background 0.2s ease;
    `;

    container.innerHTML = `
        <div class="controls-bar" style="
            position: absolute;
            top: 5px;
            right: 5px;
            display: flex;
            gap: 5px;
            align-items: center;
            z-index: 1;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            pointer-events: none;
        ">
            <input type="range" class="opacity-slider" min="0" max="100" value="${currentOpacity * 100}" style="
                width: 60px;
                height: 15px;
                -webkit-appearance: none;
                appearance: none;
                background: rgba(255,255,255,0.2);
                border-radius: 5px;
                outline: none;
                opacity: 0.7;
                transition: opacity .2s;
                pointer-events: auto;
            ">
            <button class="resize-btn" data-action="decrease" style="
                background: rgba(255,255,255,${currentOpacity * 0.5});
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
                pointer-events: auto;
            ">A-</button>
            <button class="resize-btn" data-action="increase" style="
                background: rgba(255,255,255,${currentOpacity * 0.5});
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
                pointer-events: auto;
            ">A+</button>
            <button class="close-btn" style="
                background: none;
                border: none;
                color: white;
                font-size: 1.2em;
                line-height: 1;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.2s;
                pointer-events: auto;
            ">&times;</button>
        </div>
        <div id="real-caption-text" style="
            min-height: 40px;
            line-height: 1.6;
            padding-top: 5px;
            padding-bottom: 5px;
            overflow-y: auto;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        ">
            <p class="no-captions-state" style="
                text-align: center;
                color: #bbb;
                font-size: 1.2em;
                font-weight: bold;
                opacity: 1;
                transition: opacity 0.2s ease-in-out;
            ">Waiting for captions...</p>
        </div>
    `;

    document.body.appendChild(container);
    setupOverlayInteractions(container);
    console.log('Overlay: Caption display created successfully');
    return container;
}

// Setup overlay interactions (drag, resize, controls)
function setupOverlayInteractions(container) {
    let isDragging = false;
    let isResizing = false;
    let resizeDirection = '';
    let startX, startY, startWidth, startHeight, startLeft, startTop;

    const controlsBar = container.querySelector('.controls-bar');

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

    // Mousemove for cursor changes
    container.addEventListener('mousemove', (e) => {
        if (isDragging || isResizing) return;

        if (e.target.closest('button') || e.target.closest('.opacity-slider')) {
            container.style.cursor = 'pointer';
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
            container.style.cursor = 'grab';
        }
    });

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

        if (currentDirection) {
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
            e.preventDefault();
        } else {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = container.offsetLeft;
            startTop = container.offsetTop;

            container.style.cursor = 'grabbing';
            document.addEventListener('mousemove', doDrag);
            document.addEventListener('mouseup', stopInteraction);
            e.preventDefault();
        }
    });

    function doDrag(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        container.style.left = `${startLeft + dx}px`;
        container.style.top = `${startTop + dy}px`;
    }

    function doResize(e) {
        if (!isResizing) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        switch (resizeDirection) {
            case 'e':
                newWidth = Math.max(MIN_OVERLAY_WIDTH, startWidth + dx);
                break;
            case 'w':
                newWidth = Math.max(MIN_OVERLAY_WIDTH, startWidth - dx);
                newLeft = startLeft + dx;
                break;
            case 's':
                newHeight = Math.max(MIN_OVERLAY_HEIGHT, startHeight + dy);
                break;
            case 'n':
                newHeight = Math.max(MIN_OVERLAY_HEIGHT, startHeight - dy);
                newTop = startTop + dy;
                break;
            case 'se':
                newWidth = Math.max(MIN_OVERLAY_WIDTH, startWidth + dx);
                newHeight = Math.max(MIN_OVERLAY_HEIGHT, startHeight + dy);
                break;
            case 'sw':
                newWidth = Math.max(MIN_OVERLAY_WIDTH, startWidth - dx);
                newHeight = Math.max(MIN_OVERLAY_HEIGHT, startHeight + dy);
                newLeft = startLeft + dx;
                break;
            case 'ne':
                newWidth = Math.max(MIN_OVERLAY_WIDTH, startWidth + dx);
                newHeight = Math.max(MIN_OVERLAY_HEIGHT, startHeight - dy);
                newTop = startTop + dy;
                break;
            case 'nw':
                newWidth = Math.max(MIN_OVERLAY_WIDTH, startWidth - dx);
                newHeight = Math.max(MIN_OVERLAY_HEIGHT, startHeight - dy);
                newLeft = startLeft + dx;
                newTop = startTop + dy;
                break;
        }

        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;
        container.style.left = `${newLeft}px`;
        container.style.top = `${newTop}px`;
    }

    function stopInteraction() {
        isDragging = false;
        isResizing = false;
        resizeDirection = '';
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopInteraction);
        container.style.cursor = 'grab';
    }

    // Auto-hide controls
    let controlsTimeout;

    function showControls() {
        clearTimeout(controlsTimeout);
        controlsBar.style.opacity = '1';
        controlsBar.style.pointerEvents = 'auto';
    }

    function hideControls() {
        if (!isDragging && !isResizing) {
            controlsTimeout = setTimeout(() => {
                controlsBar.style.opacity = '0';
                controlsBar.style.pointerEvents = 'none';
            }, 1000);
        }
    }

    container.addEventListener('mouseover', showControls);
    container.addEventListener('mouseleave', hideControls);
    container.addEventListener('mousedown', showControls);
    document.addEventListener('mouseup', hideControls);

    // Close button functionality
    const closeBtn = container.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.onmouseover = () => closeBtn.style.color = '#FF4C4C';
        closeBtn.onmouseout = () => closeBtn.style.color = 'white';
        closeBtn.onclick = () => {
            const display = document.getElementById('real-caption-display');
            if (display) display.remove();
            console.log('Overlay: Caption display removed by close button');
            chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' });
        };
    }

    // Font size buttons
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

    // Opacity slider
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
                background: white;
                cursor: pointer;
                box-shadow: 0 0 2px rgba(0,0,0,0.5);
            }
            .opacity-slider::-moz-range-thumb {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: white;
                cursor: pointer;
                box-shadow: 0 0 2px rgba(0,0,0,0.5);
            }
        `;
        document.head.appendChild(style);

        opacitySlider.oninput = (e) => {
            currentOpacity = parseFloat(e.target.value) / 100;
            applyOpacity(container, currentOpacity);
            // console.log('Overlay opacity adjusted to:', currentOpacity);
        };
    }
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log('Overlay: Received message:', message.type || message.action);

    switch (message.type) {
        case 'SETTINGS_UPDATED':
            userSettings = { ...userSettings, ...message.settings };
            currentFontSize = userSettings.fontSize || currentFontSize;
            currentOpacity = userSettings.overlayOpacity || currentOpacity;
            const container = document.getElementById('real-caption-display');
            if (container) {
                applyFontSize(container, currentFontSize);
                applyOpacity(container, currentOpacity);
                const opacitySlider = container.querySelector('.opacity-slider');
                if (opacitySlider) opacitySlider.value = currentOpacity * 100;
            }
            console.log('Overlay: Settings updated:', userSettings);
            break;

        case 'CAPTURE_STARTED':
            console.log('Overlay: CAPTURE_STARTED received');
            isCaptureActive = true; // CRITICAL: Set capture as active
            userSettings = { ...userSettings, ...message.settings };
            createRealCaptionDisplay();
            break;

        case 'CAPTURE_STOPPED':
            console.log('Overlay: CAPTURE_STOPPED received');
            isCaptureActive = false; // CRITICAL: Set capture as inactive
            const existingDisplay = document.getElementById('real-caption-display');
            if (existingDisplay) {
                existingDisplay.remove();
                console.log('Overlay: Caption display removed');
            }
            break;

        case 'CAPTURE_STATUS':
            console.log('Overlay: CAPTURE_STATUS received:', message.isCapturing);
            isCaptureActive = message.isCapturing; // CRITICAL: Update capture status
            if (message.isCapturing) {
                userSettings = { ...userSettings, ...message.settings };
                createRealCaptionDisplay();
            } else {
                const statusDisplay = document.getElementById('real-caption-display');
                if (statusDisplay) statusDisplay.remove();
            }
            break;

        case 'TRANSLATION_ERROR':
            console.log('Overlay: Translation error received:', message.error);
            showTranslationError(message.error);
            break;

        case 'REAL_CAPTION_UPDATE':
            // CRITICAL: Only process caption updates if capture is explicitly active
            if (!isCaptureActive) {
                console.log('Overlay: Ignoring caption update - capture not active');
                break;
            }
            
            // console.log('Overlay: Processing caption update:', message.originalText);

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
                    /* transition: opacity 0.2s ease-in-out; */
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
            break;
    }
});

// Show translation error notification
function showTranslationError(error) {
    console.log('Overlay: Showing translation error:', error);
    
    const textDiv = document.getElementById('real-caption-text');
    if (!textDiv) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        background: rgba(255, 68, 68, 0.2);
        color: #ff6b6b;
        padding: 8px;
        border-radius: 4px;
        margin-bottom: 5px;
        text-align: center;
        font-size: 12px;
        border: 1px solid rgba(255, 68, 68, 0.3);
        animation: fadeInOut 4s ease-in-out;
    `;
    errorDiv.textContent = 'Translation Error: ' + error;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-10px); }
            15% { opacity: 1; transform: translateY(0); }
            85% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
        }
    `;
    document.head.appendChild(style);
    
    textDiv.appendChild(errorDiv);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 4000);
}

console.log('Caption overlay ready - NO AUTO-LOADING, waiting for user action');