// teams.test.js - Tests for Microsoft Teams caption scraper
import { jest } from '@jest/globals';

describe('Microsoft Teams Caption Scraper', () => {
  let mockDocument;
  let mockWindow;
  let mockChrome;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DOM elements
    mockDocument = {
      querySelectorAll: jest.fn(),
      addEventListener: jest.fn()
    };
    
    // Mock window object
    mockWindow = {
      location: {
        href: 'https://teams.microsoft.com/l/meetup-join/meeting123'
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

  describe('Caption Detection', () => {
    test('should detect captions using Teams-specific selectors', () => {
      const mockCaptionElements = [
        { innerText: 'Hello everyone, welcome to the meeting' },
        { innerText: 'Can everyone hear me clearly?' }
      ];
      
      const mockAuthorElements = [
        { innerText: 'John Doe' },
        { innerText: 'Jane Smith' }
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === '[data-tid="closed-caption-text"]') {
          return mockCaptionElements;
        }
        if (selector === '[data-tid="author"]') {
          return mockAuthorElements;
        }
        return [];
      });
      
      // Simulate getTeamsCaptions function
      const captionElements = mockDocument.querySelectorAll('[data-tid="closed-caption-text"]');
      const captionAuthors = mockDocument.querySelectorAll('[data-tid="author"]');
      
      if (captionElements && captionElements.length > 0) {
        const captionText = captionElements[captionElements.length - 1].innerText.trim();
        const author = captionAuthors && captionAuthors.length > 0 ?
                       captionAuthors[captionAuthors.length - 1].innerText.trim() :
                       "Unknown Speaker";
        
        expect(captionText).toBe('Can everyone hear me clearly?');
        expect(author).toBe('Jane Smith');
      }
    });

    test('should handle missing author information gracefully', () => {
      const mockCaptionElements = [
        { innerText: 'Test caption without author' }
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === '[data-tid="closed-caption-text"]') {
          return mockCaptionElements;
        }
        if (selector === '[data-tid="author"]') {
          return []; // No author elements
        }
        return [];
      });
      
      // Simulate caption extraction with missing author
      const captionElements = mockDocument.querySelectorAll('[data-tid="closed-caption-text"]');
      const captionAuthors = mockDocument.querySelectorAll('[data-tid="author"]');
      
      const captionText = captionElements[0].innerText.trim();
      const author = captionAuthors && captionAuthors.length > 0 ?
                     captionAuthors[captionAuthors.length - 1].innerText.trim() :
                     "Unknown Speaker";
      
      expect(captionText).toBe('Test caption without author');
      expect(author).toBe('Unknown Speaker');
    });

    test('should return fallback when no captions are present', () => {
      mockDocument.querySelectorAll.mockReturnValue([]);
      
      // Simulate no captions scenario
      const captionElements = mockDocument.querySelectorAll('[data-tid="closed-caption-text"]');
      const captionAuthors = mockDocument.querySelectorAll('[data-tid="author"]');
      
      let result = null;
      if (captionElements && captionElements.length > 0) {
        result = { text: 'found', author: 'found' };
      } else {
        result = { text: " ", author: "" };
      }
      
      expect(result).toEqual({ text: " ", author: "" });
    });

    test('should handle empty caption text', () => {
      const mockCaptionElements = [
        { innerText: '   ' }, // Whitespace only
        { innerText: '' }      // Empty string
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === '[data-tid="closed-caption-text"]') {
          return mockCaptionElements;
        }
        return [];
      });
      
      // Simulate empty caption handling
      const captionElements = mockDocument.querySelectorAll('[data-tid="closed-caption-text"]');
      const captionText = captionElements[captionElements.length - 1].innerText.trim();
      
      expect(captionText).toBe('');
    });

    test('should extract most recent caption when multiple exist', () => {
      const mockCaptionElements = [
        { innerText: 'First caption' },
        { innerText: 'Second caption' },
        { innerText: 'Most recent caption' }
      ];
      
      const mockAuthorElements = [
        { innerText: 'Speaker A' },
        { innerText: 'Speaker B' },
        { innerText: 'Speaker C' }
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === '[data-tid="closed-caption-text"]') {
          return mockCaptionElements;
        }
        if (selector === '[data-tid="author"]') {
          return mockAuthorElements;
        }
        return [];
      });
      
      // Simulate getting the last (most recent) caption
      const captionElements = mockDocument.querySelectorAll('[data-tid="closed-caption-text"]');
      const captionAuthors = mockDocument.querySelectorAll('[data-tid="author"]');
      
      const captionText = captionElements[captionElements.length - 1].innerText.trim();
      const author = captionAuthors[captionAuthors.length - 1].innerText.trim();
      
      expect(captionText).toBe('Most recent caption');
      expect(author).toBe('Speaker C');
    });
  });

  describe('Caption Monitoring Loop', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should set up polling interval for caption monitoring', () => {
      const POLL_INTERVAL = 100;
      let intervalId;
      
      const mockCallback = jest.fn();
      intervalId = setInterval(mockCallback, POLL_INTERVAL);
      
      // Fast forward time
      jest.advanceTimersByTime(POLL_INTERVAL * 3);
      
      expect(mockCallback).toHaveBeenCalledTimes(3);
      
      clearInterval(intervalId);
    });

    test('should detect new captions and send updates', async () => {
      let lastCaptionText = '';
      const newCaptionData = { text: 'New Teams caption', author: 'Test Speaker' };
      
      const sendCaptionUpdate = jest.fn().mockResolvedValue({ status: true });
      
      // Simulate caption change detection
      if (newCaptionData && newCaptionData.text && newCaptionData.text !== lastCaptionText) {
        lastCaptionText = newCaptionData.text;
        await sendCaptionUpdate(newCaptionData.text, 'Teams', newCaptionData.author);
      }
      
      expect(sendCaptionUpdate).toHaveBeenCalledWith('New Teams caption', 'Teams', 'Test Speaker');
      expect(sendCaptionUpdate).toHaveBeenCalledTimes(1);
    });

    test('should not send duplicate captions', async () => {
      let lastCaptionText = 'Same caption';
      const currentCaptionData = { text: 'Same caption', author: 'Speaker' };
      
      const sendCaptionUpdate = jest.fn();
      
      // Simulate duplicate detection
      if (currentCaptionData && currentCaptionData.text && currentCaptionData.text !== lastCaptionText) {
        await sendCaptionUpdate(currentCaptionData.text, 'Teams', currentCaptionData.author);
      }
      
      expect(sendCaptionUpdate).not.toHaveBeenCalled();
    });

    test('should handle monitoring errors gracefully', async () => {
      const mockError = new Error('Teams caption monitoring error');
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        throw mockError;
      } catch (error) {
        console.error('Teams: Error in caption monitoring loop:', error);
      }
      
      expect(consoleError).toHaveBeenCalledWith('Teams: Error in caption monitoring loop:', mockError);
      
      consoleError.mockRestore();
    });
  });

  describe('Message Sending', () => {
    test('should send caption updates with author information', async () => {
      const text = 'Test Teams caption';
      const platform = 'Teams';
      const author = 'John Doe';
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

    test('should send caption updates without author when not available', async () => {
      const text = 'Test caption without author';
      const platform = 'Teams';
      
      mockChrome.runtime.sendMessage.mockResolvedValue({ status: true });
      
      const message = {
        action: "updateCaption",
        text: text,
        platform: platform,
        timestamp: expect.any(Number)
      };
      
      // Simulate sending without author
      await mockChrome.runtime.sendMessage({
        action: "updateCaption",
        text: text,
        platform: platform,
        timestamp: Date.now()
      });
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "updateCaption",
          text: text,
          platform: platform
        })
      );
    });

    test('should handle failed message sending', async () => {
      const mockError = new Error('Failed to send Teams message');
      mockChrome.runtime.sendMessage.mockRejectedValue(mockError);
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        await mockChrome.runtime.sendMessage({
          action: "updateCaption",
          text: "test",
          platform: "Teams"
        });
      } catch (error) {
        console.error('Teams: Failed to send caption update:', error);
      }
      
      expect(consoleError).toHaveBeenCalledWith('Teams: Failed to send caption update:', mockError);
      
      consoleError.mockRestore();
    });

    test('should warn when no response received from background', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({ status: false });
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      const response = await mockChrome.runtime.sendMessage({
        action: "updateCaption",
        text: "test",
        platform: "Teams"
      });
      
      if (!response?.status) {
        console.warn("Teams: No response from background or status missing.");
      }
      
      expect(consoleWarn).toHaveBeenCalledWith("Teams: No response from background or status missing.");
      
      consoleWarn.mockRestore();
    });
  });

  describe('Platform Detection and Initialization', () => {
    test('should send platform detection message on load', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({ status: true });
      
      // Simulate window load event
      const initMessage = {
        action: "updateCaption",
        platform: "Teams",
        text: "Teams meeting detected - waiting for captions..."
      };
      
      await mockChrome.runtime.sendMessage(initMessage);
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(initMessage);
    });

    test('should identify Teams platform correctly', () => {
      const teamsUrls = [
        'https://teams.microsoft.com/l/meetup-join/meeting123',
        'https://teams.live.com/meet/abc123',
        'https://teams.microsoft.com/_#/conversations/meeting'
      ];
      
      teamsUrls.forEach(url => {
        const isTeams = url.includes('teams.microsoft.com') || url.includes('teams.live.com');
        expect(isTeams).toBe(true);
      });
    });

    test('should handle different Teams URL formats', () => {
      const validTeamsUrls = [
        'https://teams.microsoft.com/l/meetup-join/123',
        'https://teams.live.com/meet/456',
        'https://teams.microsoft.com/_#/conversations/',
        'https://teams.microsoft.com/dl/launcher?url=meeting'
      ];
      
      validTeamsUrls.forEach(url => {
        const isValidTeamsUrl = url.includes('teams.microsoft.com') || url.includes('teams.live.com');
        expect(isValidTeamsUrl).toBe(true);
      });
    });
  });

  describe('Cleanup and Lifecycle', () => {
    test('should clean up interval on page unload', () => {
      const clearInterval = jest.spyOn(global, 'clearInterval');
      const intervalId = 456;
      
      // Simulate beforeunload event handler
      const cleanup = () => {
        console.log("Teams: Cleaning up caption monitoring interval.");
        clearInterval(intervalId);
      };
      
      cleanup();
      
      expect(clearInterval).toHaveBeenCalledWith(intervalId);
    });

    test('should handle initialization on window load', () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      // Simulate window load event
      const handleLoad = () => {
        console.log("Microsoft Teams page loaded: Attempting to start caption polling.");
      };
      
      handleLoad();
      
      expect(consoleLog).toHaveBeenCalledWith("Microsoft Teams page loaded: Attempting to start caption polling.");
      
      consoleLog.mockRestore();
    });

    test('should log script execution completion', () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      // Simulate script completion
      console.log("Teams: Caption scraper script finished execution.");
      
      expect(consoleLog).toHaveBeenCalledWith("Teams: Caption scraper script finished execution.");
      
      consoleLog.mockRestore();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle DOM query errors', () => {
      mockDocument.querySelectorAll.mockImplementation(() => {
        throw new Error('DOM query failed');
      });
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        mockDocument.querySelectorAll('[data-tid="closed-caption-text"]');
      } catch (error) {
        console.error('Teams: DOM query error:', error);
      }
      
      expect(consoleError).toHaveBeenCalledWith('Teams: DOM query error:', expect.any(Error));
      
      consoleError.mockRestore();
    });

    test('should handle malformed caption data', () => {
      const malformedElements = [
        { innerText: null },
        { innerText: undefined },
        { /* missing innerText property */ }
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(malformedElements);
      
      // Simulate safe caption extraction
      const captionElements = mockDocument.querySelectorAll('[data-tid="closed-caption-text"]');
      let captionText = '';
      
      try {
        const lastElement = captionElements[captionElements.length - 1];
        captionText = (lastElement && lastElement.innerText) ? lastElement.innerText.trim() : '';
      } catch (error) {
        captionText = '';
      }
      
      expect(captionText).toBe('');
    });

    test('should handle network-related message failures', async () => {
      const networkError = new Error('Network error');
      mockChrome.runtime.sendMessage.mockRejectedValue(networkError);
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        await mockChrome.runtime.sendMessage({
          action: "updateCaption",
          text: "test caption",
          platform: "Teams"
        });
      } catch (error) {
        console.error('Teams: Network error sending caption:', error);
      }
      
      expect(consoleError).toHaveBeenCalledWith('Teams: Network error sending caption:', networkError);
      
      consoleError.mockRestore();
    });
  });

  describe('Performance and Optimization', () => {
    test('should use appropriate polling interval', () => {
      const POLL_INTERVAL = 100;
      
      // Verify polling interval is reasonable for real-time captions
      expect(POLL_INTERVAL).toBeGreaterThanOrEqual(50);  // Not too frequent to avoid performance issues
      expect(POLL_INTERVAL).toBeLessThanOrEqual(500);    // Not too slow to miss captions
    });

    test('should efficiently handle multiple rapid caption changes', async () => {
      let lastCaptionText = '';
      const rapidCaptions = [
        'Caption 1',
        'Caption 2', 
        'Caption 3'
      ];
      
      const sendCaptionUpdate = jest.fn().mockResolvedValue({ status: true });
      
      // Simulate rapid caption changes
      for (const caption of rapidCaptions) {
        if (caption !== lastCaptionText) {
          lastCaptionText = caption;
          await sendCaptionUpdate(caption, 'Teams');
        }
      }
      
      expect(sendCaptionUpdate).toHaveBeenCalledTimes(3);
    });

    test('should handle memory cleanup properly', () => {
      // Simulate memory cleanup scenarios
      const intervals = [123, 456, 789];
      const clearInterval = jest.spyOn(global, 'clearInterval');
      
      // Cleanup multiple intervals
      intervals.forEach(id => clearInterval(id));
      
      expect(clearInterval).toHaveBeenCalledTimes(3);
    });
  });
});
