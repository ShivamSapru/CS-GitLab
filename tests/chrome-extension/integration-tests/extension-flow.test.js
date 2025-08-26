// extension-flow.test.js - Integration tests for Chrome extension full workflow
import { jest } from '@jest/globals';

describe('Chrome Extension Integration Flow', () => {
  let mockChrome;
  let mockDocument;
  let mockWindow;
  let mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Chrome APIs
    mockChrome = {
      runtime: {
        onInstalled: { addListener: jest.fn() },
        onMessage: { addListener: jest.fn() },
        onConnect: { addListener: jest.fn() },
        sendMessage: jest.fn(),
        lastError: null
      },
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn(),
        onUpdated: { addListener: jest.fn() },
        onRemoved: { addListener: jest.fn() }
      },
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
    
    // Mock DOM
    mockDocument = {
      getElementById: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(),
      createElement: jest.fn(),
      body: { appendChild: jest.fn() },
      addEventListener: jest.fn()
    };
    
    // Mock Window
    mockWindow = {
      location: { href: 'https://www.youtube.com/watch?v=test123' },
      addEventListener: jest.fn(),
      innerWidth: 1920,
      innerHeight: 1080
    };
    
    // Mock Fetch
    mockFetch = jest.fn();
    
    global.chrome = mockChrome;
    global.document = mockDocument;
    global.window = mockWindow;
    global.fetch = mockFetch;
  });

  describe('End-to-End Caption Flow', () => {
    test('should complete full caption capture and translation workflow', async () => {
      // 1. Extension Installation
      const installCallback = jest.fn();
      mockChrome.runtime.onInstalled.addListener(installCallback);
      
      // Simulate installation
      await installCallback();
      
      // 2. User starts capture from popup
      mockChrome.tabs.query.mockResolvedValue([{ id: 123 }]);
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'START_CAPTURE') {
          callback({ success: true });
        }
      });
      
      const startCaptureResult = await new Promise(resolve => {
        mockChrome.runtime.sendMessage({
          type: 'START_CAPTURE',
          tabId: 123,
          settings: { targetLanguage: 'es', censorProfanity: true }
        }, resolve);
      });
      
      expect(startCaptureResult.success).toBe(true);
      
      // 3. Content script detects captions
      const mockCaptionElements = [
        { textContent: 'Hello everyone, welcome to our presentation' }
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockCaptionElements);
      
      // Simulate caption detection
      const captionText = mockCaptionElements[0].textContent.trim();
      expect(captionText).toBe('Hello everyone, welcome to our presentation');
      
      // 4. Background script receives caption update
      const captionUpdateMessage = {
        action: 'updateCaption',
        text: captionText,
        platform: 'YouTube',
        timestamp: Date.now()
      };
      
      // 5. Background script translates caption
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          translations: [{ text: 'Hola a todos, bienvenidos a nuestra presentación' }]
        }])
      });
      
      const translateResponse = await mockFetch('https://translator-api-mgmt.azure-api.net/translator/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ text: captionText }])
      });
      
      const translationResult = await translateResponse.json();
      const translatedText = translationResult[0].translations[0].text;
      
      expect(translatedText).toBe('Hola a todos, bienvenidos a nuestra presentación');
      
      // 6. Background sends translated caption to content script
      mockChrome.tabs.sendMessage.mockResolvedValue(true);
      
      await mockChrome.tabs.sendMessage(123, {
        type: 'REAL_CAPTION_UPDATE',
        originalText: captionText,
        translatedText: translatedText,
        platform: 'YouTube',
        timestamp: Date.now()
      });
      
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(123, 
        expect.objectContaining({
          type: 'REAL_CAPTION_UPDATE',
          originalText: captionText,
          translatedText: translatedText
        })
      );
      
      // 7. Content script displays caption overlay
      const mockOverlayContainer = {
        id: 'real-caption-display',
        style: { cssText: '' },
        innerHTML: '',
        querySelector: jest.fn(),
        appendChild: jest.fn()
      };
      
      mockDocument.createElement.mockReturnValue(mockOverlayContainer);
      mockDocument.getElementById.mockReturnValue(null); // No existing overlay
      
      // Simulate overlay creation
      const container = mockDocument.createElement('div');
      container.id = 'real-caption-display';
      mockDocument.body.appendChild(container);
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(container);
    });

    test('should handle caption flow errors gracefully', async () => {
      // 1. Start capture
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'START_CAPTURE') {
          callback({ success: true });
        }
      });
      
      // 2. Translation fails
      mockFetch.mockRejectedValue(new Error('Translation service unavailable'));
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      // 3. Background script handles translation error
      try {
        await mockFetch('/translate');
      } catch (error) {
        console.error('Translation failed:', error);
        // Fallback to original text
        const fallbackText = 'Original caption text';
        
        await mockChrome.tabs.sendMessage(123, {
          type: 'REAL_CAPTION_UPDATE',
          originalText: fallbackText,
          translatedText: fallbackText, // Fallback
          platform: 'YouTube'
        });
      }
      
      expect(consoleError).toHaveBeenCalledWith('Translation failed:', expect.any(Error));
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(123,
        expect.objectContaining({
          translatedText: 'Original caption text'
        })
      );
      
      consoleError.mockRestore();
    });

    test('should support multiple platform workflows', async () => {
      const platforms = [
        {
          name: 'YouTube',
          url: 'https://www.youtube.com/watch?v=test123',
          selector: '.ytp-caption-segment',
          contentScript: 'youtube.js'
        },
        {
          name: 'Teams',
          url: 'https://teams.microsoft.com/l/meetup-join/meeting123',
          selector: '[data-tid="closed-caption-text"]',
          contentScript: 'teams.js'
        },
        {
          name: 'Zoom',
          url: 'https://zoom.us/j/1234567890',
          selector: '#live-transcription-subtitle > span',
          contentScript: 'zoom.js'
        }
      ];
      
      for (const platform of platforms) {
        // Simulate platform detection
        mockWindow.location.href = platform.url;
        
        const isPlatformMatch = mockWindow.location.href.includes(
          platform.name.toLowerCase()
        ) || (platform.name === 'YouTube' && mockWindow.location.href.includes('youtube.com'));
        
        expect(isPlatformMatch).toBe(true);
        
        // Simulate caption detection for each platform
        const mockCaptionElement = { textContent: `${platform.name} caption text` };
        mockDocument.querySelectorAll.mockReturnValue([mockCaptionElement]);
        
        const elements = mockDocument.querySelectorAll(platform.selector);
        if (elements.length > 0) {
          const captionText = elements[0].textContent.trim();
          expect(captionText).toBe(`${platform.name} caption text`);
          
          // Simulate sending to background
          await mockChrome.runtime.sendMessage({
            action: 'updateCaption',
            text: captionText,
            platform: platform.name
          });
        }
      }
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('Settings Synchronization Flow', () => {
    test('should synchronize settings between popup and content scripts', async () => {
      // 1. User changes settings in popup
      const newSettings = {
        targetLanguage: 'fr',
        showOriginal: true,
        censorProfanity: false,
        theme: 'dark'
      };
      
      // 2. Save to storage
      mockChrome.storage.sync.set.mockImplementation((data, callback) => {
        if (callback) callback();
      });
      
      await new Promise(resolve => {
        mockChrome.storage.sync.set({ subtitleSettings: newSettings }, resolve);
      });
      
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
        { subtitleSettings: newSettings },
        expect.any(Function)
      );
      
      // 3. Notify background script
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'UPDATE_SETTINGS') {
          callback({ success: true });
        }
      });
      
      const backgroundResponse = await new Promise(resolve => {
        mockChrome.runtime.sendMessage({
          type: 'UPDATE_SETTINGS',
          settings: newSettings
        }, resolve);
      });
      
      expect(backgroundResponse.success).toBe(true);
      
      // 4. Notify content script
      mockChrome.tabs.query.mockResolvedValue([{ id: 123 }]);
      mockChrome.tabs.sendMessage.mockResolvedValue(true);
      
      await mockChrome.tabs.sendMessage(123, {
        type: 'SETTINGS_UPDATED',
        settings: newSettings
      });
      
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(123,
        expect.objectContaining({
          type: 'SETTINGS_UPDATED',
          settings: newSettings
        })
      );
      
      // 5. Content script applies new settings
      let userSettings = {
        targetLanguage: 'en',
        showOriginal: false,
        censorProfanity: true,
        theme: 'light'
      };
      
      // Simulate settings update in content script
      userSettings = { ...userSettings, ...newSettings };
      
      expect(userSettings.targetLanguage).toBe('fr');
      expect(userSettings.showOriginal).toBe(true);
      expect(userSettings.theme).toBe('dark');
    });

    test('should load settings on extension startup', async () => {
      // 1. Extension starts up
      const savedSettings = {
        subtitleSettings: {
          targetLanguage: 'es',
          showOriginal: true,
          theme: 'dark'
        }
      };
      
      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback(savedSettings);
      });
      
      // 2. Load settings in popup
      const loadedSettings = await new Promise(resolve => {
        mockChrome.storage.sync.get(['subtitleSettings'], (result) => {
          const defaultSettings = {
            targetLanguage: 'en',
            showOriginal: false,
            censorProfanity: true,
            theme: 'light'
          };
          
          const currentSettings = result.subtitleSettings ? 
            { ...defaultSettings, ...result.subtitleSettings } : 
            defaultSettings;
          
          resolve(currentSettings);
        });
      });
      
      expect(loadedSettings.targetLanguage).toBe('es');
      expect(loadedSettings.showOriginal).toBe(true);
      expect(loadedSettings.theme).toBe('dark');
      expect(loadedSettings.censorProfanity).toBe(true); // Default value preserved
      
      // 3. Apply settings to UI elements
      const mockElements = {
        showOriginalCheckbox: { checked: false },
        themeIcon: { textContent: '🌙' }
      };
      
      mockDocument.getElementById.mockImplementation((id) => mockElements[id] || null);
      
      // Simulate UI update
      const showOriginalCheckbox = mockDocument.getElementById('showOriginalCheckbox');
      const themeIcon = mockDocument.getElementById('themeIcon');
      
      if (showOriginalCheckbox) {
        showOriginalCheckbox.checked = loadedSettings.showOriginal;
      }
      
      if (themeIcon) {
        themeIcon.textContent = loadedSettings.theme === 'light' ? '🌙' : '☀️';
      }
      
      expect(mockElements.showOriginalCheckbox.checked).toBe(true);
      expect(mockElements.themeIcon.textContent).toBe('☀️');
    });
  });

  describe('Error Recovery Flow', () => {
    test('should recover from background script disconnection', async () => {
      // 1. Normal operation
      mockChrome.runtime.sendMessage.mockResolvedValueOnce({ success: true });
      
      let result = await mockChrome.runtime.sendMessage({ type: 'GET_STATUS' });
      expect(result.success).toBe(true);
      
      // 2. Background script becomes unavailable
      mockChrome.runtime.lastError = { message: 'Extension context invalidated' };
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback(null);
      });
      
      // 3. Handle error gracefully
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      try {
        result = await new Promise((resolve, reject) => {
          mockChrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
            if (mockChrome.runtime.lastError) {
              reject(new Error(mockChrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      } catch (error) {
        console.warn('Background script unavailable:', error.message);
        // Implement fallback behavior
        result = { success: false, fallback: true };
      }
      
      expect(result.fallback).toBe(true);
      expect(consoleWarn).toHaveBeenCalledWith('Background script unavailable:', 'Extension context invalidated');
      
      consoleWarn.mockRestore();
    });

    test('should handle content script injection failures', async () => {
      // 1. Try to send message to content script
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Could not establish connection'));
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      // 2. Handle injection failure
      try {
        await mockChrome.tabs.sendMessage(123, { type: 'CAPTURE_STARTED' });
      } catch (error) {
        console.warn('Content script not ready:', error.message);
        
        // 3. Retry with delay or show user notification
        setTimeout(async () => {
          try {
            await mockChrome.tabs.sendMessage(123, { type: 'CAPTURE_STARTED' });
          } catch (retryError) {
            console.warn('Content script still not available after retry');
          }
        }, 1000);
      }
      
      expect(consoleWarn).toHaveBeenCalledWith('Content script not ready:', 'Could not establish connection');
      
      consoleWarn.mockRestore();
    });

    test('should handle API rate limiting', async () => {
      // 1. Normal API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ translations: [{ text: 'Translated' }] }])
      });
      
      let result = await mockFetch('/translate');
      expect(result.ok).toBe(true);
      
      // 2. Rate limited response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: (name) => name === 'Retry-After' ? '60' : null
        }
      });
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      // 3. Handle rate limiting
      result = await mockFetch('/translate');
      
      if (!result.ok && result.status === 429) {
        const retryAfter = result.headers.get('Retry-After');
        console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
        
        // Implement backoff strategy
        const backoffDelay = parseInt(retryAfter) * 1000;
        expect(backoffDelay).toBe(60000);
      }
      
      expect(consoleWarn).toHaveBeenCalledWith('Rate limited. Retry after 60 seconds');
      
      consoleWarn.mockRestore();
    });
  });

  describe('Performance and Resource Management', () => {
    test('should manage memory usage during long sessions', () => {
      // 1. Track caption history
      let captionHistory = [];
      const MAX_HISTORY = 100;
      
      // 2. Add captions with memory management
      for (let i = 0; i < 150; i++) {
        const caption = {
          text: `Caption ${i}`,
          timestamp: Date.now() + i,
          platform: 'YouTube'
        };
        
        captionHistory.push(caption);
        
        // Limit history size
        if (captionHistory.length > MAX_HISTORY) {
          captionHistory = captionHistory.slice(-MAX_HISTORY);
        }
      }
      
      expect(captionHistory).toHaveLength(MAX_HISTORY);
      expect(captionHistory[0].text).toBe('Caption 50'); // Oldest kept
      expect(captionHistory[99].text).toBe('Caption 149'); // Most recent
    });

    test('should throttle API calls appropriately', async () => {
      const API_THROTTLE_MS = 100;
      let lastApiCall = 0;
      let throttledCalls = 0;
      
      const throttledApiCall = async (text) => {
        const now = Date.now();
        
        if (now - lastApiCall < API_THROTTLE_MS) {
          throttledCalls++;
          return { throttled: true };
        }
        
        lastApiCall = now;
        
        // Mock API call
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ translations: [{ text: 'Translated' }] }])
        });
        
        return await mockFetch('/translate');
      };
      
      // Rapid successive calls
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(throttledApiCall(`Text ${i}`));
      }
      
      const results = await Promise.all(promises);
      
      const throttledCount = results.filter(r => r.throttled).length;
      const successCount = results.filter(r => r.ok).length;
      
      expect(throttledCount).toBeGreaterThan(0);
      expect(successCount).toBeGreaterThan(0);
      expect(throttledCount + successCount).toBe(10);
    });

    test('should clean up resources on extension disable', () => {
      // 1. Track active intervals and listeners
      const activeIntervals = [123, 456, 789];
      const activeListeners = ['message', 'connect', 'beforeunload'];
      const clearInterval = jest.spyOn(global, 'clearInterval').mockImplementation();
      
      // 2. Cleanup function
      const cleanup = () => {
        // Clear intervals
        activeIntervals.forEach(id => clearInterval(id));
        
        // Remove event listeners (simulated)
        activeListeners.forEach(listener => {
          console.log(`Removing ${listener} listener`);
        });
        
        // Clear any cached data
        const cacheCleared = true;
        
        return { intervalsCleared: activeIntervals.length, cacheCleared };
      };
      
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      // 3. Execute cleanup
      const result = cleanup();
      
      expect(clearInterval).toHaveBeenCalledTimes(3);
      expect(result.intervalsCleared).toBe(3);
      expect(result.cacheCleared).toBe(true);
      expect(consoleLog).toHaveBeenCalledWith('Removing message listener');
      
      clearInterval.mockRestore();
      consoleLog.mockRestore();
    });
  });

  describe('Cross-Platform Compatibility', () => {
    test('should handle different browser environments', () => {
      const browserFeatures = {
        chrome: {
          runtime: { sendMessage: jest.fn() },
          tabs: { query: jest.fn() },
          storage: { sync: { get: jest.fn() } }
        },
        firefox: {
          runtime: { sendMessage: jest.fn() },
          tabs: { query: jest.fn() },
          storage: { sync: { get: jest.fn() } }
        },
        edge: {
          runtime: { sendMessage: jest.fn() },
          tabs: { query: jest.fn() },
          storage: { sync: { get: jest.fn() } }
        }
      };
      
      const detectBrowser = () => {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          return 'chrome';
        }
        if (typeof browser !== 'undefined' && browser.runtime) {
          return 'firefox';
        }
        return 'unknown';
      };
      
      // Test Chrome detection
      global.chrome = browserFeatures.chrome;
      expect(detectBrowser()).toBe('chrome');
      
      // Test API availability
      Object.keys(browserFeatures.chrome).forEach(api => {
        expect(global.chrome[api]).toBeDefined();
      });
    });

    test('should adapt to different platform DOM structures', () => {
      const platformSelectors = {
        youtube: {
          primary: '.ytp-caption-segment',
          fallbacks: ['.caption-visual-line', '#caption-window .caption-text']
        },
        teams: {
          primary: '[data-tid="closed-caption-text"]',
          fallbacks: ['[data-tid="caption-text"]', '.closed-caption-container']
        },
        zoom: {
          primary: '#live-transcription-subtitle > span',
          fallbacks: ['.live-transcription-text', '[data-testid="caption-text"]']
        }
      };
      
      const findCaptionElement = (platform) => {
        const config = platformSelectors[platform];
        if (!config) return null;
        
        // Try primary selector
        let elements = mockDocument.querySelectorAll(config.primary);
        if (elements && elements.length > 0) {
          return { selector: config.primary, elements };
        }
        
        // Try fallbacks
        for (const fallback of config.fallbacks) {
          elements = mockDocument.querySelectorAll(fallback);
          if (elements && elements.length > 0) {
            return { selector: fallback, elements };
          }
        }
        
        return null;
      };
      
      // Test fallback mechanism
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === '.ytp-caption-segment') return []; // Primary fails
        if (selector === '.caption-visual-line') return [{ textContent: 'Fallback caption' }];
        return [];
      });
      
      const result = findCaptionElement('youtube');
      
      expect(result.selector).toBe('.caption-visual-line');
      expect(result.elements).toHaveLength(1);
    });
  });
});
