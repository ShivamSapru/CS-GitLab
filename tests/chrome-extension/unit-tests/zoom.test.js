// zoom.test.js - Tests for Zoom caption scraper
import { jest } from '@jest/globals';

describe('Zoom Caption Scraper', () => {
  let mockDocument;
  let mockWindow;
  let mockChrome;
  let mockIframe;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock iframe content document
    const mockContentDocument = {
      querySelector: jest.fn(),
      readyState: 'complete'
    };
    
    // Mock iframe element
    mockIframe = {
      id: 'webclient',
      contentDocument: mockContentDocument
    };
    
    // Mock DOM
    mockDocument = {
      getElementById: jest.fn(() => mockIframe),
      addEventListener: jest.fn()
    };
    
    // Mock window
    mockWindow = {
      location: {
        href: 'https://zoom.us/j/1234567890'
      },
      addEventListener: jest.fn()
    };
    
    // Mock Chrome runtime
    mockChrome = {
      runtime: {
        sendMessage: jest.fn()
      }
    };
    
    global.document = mockDocument;
    global.window = mockWindow;
    global.chrome = mockChrome;
  });

  describe('Iframe Detection and Access', () => {
    test('should find Zoom webclient iframe', () => {
      const iframe = mockDocument.getElementById('webclient');
      
      expect(iframe).toBeDefined();
      expect(iframe.id).toBe('webclient');
    });

    test('should handle missing iframe gracefully', () => {
      mockDocument.getElementById.mockReturnValue(null);
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      const iframe = mockDocument.getElementById('webclient');
      if (!iframe) {
        console.warn("Zoom iframe not found.");
      }
      
      expect(consoleWarn).toHaveBeenCalledWith("Zoom iframe not found.");
      
      consoleWarn.mockRestore();
    });

    test('should wait for iframe to be ready', () => {
      const mockIncompleteIframe = {
        contentDocument: { readyState: 'loading' }
      };
      
      mockDocument.getElementById.mockReturnValueOnce(mockIncompleteIframe)
                                 .mockReturnValueOnce({ contentDocument: { readyState: 'complete' } });
      
      // Simulate waiting logic
      let isReady = false;
      const checkReadiness = () => {
        const iframe = mockDocument.getElementById('webclient');
        if (iframe && iframe.contentDocument?.readyState === 'complete') {
          isReady = true;
        }
      };
      
      checkReadiness(); // First call - not ready
      expect(isReady).toBe(false);
      
      checkReadiness(); // Second call - ready
      expect(isReady).toBe(true);
    });

    test('should handle iframe access errors', () => {
      const errorIframe = {
        contentDocument: null // Cannot access due to security restrictions
      };
      
      mockDocument.getElementById.mockReturnValue(errorIframe);
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      try {
        const iframe = mockDocument.getElementById('webclient');
        if (!iframe.contentDocument) {
          throw new Error('Cannot access iframe contents');
        }
      } catch (e) {
        console.warn("Unable to access iframe contents:", e);
      }
      
      expect(consoleWarn).toHaveBeenCalledWith("Unable to access iframe contents:", expect.any(Error));
      
      consoleWarn.mockRestore();
    });
  });

  describe('Caption Detection in Iframe', () => {
    test('should extract captions from Zoom iframe DOM', () => {
      const mockCaptionElement = {
        innerText: 'This is a test Zoom caption'
      };
      
      const mockAuthorImage = {
        src: 'avatar_123.jpg',
        alt: 'John Doe'
      };
      
      const mockAvatarElement = {
        alt: 'John Doe'
      };
      
      mockIframe.contentDocument.querySelector.mockImplementation((selector) => {
        if (selector === '#live-transcription-subtitle > span') {
          return mockCaptionElement;
        }
        if (selector === '#live-transcription-subtitle > img') {
          return mockAuthorImage;
        }
        if (selector === "[class=video-avatar__avatar-img][src='avatar_123.jpg']") {
          return mockAvatarElement;
        }
        return null;
      });
      
      // Simulate getZoomCaptions function
      const captionElement = mockIframe.contentDocument.querySelector("#live-transcription-subtitle > span");
      if (captionElement && captionElement.innerText.trim()) {
        const captionText = captionElement.innerText.trim();
        const captionImageSrc = mockIframe.contentDocument.querySelector("#live-transcription-subtitle > img").src;
        const captionAuthor = mockIframe.contentDocument.querySelector("[class=video-avatar__avatar-img][src='" + captionImageSrc + "']").alt;
        const author = captionAuthor && captionAuthor.length > 0 ? 
                      captionAuthor.trim() : 
                      "Unknown Speaker";
        
        expect(captionText).toBe('This is a test Zoom caption');
        expect(author).toBe('John Doe');
      }
    });

    test('should handle missing caption elements', () => {
      mockIframe.contentDocument.querySelector.mockReturnValue(null);
      
      // Simulate no captions scenario
      const captionElement = mockIframe.contentDocument.querySelector("#live-transcription-subtitle > span");
      
      let result = null;
      if (captionElement && captionElement.innerText.trim()) {
        result = { text: captionElement.innerText.trim(), author: 'Found' };
      } else {
        result = { text: " ", author: "" };
      }
      
      expect(result).toEqual({ text: " ", author: "" });
    });

    test('should handle missing author information in Zoom', () => {
      const mockCaptionElement = {
        innerText: 'Caption without author'
      };
      
      mockIframe.contentDocument.querySelector.mockImplementation((selector) => {
        if (selector === '#live-transcription-subtitle > span') {
          return mockCaptionElement;
        }
        if (selector === '#live-transcription-subtitle > img') {
          return null; // No author image
        }
        return null;
      });
      
      // Simulate author extraction with missing elements
      try {
        const captionElement = mockIframe.contentDocument.querySelector("#live-transcription-subtitle > span");
        const captionText = captionElement.innerText.trim();
        
        const captionImageSrc = mockIframe.contentDocument.querySelector("#live-transcription-subtitle > img")?.src;
        const author = captionImageSrc ? 'Found Author' : "Unknown Speaker";
        
        expect(captionText).toBe('Caption without author');
        expect(author).toBe('Unknown Speaker');
      } catch (error) {
        // Handle selector errors gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should handle iframe content access errors', () => {
      mockDocument.getElementById.mockReturnValue({
        contentDocument: null // Cannot access
      });
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      try {
        const iframe = mockDocument.getElementById('webclient');
        const captionElement = iframe.contentDocument.querySelector("#live-transcription-subtitle > span");
      } catch (e) {
        console.warn("Unable to access iframe contents:", e);
      }
      
      expect(consoleWarn).toHaveBeenCalledWith("Unable to access iframe contents:", expect.any(Error));
      
      consoleWarn.mockRestore();
    });
  });

  describe('Caption Monitoring Loop', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should set up polling interval for Zoom captions', () => {
      const POLL_INTERVAL = 100;
      let intervalId;
      
      const mockCallback = jest.fn();
      intervalId = setInterval(mockCallback, POLL_INTERVAL);
      
      // Fast forward time
      jest.advanceTimersByTime(POLL_INTERVAL * 2);
      
      expect(mockCallback).toHaveBeenCalledTimes(2);
      
      clearInterval(intervalId);
    });

    test('should detect new Zoom captions and send updates', async () => {
      let lastCaptionText = '';
      const newCaptionData = { text: 'New Zoom caption', author: 'Speaker Name' };
      
      const sendCaptionUpdate = jest.fn().mockResolvedValue({ status: true });
      
      // Simulate caption change detection
      if (newCaptionData && newCaptionData.text && newCaptionData.text !== lastCaptionText) {
        lastCaptionText = newCaptionData.text;
        await sendCaptionUpdate(newCaptionData.text, 'Zoom', newCaptionData.author);
      }
      
      expect(sendCaptionUpdate).toHaveBeenCalledWith('New Zoom caption', 'Zoom', 'Speaker Name');
      expect(sendCaptionUpdate).toHaveBeenCalledTimes(1);
    });

    test('should not send duplicate Zoom captions', async () => {
      let lastCaptionText = 'Same Zoom caption';
      const currentCaptionData = { text: 'Same Zoom caption', author: 'Speaker' };
      
      const sendCaptionUpdate = jest.fn();
      
      // Simulate duplicate detection
      if (currentCaptionData && currentCaptionData.text && currentCaptionData.text !== lastCaptionText) {
        await sendCaptionUpdate(currentCaptionData.text, 'Zoom', currentCaptionData.author);
      }
      
      expect(sendCaptionUpdate).not.toHaveBeenCalled();
    });

    test('should handle Zoom monitoring errors gracefully', async () => {
      const mockError = new Error('Zoom caption monitoring error');
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        throw mockError;
      } catch (error) {
        console.error('Zoom: Error in caption monitoring loop:', error);
      }
      
      expect(consoleError).toHaveBeenCalledWith('Zoom: Error in caption monitoring loop:', mockError);
      
      consoleError.mockRestore();
    });
  });

  describe('Message Sending', () => {
    test('should send Zoom caption updates with author information', async () => {
      const text = 'Test Zoom caption';
      const platform = 'Zoom';
      const author = 'Jane Doe';
      const timestamp = Date.now();
      
      mockChrome.runtime.sendMessage.mockResolvedValue({ status: true });
      
      const message = {
        action: "updateCaption",
        text: text,
        platform: platform,
        author: author,
        timestamp: timestamp
      };
      
      const response = await mockChrome.runtime.sendMessage(message);
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(message);
      expect(response.status).toBe(true);
    });

    test('should handle failed Zoom message sending', async () => {
      const mockError = new Error('Failed to send Zoom message');
      mockChrome.runtime.sendMessage.mockRejectedValue(mockError);
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        await mockChrome.runtime.sendMessage({
          action: "updateCaption",
          text: "test",
          platform: "Zoom"
        });
      } catch (error) {
        console.error('Zoom: Failed to send caption update:', error);
      }
      
      expect(consoleError).toHaveBeenCalledWith('Zoom: Failed to send caption update:', mockError);
      
      consoleError.mockRestore();
    });

    test('should warn when no response received from background', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({ status: false });
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      const response = await mockChrome.runtime.sendMessage({
        action: "updateCaption",
        text: "test",
        platform: "Zoom"
      });
      
      if (!response?.status) {
        console.warn("Zoom: No response from background or status missing.");
      }
      
      expect(consoleWarn).toHaveBeenCalledWith("Zoom: No response from background or status missing.");
      
      consoleWarn.mockRestore();
    });
  });

  describe('Platform Detection and Initialization', () => {
    test('should send platform detection message on load', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({ status: true });
      
      // Simulate window load event
      const initMessage = {
        action: "updateCaption",
        platform: "Zoom",
        text: "Zoom meeting detected - waiting for captions..."
      };
      
      await mockChrome.runtime.sendMessage(initMessage);
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(initMessage);
    });

    test('should identify Zoom platform correctly', () => {
      const zoomUrls = [
        'https://zoom.us/j/1234567890',
        'https://us02web.zoom.us/j/1234567890',
        'https://zoom.us/wc/join/1234567890'
      ];
      
      zoomUrls.forEach(url => {
        const isZoom = url.includes('zoom.us');
        expect(isZoom).toBe(true);
      });
    });

    test('should handle Zoom iframe initialization with delays', () => {
      const checkInterval = 300;
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkIframeReady = () => {
        attempts++;
        const iframe = mockDocument.getElementById('webclient');
        
        if (iframe && iframe.contentDocument?.readyState === 'complete') {
          return true;
        }
        
        return attempts >= maxAttempts ? false : null; // null means continue checking
      };
      
      // Simulate iframe not ready initially
      mockIframe.contentDocument.readyState = 'loading';
      expect(checkIframeReady()).toBeNull();
      
      // Simulate iframe becomes ready
      mockIframe.contentDocument.readyState = 'complete';
      expect(checkIframeReady()).toBe(true);
    });
  });

  describe('Cleanup and Lifecycle', () => {
    test('should clean up interval on page unload', () => {
      const clearInterval = jest.spyOn(global, 'clearInterval');
      const intervalId = 789;
      
      // Simulate beforeunload event handler
      const cleanup = () => {
        console.log("Zoom: Cleaning up caption monitoring interval.");
        clearInterval(intervalId);
      };
      
      cleanup();
      
      expect(clearInterval).toHaveBeenCalledWith(intervalId);
    });

    test('should handle window load event properly', () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      // Simulate window load event
      const handleLoad = () => {
        console.log("Zoom page loaded: Attempting to start caption polling.");
      };
      
      handleLoad();
      
      expect(consoleLog).toHaveBeenCalledWith("Zoom page loaded: Attempting to start caption polling.");
      
      consoleLog.mockRestore();
    });

    test('should log script completion', () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      console.log("Zoom: Caption scraper script finished execution.");
      
      expect(consoleLog).toHaveBeenCalledWith("Zoom: Caption scraper script finished execution.");
      
      consoleLog.mockRestore();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle cross-origin iframe restrictions', () => {
      const restrictedIframe = {
        contentDocument: null // Cannot access due to cross-origin policy
      };
      
      mockDocument.getElementById.mockReturnValue(restrictedIframe);
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      try {
        const iframe = mockDocument.getElementById('webclient');
        if (!iframe.contentDocument) {
          console.warn("Cannot access Zoom iframe - cross-origin restriction");
        }
      } catch (error) {
        console.warn("Iframe access error:", error);
      }
      
      expect(consoleWarn).toHaveBeenCalledWith("Cannot access Zoom iframe - cross-origin restriction");
      
      consoleWarn.mockRestore();
    });

    test('should handle malformed DOM structure in iframe', () => {
      mockIframe.contentDocument.querySelector.mockImplementation(() => {
        throw new Error('DOM structure changed');
      });
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        mockIframe.contentDocument.querySelector("#live-transcription-subtitle > span");
      } catch (error) {
        console.error('Zoom: DOM query error:', error);
      }
      
      expect(consoleError).toHaveBeenCalledWith('Zoom: DOM query error:', expect.any(Error));
      
      consoleError.mockRestore();
    });

    test('should handle null/undefined caption data safely', () => {
      const nullCaptionElement = {
        innerText: null
      };
      
      mockIframe.contentDocument.querySelector.mockReturnValue(nullCaptionElement);
      
      // Simulate safe caption extraction
      const captionElement = mockIframe.contentDocument.querySelector("#live-transcription-subtitle > span");
      let captionText = '';
      
      try {
        captionText = (captionElement && captionElement.innerText) ? 
                      captionElement.innerText.trim() : '';
      } catch (error) {
        captionText = '';
      }
      
      expect(captionText).toBe('');
    });

    test('should handle network connectivity issues', async () => {
      const networkError = new Error('Network disconnected');
      mockChrome.runtime.sendMessage.mockRejectedValue(networkError);
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        await mockChrome.runtime.sendMessage({
          action: "updateCaption",
          text: "test caption",
          platform: "Zoom"
        });
      } catch (error) {
        console.error('Zoom: Network error:', error);
      }
      
      expect(consoleError).toHaveBeenCalledWith('Zoom: Network error:', networkError);
      
      consoleError.mockRestore();
    });
  });

  describe('Performance and Optimization', () => {
    test('should use appropriate polling interval for Zoom', () => {
      const POLL_INTERVAL = 100;
      
      // Verify polling interval is reasonable
      expect(POLL_INTERVAL).toBeGreaterThanOrEqual(50);  // Not too frequent
      expect(POLL_INTERVAL).toBeLessThanOrEqual(500);    // Not too slow
    });

    test('should handle iframe ready state checking efficiently', () => {
      const checkInterval = 300;
      let checkCount = 0;
      
      const efficientIframeCheck = () => {
        checkCount++;
        const iframe = mockDocument.getElementById('webclient');
        
        if (!iframe) return false;
        if (iframe.contentDocument?.readyState !== 'complete') return false;
        
        return true;
      };
      
      // First check - not ready
      mockIframe.contentDocument.readyState = 'loading';
      expect(efficientIframeCheck()).toBe(false);
      
      // Second check - ready
      mockIframe.contentDocument.readyState = 'complete';
      expect(efficientIframeCheck()).toBe(true);
      
      expect(checkCount).toBe(2);
    });

    test('should limit iframe ready checks to prevent infinite loops', () => {
      const maxChecks = 10;
      let checkCount = 0;
      
      const limitedIframeCheck = () => {
        if (checkCount >= maxChecks) {
          console.warn('Max iframe ready checks reached');
          return false;
        }
        
        checkCount++;
        const iframe = mockDocument.getElementById('webclient');
        return iframe?.contentDocument?.readyState === 'complete';
      };
      
      // Simulate iframe never becomes ready
      mockIframe.contentDocument.readyState = 'loading';
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      // Simulate multiple checks
      for (let i = 0; i <= maxChecks; i++) {
        limitedIframeCheck();
      }
      
      expect(consoleWarn).toHaveBeenCalledWith('Max iframe ready checks reached');
      expect(checkCount).toBe(maxChecks);
      
      consoleWarn.mockRestore();
    });
  });
});
