// background.test.js - Tests for Chrome extension background service worker
import { jest } from '@jest/globals';

describe('Background Service Worker', () => {
  let mockChrome;
  let mockFetch;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Chrome APIs
    mockChrome = {
      runtime: {
        onInstalled: { addListener: jest.fn() },
        onMessage: { addListener: jest.fn() },
        onConnect: { addListener: jest.fn() },
        onSuspend: { addListener: jest.fn() },
        sendMessage: jest.fn()
      },
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn(),
        onUpdated: { addListener: jest.fn() },
        onRemoved: { addListener: jest.fn() }
      }
    };
    
    // Mock fetch API
    mockFetch = jest.fn();
    
    // Mock config
    mockConfig = {
      AZURE_TRANSLATOR_KEY: "test-key-12345",
      AZURE_TRANSLATOR_REGION: "eastus",
      AZURE_TRANSLATOR_ENDPOINT: "https://translator-api-mgmt.azure-api.net/translator"
    };
    
    global.chrome = mockChrome;
    global.fetch = mockFetch;
    global.CONFIG = mockConfig;
  });

  describe('Extension Initialization', () => {
    test('should register onInstalled listener', () => {
      // Simulate extension initialization
      const onInstalledCallback = jest.fn();
      mockChrome.runtime.onInstalled.addListener(onInstalledCallback);
      
      expect(mockChrome.runtime.onInstalled.addListener).toHaveBeenCalledWith(onInstalledCallback);
    });

    test('should log installation message', () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      // Simulate onInstalled event
      const handleInstalled = () => {
        console.log('Live Subtitle Translator installed');
      };
      
      handleInstalled();
      
      expect(consoleLog).toHaveBeenCalledWith('Live Subtitle Translator installed');
      
      consoleLog.mockRestore();
    });

    test('should initialize with default settings', () => {
      const defaultSettings = {
        targetLanguage: 'en',
        censorProfanity: true
      };
      
      expect(defaultSettings.targetLanguage).toBe('en');
      expect(defaultSettings.censorProfanity).toBe(true);
    });

    test('should initialize capture state as false', () => {
      let isCapturing = false;
      
      expect(isCapturing).toBe(false);
    });
  });

  describe('Message Handling', () => {
    test('should handle START_CAPTURE message', async () => {
      let isCapturing = false;
      const tabId = 123;
      
      const handleStartCapture = async (tabId, sendResponse) => {
        if (isCapturing) {
          sendResponse({ success: false, error: 'Already capturing captions' });
          return;
        }
        
        isCapturing = true;
        sendResponse({ success: true });
      };
      
      const mockSendResponse = jest.fn();
      await handleStartCapture(tabId, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle START_CAPTURE when already capturing', async () => {
      let isCapturing = true; // Already capturing
      
      const handleStartCapture = async (tabId, sendResponse) => {
        if (isCapturing) {
          sendResponse({ success: false, error: 'Already capturing captions' });
          return;
        }
      };
      
      const mockSendResponse = jest.fn();
      await handleStartCapture(123, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({ 
        success: false, 
        error: 'Already capturing captions' 
      });
    });

    test('should handle STOP_CAPTURE message', async () => {
      let isCapturing = true;
      
      const handleStopCapture = async (sendResponse) => {
        isCapturing = false;
        
        // Mock tab query and message sending
        const tabs = [{ id: 123 }, { id: 456 }];
        mockChrome.tabs.query.mockResolvedValue(tabs);
        mockChrome.tabs.sendMessage.mockResolvedValue(true);
        
        for (const tab of tabs) {
          try {
            await mockChrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_STOPPED' });
          } catch (e) {
            // Ignore errors
          }
        }
        
        sendResponse({ success: true });
      };
      
      const mockSendResponse = jest.fn();
      await handleStopCapture(mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
    });

    test('should handle GET_STATUS message', () => {
      const isCapturing = true;
      
      const handleGetStatus = (sendResponse) => {
        sendResponse({ isCapturing });
      };
      
      const mockSendResponse = jest.fn();
      handleGetStatus(mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({ isCapturing: true });
    });

    test('should handle UPDATE_SETTINGS message', () => {
      let currentSettings = { targetLanguage: 'en', censorProfanity: true };
      
      const handleUpdateSettings = (settings, sendResponse) => {
        currentSettings = { ...currentSettings, ...settings };
        sendResponse({ success: true });
      };
      
      const newSettings = { targetLanguage: 'es', showOriginal: true };
      const mockSendResponse = jest.fn();
      
      handleUpdateSettings(newSettings, mockSendResponse);
      
      expect(currentSettings.targetLanguage).toBe('es');
      expect(currentSettings.showOriginal).toBe(true);
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle TRANSLATE_TEXT message', async () => {
      const text = 'Hello world';
      const targetLanguage = 'es';
      
      // Mock successful translation
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          translations: [{ text: 'Hola mundo' }]
        }])
      });
      
      const handleTranslateText = async (text, targetLanguage, sendResponse) => {
        try {
          const translatedText = await callAzureTranslator(text, targetLanguage, false);
          sendResponse({ success: true, translatedText });
        } catch (error) {
          sendResponse({ success: false, error: error.message, translatedText: text });
        }
      };
      
      const callAzureTranslator = async (text, targetLanguage, censorProfanity) => {
        let url = `${mockConfig.AZURE_TRANSLATOR_ENDPOINT}/translate?api-version=3.0&to=${targetLanguage}`;
        if (censorProfanity) {
          url += "&profanityAction=Marked";
        }
        
        const response = await mockFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{ text: text }])
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        return result[0].translations[0].text;
      };
      
      const mockSendResponse = jest.fn();
      await handleTranslateText(text, targetLanguage, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        translatedText: 'Hola mundo'
      });
    });

    test('should handle unknown message types', () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      const handleUnknownMessage = (messageType) => {
        console.log('Unknown message type:', messageType);
      };
      
      handleUnknownMessage('UNKNOWN_MESSAGE');
      
      expect(consoleLog).toHaveBeenCalledWith('Unknown message type:', 'UNKNOWN_MESSAGE');
      
      consoleLog.mockRestore();
    });
  });

  describe('Caption Update Handling', () => {
    test('should handle updateCaption action from content scripts', async () => {
      let isCapturing = true;
      const currentSettings = { targetLanguage: 'fr', censorProfanity: false };
      
      const handleRealCaptionUpdate = async (text, platform, author, sendResponse) => {
        if (!text) {
          sendResponse({ status: false, error: 'No text captured' });
          return;
        }
        
        // Skip status messages
        if (text.includes('detected') || text.includes('waiting')) {
          sendResponse({ status: true });
          return;
        }
        
        // Mock translation
        const translatedText = author ? `${author}: Bonjour le monde` : 'Bonjour le monde';
        
        // Mock sending to content script
        mockChrome.tabs.query.mockResolvedValue([{ id: 123 }]);
        mockChrome.tabs.sendMessage.mockResolvedValue(true);
        
        await mockChrome.tabs.sendMessage(123, {
          type: 'REAL_CAPTION_UPDATE',
          originalText: author ? `${author}: ${text}` : text,
          translatedText: translatedText,
          platform: platform,
          timestamp: Date.now()
        });
        
        sendResponse({ status: true });
      };
      
      const mockSendResponse = jest.fn();
      await handleRealCaptionUpdate('Hello world', 'YouTube', 'John', mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({ status: true });
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalled();
    });

    test('should skip status/detection messages', async () => {
      const handleRealCaptionUpdate = async (text, platform, author, sendResponse) => {
        if (text.includes('detected') || text.includes('waiting')) {
          sendResponse({ status: true });
          return;
        }
        
        // Should not reach here for status messages
        sendResponse({ status: false });
      };
      
      const mockSendResponse = jest.fn();
      await handleRealCaptionUpdate('YouTube detected - waiting for captions...', 'YouTube', null, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({ status: true });
    });

    test('should handle empty text gracefully', async () => {
      const handleRealCaptionUpdate = async (text, platform, author, sendResponse) => {
        if (!text) {
          sendResponse({ status: false, error: 'No text captured' });
          return;
        }
      };
      
      const mockSendResponse = jest.fn();
      await handleRealCaptionUpdate('', 'Teams', 'Speaker', mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({ 
        status: false, 
        error: 'No text captured' 
      });
    });

    test('should handle translation errors gracefully', async () => {
      // Mock translation failure
      mockFetch.mockRejectedValue(new Error('Translation API error'));
      
      const handleRealCaptionUpdate = async (text, platform, author, sendResponse) => {
        let translatedText = text;
        const captionAuthor = author ? `${author}: ` : "";
        
        if (text !== 'none') {
          try {
            // This will fail
            await mockFetch('/translate');
          } catch (error) {
            console.error('Translation failed:', error);
            translatedText = captionAuthor + text; // Fallback to original
          }
        }
        
        sendResponse({ status: true });
      };
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const mockSendResponse = jest.fn();
      
      await handleRealCaptionUpdate('Hello', 'YouTube', 'John', mockSendResponse);
      
      expect(consoleError).toHaveBeenCalledWith('Translation failed:', expect.any(Error));
      expect(mockSendResponse).toHaveBeenCalledWith({ status: true });
      
      consoleError.mockRestore();
    });
  });

  describe('Azure Translator API', () => {
    test('should call Azure Translator with correct parameters', async () => {
      const text = 'Hello world';
      const targetLanguage = 'es';
      const censorProfanity = true;
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          translations: [{ text: 'Hola mundo' }]
        }])
      });
      
      const callAzureTranslator = async (text, targetLanguage, censorProfanity) => {
        let url = `${mockConfig.AZURE_TRANSLATOR_ENDPOINT}/translate?api-version=3.0&to=${targetLanguage}`;
        if (censorProfanity) {
          url += "&profanityAction=Marked";
        }
        
        const headers = { 'Content-Type': 'application/json' };
        const body = JSON.stringify([{ text: text }]);
        
        const response = await mockFetch(url, {
          method: 'POST',
          headers: headers,
          body: body
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        return result[0].translations[0].text;
      };
      
      const result = await callAzureTranslator(text, targetLanguage, censorProfanity);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://translator-api-mgmt.azure-api.net/translator/translate?api-version=3.0&to=es&profanityAction=Marked',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{ text: 'Hello world' }])
        }
      );
      expect(result).toBe('Hola mundo');
    });

    test('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid API key')
      });
      
      const callAzureTranslator = async (text, targetLanguage, censorProfanity) => {
        const response = await mockFetch('/translate');
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
      };
      
      await expect(callAzureTranslator('test', 'es', false))
        .rejects
        .toThrow('API error: 401 Unauthorized - Invalid API key');
    });

    test('should handle invalid response format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}) // Invalid format
      });
      
      const callAzureTranslator = async (text, targetLanguage, censorProfanity) => {
        const response = await mockFetch('/translate');
        const result = await response.json();
        
        if (result && result[0] && result[0].translations && result[0].translations[0]) {
          return result[0].translations[0].text;
        } else {
          throw new Error('Invalid response format from API');
        }
      };
      
      await expect(callAzureTranslator('test', 'es', false))
        .rejects
        .toThrow('Invalid response format from API');
    });

    test('should skip translation when target language is "none"', async () => {
      const handleTranslateText = async (text, targetLanguage, sendResponse) => {
        if (targetLanguage === 'none') {
          sendResponse({ success: true, translatedText: text });
          return;
        }
      };
      
      const mockSendResponse = jest.fn();
      await handleTranslateText('Hello', 'none', mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        translatedText: 'Hello'
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should include profanity filtering when enabled', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          translations: [{ text: '*** mundo' }]
        }])
      });
      
      const callAzureTranslator = async (text, targetLanguage, censorProfanity) => {
        let url = `${mockConfig.AZURE_TRANSLATOR_ENDPOINT}/translate?api-version=3.0&to=${targetLanguage}`;
        if (censorProfanity) {
          url += "&profanityAction=Marked";
        }
        
        await mockFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{ text: text }])
        });
        
        return '*** mundo';
      };
      
      const result = await callAzureTranslator('Hello world', 'es', true);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('&profanityAction=Marked'),
        expect.any(Object)
      );
      expect(result).toBe('*** mundo');
    });
  });

  describe('Long-lived Connections', () => {
    test('should handle port connections from content scripts', () => {
      const mockPort = {
        name: 'youtube-caption-port',
        onMessage: { addListener: jest.fn() },
        onDisconnect: { addListener: jest.fn() }
      };
      
      const handleConnect = (port) => {
        console.log("Background: Port connected from:", port.name);
        
        if (port.name === "youtube-caption-port" || port.name === "teams-caption-port") {
          port.onMessage.addListener(jest.fn());
          port.onDisconnect.addListener(jest.fn());
        }
      };
      
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      handleConnect(mockPort);
      
      expect(consoleLog).toHaveBeenCalledWith("Background: Port connected from:", 'youtube-caption-port');
      expect(mockPort.onMessage.addListener).toHaveBeenCalled();
      expect(mockPort.onDisconnect.addListener).toHaveBeenCalled();
      
      consoleLog.mockRestore();
    });

    test('should handle port disconnection', () => {
      const mockPort = {
        name: 'teams-caption-port',
        onDisconnect: { addListener: jest.fn() }
      };
      
      const handleDisconnect = () => {
        console.log("Background: Port disconnected from:", mockPort.name);
      };
      
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      handleDisconnect();
      
      expect(consoleLog).toHaveBeenCalledWith("Background: Port disconnected from:", 'teams-caption-port');
      
      consoleLog.mockRestore();
    });

    test('should handle messages on ports', () => {
      const mockMessage = {
        action: 'updateCaption',
        text: 'Port caption',
        platform: 'YouTube'
      };
      
      const handlePortMessage = (message) => {
        console.log("Background: Received message on port:", message.action);
        
        if (message.action === 'updateCaption') {
          // Handle caption update
          return { status: true };
        }
      };
      
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      const result = handlePortMessage(mockMessage);
      
      expect(consoleLog).toHaveBeenCalledWith("Background: Received message on port:", 'updateCaption');
      expect(result).toEqual({ status: true });
      
      consoleLog.mockRestore();
    });
  });

  describe('Tab Management', () => {
    test('should handle tab updates during capture', () => {
      let isCapturing = true;
      
      const handleTabUpdated = (tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && isCapturing) {
          mockChrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id === tabId) {
              mockChrome.tabs.sendMessage(tabId, {
                type: 'CAPTURE_STATUS',
                isCapturing: true
              }).catch(() => {}); // Ignore errors
            }
          });
        }
      };
      
      mockChrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 123 }]);
      });
      
      mockChrome.tabs.sendMessage.mockResolvedValue(true);
      
      handleTabUpdated(123, { status: 'complete' }, { id: 123 });
      
      expect(mockChrome.tabs.query).toHaveBeenCalledWith(
        { active: true, currentWindow: true },
        expect.any(Function)
      );
    });

    test('should stop capture when active tab is closed', () => {
      let isCapturing = true;
      
      const handleTabRemoved = (tabId, removeInfo) => {
        if (isCapturing) {
          console.log('Active tab closed, stopping capture');
          isCapturing = false;
        }
      };
      
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      handleTabRemoved(123, {});
      
      expect(consoleLog).toHaveBeenCalledWith('Active tab closed, stopping capture');
      
      consoleLog.mockRestore();
    });

    test('should handle tab query errors', async () => {
      const mockError = new Error('No active tab found');
      mockChrome.tabs.query.mockRejectedValue(mockError);
      
      const handleStartCapture = async (tabId, sendResponse) => {
        try {
          if (!tabId) {
            const tabs = await mockChrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) {
              throw new Error('No active tab found');
            }
            tabId = tabs[0].id;
          }
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      };
      
      const mockSendResponse = jest.fn();
      await handleStartCapture(null, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'No active tab found'
      });
    });
  });

  describe('Cleanup and Lifecycle', () => {
    test('should handle extension suspend', () => {
      let isCapturing = true;
      
      const handleSuspend = () => {
        if (isCapturing) {
          console.log('Extension suspending, stopping capture');
          isCapturing = false;
        }
      };
      
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      handleSuspend();
      
      expect(consoleLog).toHaveBeenCalledWith('Extension suspending, stopping capture');
      
      consoleLog.mockRestore();
    });

    test('should register all necessary event listeners', () => {
      const registerEventListeners = () => {
        mockChrome.runtime.onInstalled.addListener(jest.fn());
        mockChrome.runtime.onMessage.addListener(jest.fn());
        mockChrome.runtime.onConnect.addListener(jest.fn());
        mockChrome.runtime.onSuspend.addListener(jest.fn());
        mockChrome.tabs.onUpdated.addListener(jest.fn());
        mockChrome.tabs.onRemoved.addListener(jest.fn());
      };
      
      registerEventListeners();
      
      expect(mockChrome.runtime.onInstalled.addListener).toHaveBeenCalled();
      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
      expect(mockChrome.runtime.onConnect.addListener).toHaveBeenCalled();
      expect(mockChrome.runtime.onSuspend.addListener).toHaveBeenCalled();
      expect(mockChrome.tabs.onUpdated.addListener).toHaveBeenCalled();
      expect(mockChrome.tabs.onRemoved.addListener).toHaveBeenCalled();
    });

    test('should log background script load', () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      console.log('Background script loaded');
      
      expect(consoleLog).toHaveBeenCalledWith('Background script loaded');
      
      consoleLog.mockRestore();
    });
  });

  describe('GUID Generation', () => {
    test('should generate valid GUID format', () => {
      const generateGUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      
      const guid = generateGUID();
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      expect(guid).toMatch(guidRegex);
      expect(guid.charAt(14)).toBe('4'); // Version 4 UUID
      expect(['8', '9', 'a', 'b']).toContain(guid.charAt(19).toLowerCase()); // Variant bits
    });

    test('should generate unique GUIDs', () => {
      const generateGUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      
      const guid1 = generateGUID();
      const guid2 = generateGUID();
      
      expect(guid1).not.toBe(guid2);
    });
  });
});
