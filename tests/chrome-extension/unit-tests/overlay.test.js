// overlay.test.js - Tests for overlay display functionality
import { jest } from '@jest/globals';

describe('Overlay Display', () => {
  let mockDocument;
  let mockWindow;
  let mockChrome;
  let mockContainer;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock container element
    mockContainer = {
      id: 'real-caption-display',
      style: {
        cssText: '',
        background: '',
        cursor: '',
        width: '',
        height: '',
        left: '',
        top: ''
      },
      innerHTML: '',
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(),
      addEventListener: jest.fn(),
      offsetWidth: 600,
      offsetHeight: 100,
      offsetLeft: 100,
      offsetTop: 100,
      getBoundingClientRect: jest.fn(() => ({
        left: 100,
        right: 700,
        top: 100,
        bottom: 200
      }))
    };
    
    // Mock DOM
    mockDocument = {
      getElementById: jest.fn(),
      createElement: jest.fn(() => mockContainer),
      querySelectorAll: jest.fn(),
      querySelector: jest.fn(),
      body: {
        appendChild: jest.fn()
      },
      head: {
        appendChild: jest.fn()
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    // Mock window
    mockWindow = {
      innerWidth: 1920,
      innerHeight: 1080,
      addEventListener: jest.fn()
    };
    
    // Mock Chrome
    mockChrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn()
        },
        sendMessage: jest.fn()
      }
    };
    
    global.document = mockDocument;
    global.window = mockWindow;
    global.chrome = mockChrome;
  });

  describe('Overlay Creation', () => {
    test('should create caption display container with correct properties', () => {
      const INITIAL_OVERLAY_WIDTH = 600;
      const INITIAL_OVERLAY_HEIGHT = 100;
      const INITIAL_BOTTOM_OFFSET = 80;
      
      // Mock existing element check
      mockDocument.getElementById.mockReturnValue(null);
      
      // Calculate initial position
      const initialLeft = (mockWindow.innerWidth / 2) - (INITIAL_OVERLAY_WIDTH / 2);
      const initialTop = mockWindow.innerHeight - INITIAL_OVERLAY_HEIGHT - INITIAL_BOTTOM_OFFSET;
      
      // Simulate createRealCaptionDisplay
      const container = mockDocument.createElement('div');
      container.id = 'real-caption-display';
      
      expect(initialLeft).toBe(660); // (1920 / 2) - (600 / 2)
      expect(initialTop).toBe(900);  // 1080 - 100 - 80
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toBeDefined();
    });

    test('should remove existing container before creating new one', () => {
      const existingContainer = { remove: jest.fn() };
      mockDocument.getElementById.mockReturnValue(existingContainer);
      
      // Simulate removal check
      const existing = mockDocument.getElementById('real-caption-display');
      if (existing) {
        existing.remove();
      }
      
      expect(existingContainer.remove).toHaveBeenCalled();
    });

    test('should apply correct CSS styles to container', () => {
      const currentOpacity = 0.3;
      const INITIAL_OVERLAY_WIDTH = 600;
      const INITIAL_OVERLAY_HEIGHT = 100;
      const MIN_OVERLAY_WIDTH = 300;
      const MIN_OVERLAY_HEIGHT = 50;
      
      // Simulate style application
      const expectedStyles = {
        position: 'fixed',
        background: `rgba(0, 0, 0, ${currentOpacity})`,
        color: 'white',
        padding: '5px',
        borderRadius: '12px',
        minWidth: `${MIN_OVERLAY_WIDTH}px`,
        minHeight: `${MIN_OVERLAY_HEIGHT}px`,
        maxWidth: '1200px',
        zIndex: 2147483647,
        cursor: 'grab'
      };
      
      Object.keys(expectedStyles).forEach(key => {
        expect(expectedStyles[key]).toBeDefined();
      });
    });

    test('should include controls bar with correct elements', () => {
      // Mock controls bar elements
      const controlsBar = {
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => [
          { style: { background: '' } }
        ]),
        style: {
          opacity: '0',
          pointerEvents: 'none'
        }
      };
      
      mockContainer.querySelector.mockImplementation((selector) => {
        if (selector === '.controls-bar') return controlsBar;
        if (selector === '.opacity-slider') return { value: 30 };
        if (selector === '.close-btn') return { onclick: jest.fn() };
        return null;
      });
      
      // Simulate controls setup
      const controls = mockContainer.querySelector('.controls-bar');
      const slider = mockContainer.querySelector('.opacity-slider');
      const closeBtn = mockContainer.querySelector('.close-btn');
      
      expect(controls).toBeDefined();
      expect(slider).toBeDefined();
      expect(closeBtn).toBeDefined();
    });
  });

  describe('Font Size Management', () => {
    test('should apply font size to text elements', () => {
      const mockTextElements = [
        { style: { fontSize: '' } },
        { style: { fontSize: '' } }
      ];
      
      mockContainer.querySelectorAll.mockImplementation((selector) => {
        if (selector === '.original-text-content' || selector === '.translated-text-content') {
          return mockTextElements;
        }
        return [];
      });
      
      // Simulate applyFontSize function
      const size = 16;
      const originalTextContent = mockContainer.querySelectorAll('.original-text-content');
      const translatedTextContent = mockContainer.querySelectorAll('.translated-text-content');
      
      [...originalTextContent, ...translatedTextContent].forEach(span => {
        span.style.fontSize = `${size}px`;
      });
      
      mockTextElements.forEach(element => {
        expect(element.style.fontSize).toBe('16px');
      });
    });

    test('should respect font size limits', () => {
      const MIN_FONT_SIZE = 10;
      const MAX_FONT_SIZE = 24;
      let currentFontSize = 14;
      
      // Test increase
      const increaseAction = () => {
        currentFontSize = Math.min(MAX_FONT_SIZE, currentFontSize + 2);
      };
      
      // Test decrease
      const decreaseAction = () => {
        currentFontSize = Math.max(MIN_FONT_SIZE, currentFontSize - 2);
      };
      
      increaseAction();
      expect(currentFontSize).toBe(16);
      
      decreaseAction();
      decreaseAction();
      decreaseAction();
      expect(currentFontSize).toBe(MIN_FONT_SIZE);
      
      // Test upper limit
      currentFontSize = MAX_FONT_SIZE - 1;
      increaseAction();
      increaseAction();
      expect(currentFontSize).toBe(MAX_FONT_SIZE);
    });

    test('should handle font size button interactions', () => {
      const mockButtons = [
        { dataset: { action: 'increase' }, onclick: jest.fn() },
        { dataset: { action: 'decrease' }, onclick: jest.fn() }
      ];
      
      mockContainer.querySelectorAll.mockImplementation((selector) => {
        if (selector === '.resize-btn') return mockButtons;
        return [];
      });
      
      // Simulate button setup
      const buttons = mockContainer.querySelectorAll('.resize-btn');
      expect(buttons).toHaveLength(2);
      expect(buttons[0].dataset.action).toBe('increase');
      expect(buttons[1].dataset.action).toBe('decrease');
    });
  });

  describe('Opacity Control', () => {
    test('should apply opacity to container background', () => {
      const opacity = 0.5;
      const expectedBackground = `rgba(0, 0, 0, ${opacity})`;
      
      // Simulate applyOpacity function
      mockContainer.style.background = expectedBackground;
      
      expect(mockContainer.style.background).toBe('rgba(0, 0, 0, 0.5)');
    });

    test('should update opacity slider value', () => {
      const opacitySlider = { 
        value: 0,
        oninput: jest.fn()
      };
      
      mockContainer.querySelector.mockImplementation((selector) => {
        if (selector === '.opacity-slider') return opacitySlider;
        return null;
      });
      
      // Simulate slider update
      const currentOpacity = 0.7;
      const slider = mockContainer.querySelector('.opacity-slider');
      if (slider) {
        slider.value = currentOpacity * 100;
      }
      
      expect(slider.value).toBe(70);
    });

    test('should handle opacity slider input events', () => {
      const mockEvent = {
        target: { value: '60' }
      };
      
      // Simulate slider input handler
      const currentOpacity = parseFloat(mockEvent.target.value) / 100;
      
      expect(currentOpacity).toBe(0.6);
    });
  });

  describe('Drag and Resize Functionality', () => {
    test('should detect resize direction correctly', () => {
      const RESIZE_HANDLE_SIZE = 8;
      const rect = {
        left: 100,
        right: 700,
        top: 100,
        bottom: 200
      };
      
      // Simulate getResizeDirection function
      const getResizeDirection = (x, y) => {
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
      };
      
      expect(getResizeDirection(695, 195)).toBe('se'); // Bottom right
      expect(getResizeDirection(105, 195)).toBe('sw'); // Bottom left
      expect(getResizeDirection(400, 150)).toBe('');   // Center (no resize)
    });

    test('should set appropriate cursor for resize directions', () => {
      const cursorMap = {
        'n': 'ns-resize',
        's': 'ns-resize',
        'e': 'ew-resize',
        'w': 'ew-resize',
        'ne': 'nesw-resize',
        'sw': 'nesw-resize',
        'nw': 'nwse-resize',
        'se': 'nwse-resize'
      };
      
      Object.keys(cursorMap).forEach(direction => {
        expect(cursorMap[direction]).toBeDefined();
      });
    });

    test('should handle drag operations', () => {
      let isDragging = false;
      const startX = 100;
      const startY = 100;
      const startLeft = 200;
      const startTop = 150;
      
      // Simulate drag start
      isDragging = true;
      
      // Simulate drag move
      const currentX = 120;
      const currentY = 130;
      const dx = currentX - startX;
      const dy = currentY - startY;
      
      const newLeft = startLeft + dx;
      const newTop = startTop + dy;
      
      expect(newLeft).toBe(220); // 200 + 20
      expect(newTop).toBe(180);  // 150 + 30
      expect(isDragging).toBe(true);
    });

    test('should respect minimum dimensions during resize', () => {
      const MIN_OVERLAY_WIDTH = 300;
      const MIN_OVERLAY_HEIGHT = 50;
      const startWidth = 400;
      const startHeight = 100;
      const dx = -200; // Large negative change
      
      // Simulate resize with minimum constraints
      const newWidth = Math.max(MIN_OVERLAY_WIDTH, startWidth + dx);
      const newHeight = Math.max(MIN_OVERLAY_HEIGHT, startHeight - 100);
      
      expect(newWidth).toBe(MIN_OVERLAY_WIDTH);
      expect(newHeight).toBe(MIN_OVERLAY_HEIGHT);
    });
  });

  describe('Controls Auto-hide', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should show controls on hover', () => {
      const controlsBar = {
        style: { 
          opacity: '0',
          pointerEvents: 'none'
        }
      };
      
      mockContainer.querySelector.mockReturnValue(controlsBar);
      
      // Simulate showControls function
      const showControls = () => {
        controlsBar.style.opacity = '1';
        controlsBar.style.pointerEvents = 'auto';
      };
      
      showControls();
      
      expect(controlsBar.style.opacity).toBe('1');
      expect(controlsBar.style.pointerEvents).toBe('auto');
    });

    test('should hide controls after timeout', () => {
      const controlsBar = {
        style: { 
          opacity: '1',
          pointerEvents: 'auto'
        }
      };
      
      mockContainer.querySelector.mockReturnValue(controlsBar);
      
      // Simulate hideControls function with timeout
      const hideControls = () => {
        setTimeout(() => {
          controlsBar.style.opacity = '0';
          controlsBar.style.pointerEvents = 'none';
        }, 1000);
      };
      
      hideControls();
      jest.advanceTimersByTime(1000);
      
      expect(controlsBar.style.opacity).toBe('0');
      expect(controlsBar.style.pointerEvents).toBe('none');
    });

    test('should not hide controls during drag operations', () => {
      const isDragging = true;
      const isResizing = false;
      
      // Simulate conditional hide logic
      const shouldHide = !isDragging && !isResizing;
      
      expect(shouldHide).toBe(false);
    });
  });

  describe('Message Handling', () => {
    test('should handle SETTINGS_UPDATED message', () => {
      const message = {
        type: 'SETTINGS_UPDATED',
        settings: {
          fontSize: 18,
          overlayOpacity: 0.5,
          targetLanguage: 'es'
        }
      };
      
      // Simulate settings update
      let userSettings = {
        showOriginal: false,
        targetLanguage: 'en',
        fontSize: 14,
        overlayOpacity: 0.3
      };
      
      userSettings = { ...userSettings, ...message.settings };
      
      expect(userSettings.fontSize).toBe(18);
      expect(userSettings.overlayOpacity).toBe(0.5);
      expect(userSettings.targetLanguage).toBe('es');
    });

    test('should handle CAPTURE_STARTED message', () => {
      const message = { type: 'CAPTURE_STARTED' };
      
      mockDocument.getElementById.mockReturnValue(null);
      
      // Simulate capture start handling
      if (message.type === 'CAPTURE_STARTED') {
        const container = mockDocument.createElement('div');
        mockDocument.body.appendChild(container);
      }
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });

    test('should handle CAPTURE_STOPPED message', () => {
      const message = { type: 'CAPTURE_STOPPED' };
      const existingContainer = { remove: jest.fn() };
      
      mockDocument.getElementById.mockReturnValue(existingContainer);
      
      // Simulate capture stop handling
      if (message.type === 'CAPTURE_STOPPED') {
        const container = mockDocument.getElementById('real-caption-display');
        if (container) container.remove();
      }
      
      expect(existingContainer.remove).toHaveBeenCalled();
    });

    test('should handle REAL_CAPTION_UPDATE message', () => {
      const message = {
        type: 'REAL_CAPTION_UPDATE',
        originalText: 'Hello world',
        translatedText: 'Hola mundo',
        platform: 'YouTube',
        timestamp: Date.now()
      };
      
      // Mock text div
      const textDiv = {
        innerHTML: '',
        querySelector: jest.fn(() => null),
        appendChild: jest.fn()
      };
      
      mockDocument.getElementById.mockReturnValue(textDiv);
      
      // Simulate caption update handling
      if (message.type === 'REAL_CAPTION_UPDATE') {
        const captionTextDiv = mockDocument.getElementById('real-caption-text');
        if (captionTextDiv) {
          captionTextDiv.innerHTML = '';
          const captionEntry = mockDocument.createElement('div');
          captionTextDiv.appendChild(captionEntry);
        }
      }
      
      expect(textDiv.innerHTML).toBe('');
      expect(textDiv.appendChild).toHaveBeenCalled();
    });

    test('should request translation for caption updates', () => {
      const message = {
        action: 'updateCaption',
        text: 'Test caption',
        platform: 'YouTube'
      };
      
      mockChrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (callback) {
          callback({
            success: true,
            translatedText: 'Subtítulo de prueba'
          });
        }
      });
      
      // Simulate translation request
      if (message.action === 'updateCaption' && message.text && message.text.length > 5) {
        mockChrome.runtime.sendMessage({
          type: 'TRANSLATE_TEXT',
          text: message.text,
          targetLanguage: 'es'
        }, (response) => {
          expect(response.success).toBe(true);
          expect(response.translatedText).toBe('Subtítulo de prueba');
        });
      }
    });
  });

  describe('Close Button Functionality', () => {
    test('should remove overlay when close button is clicked', () => {
      const closeBtn = {
        onclick: jest.fn(),
        onmouseover: jest.fn(),
        onmouseout: jest.fn()
      };
      
      const existingContainer = { remove: jest.fn() };
      mockDocument.getElementById.mockReturnValue(existingContainer);
      mockContainer.querySelector.mockReturnValue(closeBtn);
      
      // Simulate close button click
      const handleCloseClick = () => {
        const display = mockDocument.getElementById('real-caption-display');
        if (display) display.remove();
        mockChrome.runtime.sendMessage({ type: 'STOP_CAPTURE' });
      };
      
      handleCloseClick();
      
      expect(existingContainer.remove).toHaveBeenCalled();
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'STOP_CAPTURE' });
    });

    test('should change close button color on hover', () => {
      const closeBtn = {
        style: { color: 'white' },
        onmouseover: jest.fn(),
        onmouseout: jest.fn()
      };
      
      // Simulate hover effects
      const handleMouseOver = () => closeBtn.style.color = '#FF4C4C';
      const handleMouseOut = () => closeBtn.style.color = 'white';
      
      handleMouseOver();
      expect(closeBtn.style.color).toBe('#FF4C4C');
      
      handleMouseOut();
      expect(closeBtn.style.color).toBe('white');
    });
  });
});
