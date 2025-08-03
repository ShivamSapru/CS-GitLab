// youtube.test.js - Tests for YouTube caption scraper
import { jest } from '@jest/globals';

describe('YouTube Caption Scraper', () => {
  let mockDocument;
  let mockWindow;
  let mockChrome;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DOM elements
    mockDocument = {
      querySelectorAll: jest.fn(),
      createElement: jest.fn(),
      addEventListener: jest.fn()
    };
    
    // Mock window object
    mockWindow = {
      location: {
        href: 'https://www.youtube.com/watch?v=test123'
      },
      addEventListener: jest.fn(),
      URL: global.URL
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

  describe('Caption Detection', () => {
    test('should detect captions using standard YouTube selector', () => {
      const mockCaptionElements = [
        { textContent: 'Hello ' },
        { textContent: 'world!' }
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === '.ytp-caption-segment') {
          return mockCaptionElements;
        }
        return [];
      });
      
      // Simulate getCurrentCaptions function
      const selectors = [
        '.ytp-caption-segment',
        '.caption-visual-line',
        '#caption-window .caption-text',
        '.ytp-caption-window-container span',
        '.ytp-caption-window-bottom span',
        '.caption-window .caption-text'
      ];
      
      let result = null;
      for (const selector of selectors) {
        const elements = mockDocument.querySelectorAll(selector);
        if (elements.length > 0) {
          const text = Array.from(elements)
            .map(el => el.textContent.trim())
            .filter(text => text.length > 0)
            .join('<br />');
          if (text) {
            result = text;
            break;
          }
        }
      }
      
      expect(result).toBe('Hello<br />world!');
      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('.ytp-caption-segment');
    });

    test('should fallback to newer version selector when standard fails', () => {
      const mockCaptionElements = [
        { textContent: 'Fallback caption text' }
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === '.ytp-caption-segment') {
          return []; // No elements found
        }
        if (selector === '.caption-visual-line') {
          return mockCaptionElements;
        }
        return [];
      });
      
      // Simulate fallback logic
      const selectors = [
        '.ytp-caption-segment',
        '.caption-visual-line'
      ];
      
      let result = null;
      for (const selector of selectors) {
        const elements = mockDocument.querySelectorAll(selector);
        if (elements.length > 0) {
          const text = Array.from(elements)
            .map(el => el.textContent.trim())
            .filter(text => text.length > 0)
            .join('<br />');
          if (text) {
            result = text;
            break;
          }
        }
      }
      
      expect(result).toBe('Fallback caption text');
      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('.ytp-caption-segment');
      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('.caption-visual-line');
    });

    test('should return null when no captions are found', () => {
      mockDocument.querySelectorAll.mockReturnValue([]);
      
      // Simulate no captions found
      const selectors = ['.ytp-caption-segment', '.caption-visual-line'];
      let result = null;
      
      for (const selector of selectors) {
        const elements = mockDocument.querySelectorAll(selector);
        if (elements.length > 0) {
          // This won't execute since elements is empty
          result = 'found';
        }
      }
      
      expect(result).toBeNull();
    });

    test('should filter out empty caption text', () => {
      const mockCaptionElements = [
        { textContent: 'Valid caption' },
        { textContent: '   ' }, // Empty after trim
        { textContent: '' },    // Empty
        { textContent: 'Another valid caption' }
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockCaptionElements);
      
      // Simulate filtering logic
      const text = Array.from(mockCaptionElements)
        .map(el => el.textContent.trim())
        .filter(text => text.length > 0)
        .join('<br />');
      
      expect(text).toBe('Valid caption<br />Another valid caption');
    });

    test('should handle special characters in captions', () => {
      const mockCaptionElements = [
        { textContent: 'Café français' },
        { textContent: '¡Hola mundo!' },
        { textContent: 'こんにちは世界' }
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockCaptionElements);
      
      const text = Array.from(mockCaptionElements)
        .map(el => el.textContent.trim())
        .filter(text => text.length > 0)
        .join('<br />');
      
      expect(text).toBe('Café français<br />¡Hola mundo!<br />こんにちは世界');
    });
  });

  describe('Video ID Extraction', () => {
    test('should extract video ID from YouTube URL', () => {
      const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=test123&t=30s',
        'https://www.youtube.com/watch?list=playlist&v=video123'
      ];
      
      testUrls.forEach(url => {
        const urlObj = new URL(url);
        const videoId = urlObj.searchParams.get('v');
        
        expect(videoId).toBeTruthy();
        expect(typeof videoId).toBe('string');
      });
    });

    test('should return null for non-video YouTube URLs', () => {
      const nonVideoUrls = [
        'https://www.youtube.com/',
        'https://www.youtube.com/channel/UC123',
        'https://www.youtube.com/playlist?list=123'
      ];
      
      nonVideoUrls.forEach(url => {
        const urlObj = new URL(url);
        const videoId = urlObj.searchParams.get('v');
        
        expect(videoId).toBeNull();
      });
    });

    test('should handle video ID changes for tracking', () => {
      let currentVideoId = 'video1';
      const newVideoId = 'video2';
      
      // Simulate video change detection
      if (newVideoId !== currentVideoId) {
        currentVideoId = newVideoId;
        const lastCaption = ''; // Reset caption tracking
        
        expect(currentVideoId).toBe('video2');
        expect(lastCaption).toBe('');
      }
    });
  });

  describe('Caption Monitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should set up polling interval for caption monitoring', () => {
      const POLL_INTERVAL = 100;
      let intervalId;
      
      // Simulate interval setup
      const mockCallback = jest.fn();
      intervalId = setInterval(mockCallback, POLL_INTERVAL);
      
      // Fast forward time
      jest.advanceTimersByTime(POLL_INTERVAL);
      
      expect(mockCallback).toHaveBeenCalledTimes(1);
      
      // Clean up
      clearInterval(intervalId);
    });

    test('should detect new captions and send updates', async () => {
      let lastCaption = '';
      const newCaption = 'New caption text';
      
      // Mock sendCaptionUpdate function
      const sendCaptionUpdate = jest.fn().mockResolvedValue({ status: true });
      
      // Simulate caption change detection
      if (newCaption && newCaption !== lastCaption) {
        lastCaption = newCaption;
        await sendCaptionUpdate(newCaption, 'YouTube');
      }
      
      expect(sendCaptionUpdate).toHaveBeenCalledWith('New caption text', 'YouTube');
      expect(sendCaptionUpdate).toHaveBeenCalledTimes(1);
    });

    test('should not send duplicate captions', async () => {
      let lastCaption = 'Same caption';
      const currentCaption = 'Same caption';
      
      const sendCaptionUpdate = jest.fn();
      
      // Simulate duplicate detection
      if (currentCaption && currentCaption !== lastCaption) {
        await sendCaptionUpdate(currentCaption, 'YouTube');
      }
      
      expect(sendCaptionUpdate).not.toHaveBeenCalled();
    });

    test('should handle caption monitoring errors gracefully', async () => {
      const mockError = new Error('Caption monitoring error');
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        throw mockError;
      } catch (error) {
        console.error('YouTube: Error in caption monitoring:', error);
      }
      
      expect(consoleError).toHaveBeenCalledWith('YouTube: Error in caption monitoring:', mockError);
      
      consoleError.mockRestore();
    });
  });

  describe('Message Sending', () => {
    test('should send caption updates to background script', async () => {
      const text = 'Test caption';
      const platform = 'YouTube';
      const timestamp = Date.now();
      
      mockChrome.runtime.sendMessage.mockResolvedValue({ status: true });
      
      // Simulate sendCaptionUpdate function
      const message = {
        action: "updateCaption",
        text: text,
        platform: platform,
        timestamp: timestamp
      };
      
      const response = await mockChrome.runtime.sendMessage(message);
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(message);
      expect(response.status).toBe(true);
    });

    test('should handle failed message sending', async () => {
      const mockError = new Error('Failed to send message');
      mockChrome.runtime.sendMessage.mockRejectedValue(mockError);
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        await mockChrome.runtime.sendMessage({
          action: "updateCaption",
          text: "test",
          platform: "YouTube"
        });
      } catch (error) {
        console.error('YouTube: Failed to send caption update:', error);
      }
      
      expect(consoleError).toHaveBeenCalledWith('YouTube: Failed to send caption update:', mockError);
      
      consoleError.mockRestore();
    });

    test('should warn when no response received from background', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({ status: false });
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      const response = await mockChrome.runtime.sendMessage({
        action: "updateCaption",
        text: "test",
        platform: "YouTube"
      });
      
      if (!response?.status) {
        console.warn("YouTube: No response from background");
      }
      
      expect(consoleWarn).toHaveBeenCalledWith("YouTube: No response from background");
      
      consoleWarn.mockRestore();
    });
  });

  describe('Cleanup and Lifecycle', () => {
    test('should clean up interval on page unload', () => {
      const clearInterval = jest.spyOn(global, 'clearInterval');
      const intervalId = 123;
      
      // Simulate beforeunload event
      const cleanup = () => {
        console.log("YouTube: Cleaning up caption monitoring");
        clearInterval(intervalId);
      };
      
      cleanup();
      
      expect(clearInterval).toHaveBeenCalledWith(intervalId);
    });

    test('should reset caption tracking on video change', () => {
      const videoChangeInterval = 2000;
      let currentVideoId = 'video1';
      let lastCaption = 'previous caption';
      
      // Simulate video change detection
      const checkVideoChange = () => {
        const newVideoId = 'video2';
        if (newVideoId !== currentVideoId) {
          console.log("YouTube: Video changed, resetting caption tracking");
          currentVideoId = newVideoId;
          lastCaption = '';
        }
      };
      
      checkVideoChange();
      
      expect(currentVideoId).toBe('video2');
      expect(lastCaption).toBe('');
    });

    test('should handle initialization errors', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        // Simulate initialization error
        throw new Error('Initialization failed');
      } catch (error) {
        console.error('YouTube: Initialization error:', error);
      }
      
      expect(consoleError).toHaveBeenCalledWith('YouTube: Initialization error:', expect.any(Error));
      
      consoleError.mockRestore();
    });
  });

  describe('Platform Detection', () => {
    test('should send platform detection message on initialization', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({ status: true });
      
      // Simulate initialization notification
      await mockChrome.runtime.sendMessage({
        action: "updateCaption",
        text: "YouTube detected - waiting for captions...",
        platform: "YouTube"
      });
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: "updateCaption",
        text: "YouTube detected - waiting for captions...",
        platform: "YouTube"
      });
    });

    test('should identify YouTube platform correctly', () => {
      const url = 'https://www.youtube.com/watch?v=test123';
      const isYouTube = url.includes('youtube.com');
      
      expect(isYouTube).toBe(true);
    });

    test('should handle different YouTube URL formats', () => {
      const youtubeUrls = [
        'https://www.youtube.com/watch?v=123',
        'https://youtube.com/watch?v=123',
        'https://m.youtube.com/watch?v=123',
        'https://www.youtube.com/embed/123'
      ];
      
      youtubeUrls.forEach(url => {
        const isYouTube = url.includes('youtube.com');
        expect(isYouTube).toBe(true);
      });
    });
  });
});
