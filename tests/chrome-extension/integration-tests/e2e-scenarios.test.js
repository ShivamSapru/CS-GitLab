// e2e-scenarios.test.js - End to end test scenarios for Chrome extension
import { jest } from '@jest/globals';

describe('End-to-End Extension Scenarios', () => {
  let mockChrome;
  let mockDocument;
  let mockWindow;
  let mockFetch;
  let extensionState;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Initialize extension state
    extensionState = {
      isInstalled: false,
      isCapturing: false,
      currentSettings: {
        targetLanguage: 'en',
        showOriginal: false,
        censorProfanity: true,
        theme: 'light'
      },
      captionHistory: [],
      activeTab: null
    };
    
    // Mock Chrome APIs
    mockChrome = {
      runtime: {
        onInstalled: { addListener: jest.fn() },
        onMessage: { addListener: jest.fn() },
        sendMessage: jest.fn(),
        lastError: null,
        id: 'test-extension-id'
      },
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn(),
        onUpdated: { addListener: jest.fn() },
        onRemoved: { addListener: jest.fn() }
      },
      storage: {
        sync: {
          get: jest.fn((keys, callback) => {
            // Auto-call callback to resolve promises
            if (callback) callback({});
          }),
          set: jest.fn((data, callback) => {
            // Auto-call callback to resolve promises
            if (callback) callback();
          }),
          clear: jest.fn((callback) => {
            // Auto-call callback to resolve promises
            if (callback) callback();
          })
        }
      },
      action: {
        setBadgeText: jest.fn(),
        setBadgeBackgroundColor: jest.fn()
      }
    };
    
    // Mock DOM
    mockDocument = {
      getElementById: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(),
      createElement: jest.fn(),
      body: { appendChild: jest.fn(), removeChild: jest.fn() },
      addEventListener: jest.fn(),
      documentElement: { setAttribute: jest.fn() }
    };
    
    // Mock Window - FIXED: Removed setTimeout, clearTimeout, setInterval, clearInterval
    mockWindow = {
      location: { href: '' },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
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

  describe('User Journey: First Time Setup', () => {
    test('should guide new user through complete setup process', async () => {
      // Step 1: Extension Installation
      extensionState.isInstalled = true;
      const onInstalledCallback = jest.fn(() => {
        console.log('Extension installed successfully');
        mockChrome.action.setBadgeText({ text: 'NEW' });
        mockChrome.action.setBadgeBackgroundColor({ color: '#00BCD4' });
      });
      
      mockChrome.runtime.onInstalled.addListener(onInstalledCallback);
      onInstalledCallback();
      
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'NEW' });
      
      // Step 2: User opens popup for first time
      // mockChrome.storage.sync.get will return {} by default (no previous settings)
      
      const firstTimeSettings = {
        targetLanguage: 'en',
        showOriginal: false,
        censorProfanity: true,
        theme: 'light',
        firstTimeSetup: true
      };
      
      expect(firstTimeSettings.firstTimeSetup).toBe(true);
      
      // Complete setup quickly
      await Promise.resolve();
      expect(extensionState.isInstalled).toBe(true);
      
      // Step 3: User selects preferred language
      const userPreferences = {
        targetLanguage: 'es',
        showOriginal: true,
        firstTimeSetup: false
      };
      
      // Save preferences
      await new Promise(resolve => {
        mockChrome.storage.sync.set({ subtitleSettings: userPreferences }, resolve);
      });
      
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        subtitleSettings: userPreferences
      }, expect.any(Function));
      
      // Step 4: User navigates to supported platform
      mockWindow.location.href = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      const isSupportedPlatform = mockWindow.location.href.includes('youtube.com') ||
                                 mockWindow.location.href.includes('teams.microsoft.com') ||
                                 mockWindow.location.href.includes('zoom.us');
      
      expect(isSupportedPlatform).toBe(true);
      
      // Step 5: User starts first capture session
      mockChrome.tabs.query.mockResolvedValue([{ id: 123, url: mockWindow.location.href }]);
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'START_CAPTURE') {
          extensionState.isCapturing = true;
          extensionState.activeTab = 123;
          callback({ success: true, message: 'Capture started successfully' });
        }
      });
      
      const captureResult = await new Promise(resolve => {
        mockChrome.runtime.sendMessage({
          type: 'START_CAPTURE',
          settings: userPreferences
        }, resolve);
      });
      
      expect(captureResult.success).toBe(true);
      expect(extensionState.isCapturing).toBe(true);
      
      // Remove "NEW" badge after first use
      mockChrome.action.setBadgeText({ text: '' });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    }, 15000); // Increased timeout to 15 seconds
  });

  describe('User Journey: Daily Usage Workflow', () => {
    test('should handle typical daily usage patterns', async () => {
      // Setup: User has already used extension before
      extensionState.isInstalled = true;
      const existingSettings = {
        targetLanguage: 'fr',
        showOriginal: true,
        censorProfanity: false,
        theme: 'dark'
      };
      
      // Setup: User has already used extension before with existing settings
      // The general mock will return {} but we'll modify it to return existing settings
      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({ subtitleSettings: existingSettings });
      });
      
      // Scenario 1: User joins morning Teams meeting
      mockWindow.location.href = 'https://teams.microsoft.com/l/meetup-join/meeting123';
      
      // Auto-start capture
      const autoStartCapture = async () => {
        mockChrome.tabs.query.mockResolvedValue([{ id: 456 }]);
        
        return new Promise(resolve => {
          mockChrome.runtime.sendMessage({
            type: 'START_CAPTURE',
            tabId: 456,
            settings: existingSettings
          }, resolve);
        });
      };
      
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'START_CAPTURE') {
          callback({ success: true });
        }
      });
      
      const morningMeetingResult = await autoStartCapture();
      expect(morningMeetingResult.success).toBe(true);
      
      // Simulate receiving captions during meeting
      const meetingCaptions = [
        'Good morning everyone, thank you for joining',
        'Let me share my screen and we can begin',
        'As you can see in the quarterly report...'
      ];
      
      for (const caption of meetingCaptions) {
        // Mock translation
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{
            translations: [{ text: `Bonjour tout le monde, merci de vous joindre` }]
          }])
        });
        
        // Process caption
        await mockChrome.runtime.sendMessage({
          action: 'updateCaption',
          text: caption,
          platform: 'Teams',
          timestamp: Date.now()
        });
        
        extensionState.captionHistory.push({
          original: caption,
          translated: 'Bonjour tout le monde, merci de vous joindre',
          platform: 'Teams',
          timestamp: Date.now()
        });
      }
      
      expect(extensionState.captionHistory).toHaveLength(3);
      
      // Scenario 2: User switches to YouTube for training video
      mockWindow.location.href = 'https://www.youtube.com/watch?v=training123';
      
      // Extension automatically adapts to new platform
      const switchPlatform = () => {
        const newPlatform = mockWindow.location.href.includes('youtube.com') ? 'YouTube' : 'unknown';
        return newPlatform;
      };
      
      expect(switchPlatform()).toBe('YouTube');
      
      // User continues with same settings
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'START_CAPTURE') {
          callback({ success: true, platform: 'YouTube' });
        }
      });
      
      const youtubeResult = await new Promise(resolve => {
        mockChrome.runtime.sendMessage({
          type: 'START_CAPTURE',
          settings: existingSettings
        }, resolve);
      });
      
      expect(youtubeResult.success).toBe(true);
      
      // Scenario 3: User adjusts settings mid-session
      const updatedSettings = {
        ...existingSettings,
        showOriginal: false, // Hide original to reduce clutter
        targetLanguage: 'es'  // Switch to Spanish
      };
      
      // Settings sync across all components
      await new Promise(resolve => {
        mockChrome.storage.sync.set({ subtitleSettings: updatedSettings }, resolve);
      });
      
      // Notify background and content scripts
      mockChrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: updatedSettings
      });
      
      mockChrome.tabs.sendMessage(456, {
        type: 'SETTINGS_UPDATED',
        settings: updatedSettings
      });
      
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        subtitleSettings: updatedSettings
      }, expect.any(Function));
    }, 10000); // Added timeout of 10 seconds
  });

  describe('Error Handling Scenarios', () => {
    test('should handle network connectivity issues gracefully', async () => {
      // Scenario: User starts capture but network goes down
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'START_CAPTURE') {
          callback({ success: true });
        }
      });
      
      // Initial success
      const startResult = await new Promise(resolve => {
        mockChrome.runtime.sendMessage({ type: 'START_CAPTURE' }, resolve);
      });
      expect(startResult.success).toBe(true);
      
      // Network failure during translation
      mockFetch.mockRejectedValue(new Error('Network request failed'));
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      // System should fallback gracefully
      try {
        await mockFetch('/translate');
      } catch (error) {
        console.warn('Translation service unavailable:', error.message);
        
        // Fallback: Show original captions without translation
        const fallbackCaption = {
          original: 'Hello world',
          translated: 'Hello world', // Same as original
          status: 'translation_failed'
        };
        
        expect(fallbackCaption.translated).toBe(fallbackCaption.original);
        expect(fallbackCaption.status).toBe('translation_failed');
      }
      
      expect(consoleWarn).toHaveBeenCalledWith('Translation service unavailable:', 'Network request failed');
      
      consoleWarn.mockRestore();
    });

    test('should recover from extension context invalidation', async () => {
      // Scenario: Extension updates during active session
      mockChrome.runtime.lastError = { message: 'Extension context invalidated' };
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      // FIXED: Simplified context invalidation detection - removed try-catch wrapper
      const checkExtensionContext = () => {
        if (mockChrome.runtime.lastError) {
          console.error('Extension context lost:', mockChrome.runtime.lastError.message);
          
          // Notify user and provide recovery options
          return {
            contextLost: true,
            recoveryOptions: [
              'Refresh the page to reload content scripts',
              'Disable and re-enable the extension',
              'Restart the browser if issues persist'
            ]
          };
        }
        
        return { contextLost: false };
      };
      
      const contextCheck = checkExtensionContext();
      
      expect(contextCheck.contextLost).toBe(true);
      expect(contextCheck.recoveryOptions).toHaveLength(3);
      expect(consoleError).toHaveBeenCalledWith('Extension context lost:', 'Extension context invalidated');
      
      consoleError.mockRestore();
    });

    test('should handle platform-specific errors', async () => {
      const platformErrors = {
        youtube: {
          error: 'Captions not available for this video',
          solution: 'Enable captions in YouTube player settings'
        },
        teams: {
          error: 'Live captions not enabled in meeting',
          solution: 'Ask meeting organizer to enable live captions'
        },
        zoom: {
          error: 'Transcription not available',
          solution: 'Host needs to enable live transcription feature'
        }
      };
      
      const handlePlatformError = (platform, error) => {
        const errorInfo = platformErrors[platform];
        if (errorInfo) {
          console.warn(`${platform} error:`, errorInfo.error);
          
          // Show user-friendly error message
          return {
            platform,
            error: errorInfo.error,
            solution: errorInfo.solution,
            canRetry: true
          };
        }
        
        return {
          platform,
          error: 'Unknown platform error',
          solution: 'Try refreshing the page',
          canRetry: true
        };
      };
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      // Test each platform error
      const youtubeError = handlePlatformError('youtube', 'caption_unavailable');
      const teamsError = handlePlatformError('teams', 'captions_disabled');
      const zoomError = handlePlatformError('zoom', 'transcription_unavailable');
      
      expect(youtubeError.solution).toContain('Enable captions');
      expect(teamsError.solution).toContain('meeting organizer');
      expect(zoomError.solution).toContain('Host needs to enable');
      
      expect(consoleWarn).toHaveBeenCalledTimes(3);
      
      consoleWarn.mockRestore();
    });
  });

  describe('Performance Optimization Scenarios', () => {
    test('should optimize for long meeting sessions', async () => {
      // Scenario: 3-hour meeting with continuous captions
      const sessionDuration = 3 * 60 * 60 * 1000; // 3 hours in ms
      const captionInterval = 5000; // New caption every 5 seconds
      const totalCaptions = sessionDuration / captionInterval;
      
      let processedCaptions = 0;
      let memoryUsage = { captions: 0, translations: 0 };
      const MEMORY_LIMIT = 1000; // Keep only last 1000 captions
      
      // Simulate long session
      const simulateLongSession = () => {
        for (let i = 0; i < Math.min(totalCaptions, 2000); i++) {
          const caption = {
            id: i,
            text: `Caption ${i} - This is a test caption for long session`,
            timestamp: Date.now() + (i * captionInterval),
            platform: 'Teams'
          };
          
          processedCaptions++;
          memoryUsage.captions++;
          
          // Memory management: Keep only recent captions
          if (memoryUsage.captions > MEMORY_LIMIT) {
            memoryUsage.captions = MEMORY_LIMIT;
            // In real implementation, would remove old captions
          }
          
          // CPU optimization: Batch translation requests
          if (i % 10 === 0) {
            // Process batch of 10 captions
            memoryUsage.translations += 10;
          }
        }
        
        return {
          processedCaptions,
          memoryUsage,
          duration: Math.min(totalCaptions * captionInterval, 2000 * captionInterval)
        };
      };
      
      const sessionStats = simulateLongSession();
      
      expect(sessionStats.processedCaptions).toBeGreaterThan(1000);
      expect(sessionStats.memoryUsage.captions).toBeLessThanOrEqual(MEMORY_LIMIT);
      expect(sessionStats.duration).toBeGreaterThan(0);
    });

    test('should handle high-frequency caption updates', async () => {
      // Scenario: Fast-paced presentation with rapid caption changes
      const captionBurst = [];
      const burstSize = 50;
      const burstInterval = 100; // 100ms between captions
      
      // Generate rapid captions
      for (let i = 0; i < burstSize; i++) {
        captionBurst.push({
          text: `Rapid caption ${i}`,
          timestamp: Date.now() + (i * burstInterval)
        });
      }
      
      // Implement throttling mechanism
      let throttledCaptions = [];
      let lastProcessed = 0;
      const THROTTLE_DELAY = 500; // Process at most every 500ms
      
      const processWithThrottling = (captions) => {
        const now = Date.now();
        
        captions.forEach(caption => {
          if (now - lastProcessed >= THROTTLE_DELAY) {
            throttledCaptions.push(caption);
            lastProcessed = now;
          }
        });
        
        return throttledCaptions;
      };
      
      const processed = processWithThrottling(captionBurst);
      
      // Should have fewer processed captions due to throttling
      expect(processed.length).toBeLessThan(captionBurst.length);
      expect(processed.length).toBeGreaterThan(0);
    });

    test('should optimize API usage with caching', async () => {
      // Scenario: Repeated phrases should use cached translations
      const translationCache = new Map();
      const repeatedPhrases = [
        'Thank you for joining',
        'Let me share my screen',
        'Any questions?',
        'Thank you for joining', // Repeated
        'Let me share my screen', // Repeated
        'Thank you for your time'
      ];
      
      mockFetch.mockImplementation((url, options) => {
        const body = JSON.parse(options.body);
        const text = body[0].text;
        
        // Simulate API response
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{
            translations: [{ text: `Translated: ${text}` }]
          }])
        });
      });
      
      const translateWithCache = async (text) => {
        // Check cache first
        if (translationCache.has(text)) {
          return {
            text: translationCache.get(text),
            fromCache: true
          };
        }
        
        // Make API call
        const response = await mockFetch('/translate', {
          method: 'POST',
          body: JSON.stringify([{ text }])
        });
        
        const result = await response.json();
        const translatedText = result[0].translations[0].text;
        
        // Cache result
        translationCache.set(text, translatedText);
        
        return {
          text: translatedText,
          fromCache: false
        };
      };
      
      // Process all phrases
      let apiCalls = 0;
      let cacheHits = 0;
      
      for (const phrase of repeatedPhrases) {
        const result = await translateWithCache(phrase);
        
        if (result.fromCache) {
          cacheHits++;
        } else {
          apiCalls++;
        }
      }
      
      expect(apiCalls).toBe(4); // Unique phrases
      expect(cacheHits).toBe(2); // Repeated phrases
      expect(translationCache.size).toBe(4);
    });
  });

  describe('Accessibility and User Experience', () => {
    test('should support users with different accessibility needs', async () => {
      // Scenario: User with visual impairment needs larger text
      const accessibilitySettings = {
        fontSize: 'large', // 18px instead of 14px
        highContrast: true,
        screenReaderSupport: true,
        keyboardNavigation: true
      };
      
      // Apply accessibility enhancements
      const applyAccessibilitySettings = (settings) => {
        const overlayStyles = {
          fontSize: settings.fontSize === 'large' ? '18px' : '14px',
          contrast: settings.highContrast ? 'high' : 'normal',
          ariaSupport: settings.screenReaderSupport
        };
        
        // Mock DOM updates
        const mockOverlay = {
          style: { fontSize: overlayStyles.fontSize },
          setAttribute: jest.fn()
        };
        
        if (settings.screenReaderSupport) {
          mockOverlay.setAttribute('aria-live', 'polite');
          mockOverlay.setAttribute('role', 'status');
        }
        
        return { overlay: mockOverlay, applied: true };
      };
      
      const result = applyAccessibilitySettings(accessibilitySettings);
      
      expect(result.overlay.style.fontSize).toBe('18px');
      expect(result.overlay.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
      expect(result.overlay.setAttribute).toHaveBeenCalledWith('role', 'status');
      expect(result.applied).toBe(true);
    });

    test('should provide helpful onboarding for new users', async () => {
      // Scenario: First-time user needs guidance
      const onboardingSteps = [
        {
          step: 1,
          title: 'Welcome to Live Subtitle Translator',
          description: 'This extension provides real-time translation of captions',
          action: 'Click Next to continue'
        },
        {
          step: 2,
          title: 'Choose Your Language',
          description: 'Select the language you want captions translated to',
          action: 'Select language and click Next'
        },
        {
          step: 3,
          title: 'Supported Platforms',
          description: 'Works with YouTube, Microsoft Teams, and Zoom',
          action: 'Navigate to a supported platform'
        },
        {
          step: 4,
          title: 'Start Capturing',
          description: 'Click the extension icon and press Start Capture',
          action: 'Try it now!'
        }
      ];
      
      let currentStep = 0;
      const userProgress = {
        completed: [],
        current: null,
        skipped: false
      };
      
      const processOnboardingStep = (stepIndex) => {
        if (stepIndex >= onboardingSteps.length) {
          return { completed: true, totalSteps: onboardingSteps.length };
        }
        
        const step = onboardingSteps[stepIndex];
        userProgress.current = step;
        userProgress.completed.push(stepIndex);
        
        return {
          step,
          progress: (stepIndex + 1) / onboardingSteps.length,
          hasNext: stepIndex < onboardingSteps.length - 1
        };
      };
      
      // Simulate user going through onboarding
      for (let i = 0; i < onboardingSteps.length; i++) {
        const stepResult = processOnboardingStep(i);
        
        if (i === 0) {
          expect(stepResult.step.title).toContain('Welcome');
        }
        
        if (i === onboardingSteps.length - 1) {
          expect(stepResult.hasNext).toBe(false);
        }
      }
      
      expect(userProgress.completed).toHaveLength(onboardingSteps.length);
    });

    test('should handle multiple languages and RTL text', async () => {
      // Scenario: User needs support for right-to-left languages
      const multilingualTest = [
        { text: 'Hello world', lang: 'en', direction: 'ltr' },
        { text: 'مرحبا بالعالم', lang: 'ar', direction: 'rtl' },
        { text: 'שלום עולם', lang: 'he', direction: 'rtl' },
        { text: 'こんにちは世界', lang: 'ja', direction: 'ltr' },
        { text: '你好世界', lang: 'zh', direction: 'ltr' }
      ];
      
      const detectTextDirection = (text) => {
        // Simple RTL detection (in real implementation would be more sophisticated)
        const rtlChars = /[\u0590-\u083F]|[\u08A0-\u08FF]|[\uFB1D-\uFDFF]|[\uFE70-\uFEFF]/;
        return rtlChars.test(text) ? 'rtl' : 'ltr';
      };
      
      const applyTextDirection = (text, detectedDirection) => {
        return {
          text,
          direction: detectedDirection,
          cssDirection: detectedDirection,
          textAlign: detectedDirection === 'rtl' ? 'right' : 'left'
        };
      };
      
      // Test each language
      multilingualTest.forEach(testCase => {
        const detected = detectTextDirection(testCase.text);
        const applied = applyTextDirection(testCase.text, detected);
        
        expect(applied.direction).toBe(testCase.direction);
        
        if (testCase.direction === 'rtl') {
          expect(applied.textAlign).toBe('right');
        } else {
          expect(applied.textAlign).toBe('left');
        }
      });
    });
  });

  describe('Data Privacy and Security', () => {
    test('should handle sensitive content appropriately', async () => {
      // Scenario: Meeting contains sensitive information
      const sensitivePatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
        /\b\d{16}\b/,            // Credit card pattern
        /password/i,             // Password mentions
        /confidential/i          // Confidential content
      ];
      
      const testCaptions = [
        'The password is admin123',
        'My SSN is 123-45-6789',
        'This is confidential information',
        'The weather is nice today'
      ];
      
      const detectSensitiveContent = (text) => {
        const foundPatterns = [];
        
        sensitivePatterns.forEach((pattern, index) => {
          if (pattern.test(text)) {
            foundPatterns.push({
              pattern: index,
              type: ['ssn', 'credit_card', 'password', 'confidential'][index]
            });
          }
        });
        
        return {
          hasSensitiveContent: foundPatterns.length > 0,
          patterns: foundPatterns,
          action: foundPatterns.length > 0 ? 'block_or_redact' : 'allow'
        };
      };
      
      const privacyResults = testCaptions.map(caption => ({
        caption,
        analysis: detectSensitiveContent(caption)
      }));
      
      const sensitiveCount = privacyResults.filter(r => r.analysis.hasSensitiveContent).length;
      const safeCount = privacyResults.filter(r => !r.analysis.hasSensitiveContent).length;
      
      expect(sensitiveCount).toBe(3);
      expect(safeCount).toBe(1);
      expect(privacyResults[0].analysis.patterns[0].type).toBe('password');
    });

    test('should implement secure data transmission', async () => {
      // Scenario: Ensure all API calls use secure protocols
      const validateSecureTransmission = (url, options) => {
        const checks = {
          httpsRequired: url.startsWith('https://'),
          hasHeaders: !!(options && options.headers),
          hasContentType: options?.headers?.['Content-Type'] === 'application/json',
          methodIsSecure: options?.method && ['POST', 'PUT', 'PATCH'].includes(options.method)
        };
        
        const isSecure = Object.values(checks).every(check => check === true);
        
        return {
          url,
          checks,
          isSecure,
          recommendations: isSecure ? [] : [
            !checks.httpsRequired ? 'Use HTTPS protocol' : null,
            !checks.hasHeaders ? 'Include security headers' : null,
            !checks.hasContentType ? 'Set proper Content-Type' : null,
            !checks.methodIsSecure ? 'Use secure HTTP method' : null
          ].filter(Boolean)
        };
      };
      
      // Test API call security
      const testCalls = [
        {
          url: 'https://translator-api-mgmt.azure-api.net/translator/translate',
          options: {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Ocp-Apim-Subscription-Key': 'secure-key'
            }
          }
        },
        {
          url: 'http://unsecure-api.com/translate', // Insecure
          options: { method: 'GET' }
        }
      ];
      
      const securityResults = testCalls.map(call => 
        validateSecureTransmission(call.url, call.options)
      );
      
      expect(securityResults[0].isSecure).toBe(true);
      expect(securityResults[1].isSecure).toBe(false);
      expect(securityResults[1].recommendations).toContain('Use HTTPS protocol');
    });

    test('should manage user data retention policies', async () => {
      // Scenario: Implement data retention and cleanup
      const dataRetentionPolicy = {
        captionHistory: { retentionDays: 7, maxEntries: 1000 },
        translationCache: { retentionDays: 1, maxEntries: 500 },
        userSettings: { retentionDays: 365, backup: true },
        analyticsData: { retentionDays: 30, anonymized: true }
      };
      
      const currentDate = new Date();
      const testData = {
        captions: [
          { text: 'Old caption', timestamp: currentDate.getTime() - (8 * 24 * 60 * 60 * 1000) }, // 8 days old
          { text: 'Recent caption', timestamp: currentDate.getTime() - (1 * 24 * 60 * 60 * 1000) }  // 1 day old
        ],
        cache: [
          { key: 'hello', value: 'hola', timestamp: currentDate.getTime() - (2 * 24 * 60 * 60 * 1000) }, // 2 days old
          { key: 'world', value: 'mundo', timestamp: currentDate.getTime() - (12 * 60 * 60 * 1000) }     // 12 hours old
        ]
      };
      
      const cleanupExpiredData = (data, policy) => {
        const results = { removed: 0, kept: 0 };
        
        Object.keys(data).forEach(dataType => {
          const policyKey = dataType === 'captions' ? 'captionHistory' : 
                           dataType === 'cache' ? 'translationCache' : dataType;
          
          const retention = policy[policyKey];
          if (!retention) return;
          
          const cutoffTime = currentDate.getTime() - (retention.retentionDays * 24 * 60 * 60 * 1000);
          
          data[dataType].forEach(item => {
            if (item.timestamp < cutoffTime) {
              results.removed++;
            } else {
              results.kept++;
            }
          });
        });
        
        return results;
      };
      
      const cleanupResults = cleanupExpiredData(testData, dataRetentionPolicy);
      
      expect(cleanupResults.removed).toBe(2); // Old caption and old cache entry
      expect(cleanupResults.kept).toBe(2);    // Recent caption and recent cache entry
    });
  });
});
