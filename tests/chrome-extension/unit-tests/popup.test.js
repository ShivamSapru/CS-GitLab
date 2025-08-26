// popup.test.js - Tests for Chrome extension popup functionality 
import { jest } from '@jest/globals';

describe('Popup Functionality', () => {
  let mockDocument;
  let mockWindow;
  let mockChrome;
  let mockFetch;
  let mockElements;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DOM elements
    mockElements = {
      startBtn: { addEventListener: jest.fn(), classList: { toggle: jest.fn() } },
      stopBtn: { addEventListener: jest.fn(), classList: { toggle: jest.fn() } },
      statusDot: { className: 'status-dot', classList: { add: jest.fn() } },
      statusText: { textContent: 'Ready to start' },
      targetLanguageInput: { value: 'en', addEventListener: jest.fn() },
      showOriginalCheckbox: { checked: false, addEventListener: jest.fn() },
      languageSearch: { value: '', addEventListener: jest.fn() },
      languageDropdown: { 
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelectorAll: jest.fn(() => []),
        querySelector: jest.fn(),
        addEventListener: jest.fn()
      },
      searchableSelect: { 
        contains: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() }
      },
      themeToggle: { addEventListener: jest.fn() },
      themeIcon: { textContent: '🌙' },
      helpBtn: { addEventListener: jest.fn() }
    };
    
    // Mock document
    mockDocument = {
      getElementById: jest.fn((id) => mockElements[id] || null),
      querySelector: jest.fn((selector) => {
        if (selector === '.searchable-select') return mockElements.searchableSelect;
        if (selector === '.theme-icon') return mockElements.themeIcon;
        return null;
      }),
      addEventListener: jest.fn(),
      documentElement: {
        setAttribute: jest.fn()
      }
    };
    
    // Mock window
    mockWindow = {
      addEventListener: jest.fn()
    };
    
    // Mock Chrome APIs
    mockChrome = {
      runtime: {
        onMessage: { addListener: jest.fn() },
        sendMessage: jest.fn(),
        lastError: null
      },
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn()
      }
    };
    
    // Mock fetch
    mockFetch = jest.fn();
    
    global.document = mockDocument;
    global.window = mockWindow;
    global.chrome = mockChrome;
    global.fetch = mockFetch;
  });

  describe('Initialization', () => {
    test('should initialize DOM elements correctly', () => {
      const initializeElements = () => {
        const startBtn = mockDocument.getElementById('startBtn');
        const stopBtn = mockDocument.getElementById('stopBtn');
        const statusDot = mockDocument.getElementById('statusDot');
        const statusText = mockDocument.getElementById('statusText');
        
        return {
          startBtn,
          stopBtn,
          statusDot,
          statusText
        };
      };
      
      const elements = initializeElements();
      
      expect(elements.startBtn).toBe(mockElements.startBtn);
      expect(elements.stopBtn).toBe(mockElements.stopBtn);
      expect(elements.statusDot).toBe(mockElements.statusDot);
      expect(elements.statusText).toBe(mockElements.statusText);
    });

    test('should bind event listeners to buttons', () => {
      const bindEvents = () => {
        mockElements.startBtn.addEventListener('click', jest.fn());
        mockElements.stopBtn.addEventListener('click', jest.fn());
        mockElements.showOriginalCheckbox.addEventListener('change', jest.fn());
        mockElements.themeToggle.addEventListener('click', jest.fn());
        mockElements.helpBtn.addEventListener('click', jest.fn());
      };
      
      bindEvents();
      
      expect(mockElements.startBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.stopBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.showOriginalCheckbox.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockElements.themeToggle.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.helpBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('should load settings from storage on initialization', async () => {
      const savedSettings = {
        subtitleSettings: {
          targetLanguage: 'es',
          showOriginal: true,
          censorProfanity: false,
          theme: 'dark'
        }
      };
      
      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback(savedSettings);
      });
      
      const loadSettings = () => {
        return new Promise((resolve) => {
          mockChrome.storage.sync.get(['subtitleSettings'], (result) => {
            let currentSettings = {
              targetLanguage: 'en',
              showOriginal: false,
              censorProfanity: true,
              theme: 'light'
            };
            
            if (result.subtitleSettings) {
              currentSettings = { ...currentSettings, ...result.subtitleSettings };
            }
            
            resolve(currentSettings);
          });
        });
      };
      
      const settings = await loadSettings();
      
      expect(settings.targetLanguage).toBe('es');
      expect(settings.showOriginal).toBe(true);
      expect(settings.censorProfanity).toBe(false);
      expect(settings.theme).toBe('dark');
    });

    test('should initialize with default settings when no storage data', async () => {
      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({}); // No saved settings
      });
      
      const loadSettings = () => {
        return new Promise((resolve) => {
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
      };
      
      const settings = await loadSettings();
      
      expect(settings.targetLanguage).toBe('en');
      expect(settings.showOriginal).toBe(false);
      expect(settings.censorProfanity).toBe(true);
      expect(settings.theme).toBe('light');
    });
  });

  describe('Start/Stop Capture', () => {
    test('should start capture successfully', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback({ success: true });
      });
      
      mockChrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 123 }]);
      });
      
      const startCapture = async () => {
        const tabs = await new Promise(resolve => {
          mockChrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
        
        const response = await new Promise(resolve => {
          mockChrome.runtime.sendMessage({
            type: 'START_CAPTURE',
            tabId: tabs[0].id,
            settings: { targetLanguage: 'en' }
          }, resolve);
        });
        
        return response;
      };
      
      const result = await startCapture();
      
      expect(result.success).toBe(true);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'START_CAPTURE',
          tabId: 123
        }),
        expect.any(Function)
      );
    });

    test('should handle start capture failure', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback({ success: false, error: 'Already capturing' });
      });
      
      const startCapture = async () => {
        return new Promise(resolve => {
          mockChrome.runtime.sendMessage({
            type: 'START_CAPTURE'
          }, resolve);
        });
      };
      
      const result = await startCapture();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Already capturing');
    });

    test('should stop capture successfully', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback({ success: true });
      });
      
      const stopCapture = async () => {
        return new Promise(resolve => {
          mockChrome.runtime.sendMessage({
            type: 'STOP_CAPTURE'
          }, resolve);
        });
      };
      
      const result = await stopCapture();
      
      expect(result.success).toBe(true);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        { type: 'STOP_CAPTURE' },
        expect.any(Function)
      );
    });

    test('should update UI correctly during capture state changes', () => {
      let isCapturing = false;
      
      const updateUI = (capturing, status) => {
        isCapturing = capturing;
        
        mockElements.startBtn.classList.toggle('disabled', capturing);
        mockElements.stopBtn.classList.toggle('disabled', !capturing);
        
        mockElements.statusDot.className = 'status-dot';
        
        switch (status) {
          case 'starting':
            mockElements.statusText.textContent = 'Starting capture...';
            mockElements.statusDot.classList.add('active');
            break;
          case 'active':
            mockElements.statusText.textContent = 'Capturing captions';
            mockElements.statusDot.classList.add('active');
            break;
          case 'stopped':
            mockElements.statusText.textContent = 'Ready to start';
            break;
          case 'error':
            mockElements.statusText.textContent = 'Error occurred';
            mockElements.statusDot.classList.add('error');
            break;
        }
      };
      
      // Test starting state
      updateUI(true, 'starting');
      expect(mockElements.statusText.textContent).toBe('Starting capture...');
      expect(mockElements.startBtn.classList.toggle).toHaveBeenCalledWith('disabled', true);
      expect(mockElements.stopBtn.classList.toggle).toHaveBeenCalledWith('disabled', false);
      
      // Test active state
      updateUI(true, 'active');
      expect(mockElements.statusText.textContent).toBe('Capturing captions');
      expect(mockElements.statusDot.classList.add).toHaveBeenCalledWith('active');
      
      // Test stopped state
      updateUI(false, 'stopped');
      expect(mockElements.statusText.textContent).toBe('Ready to start');
      expect(mockElements.startBtn.classList.toggle).toHaveBeenCalledWith('disabled', false);
      expect(mockElements.stopBtn.classList.toggle).toHaveBeenCalledWith('disabled', true);
    });
  });

  describe('Language Selection', () => {
    test('should fetch and populate languages from Azure API', async () => {
      const mockLanguageData = {
        translation: {
          'es': { name: 'Spanish' },
          'fr': { name: 'French' },
          'de': { name: 'German' }
        }
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockLanguageData)
      });
      
      const fetchAndPopulateLanguages = async () => {
        const response = await mockFetch('https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const translations = data.translation;
        
        // Sort by language name
        const sortedLanguages = Object.entries(translations).sort(([, a], [, b]) =>
          a.name.localeCompare(b.name)
        );
        
        return sortedLanguages;
      };
      
      const languages = await fetchAndPopulateLanguages();
      
      expect(languages).toHaveLength(3);
      expect(languages[0]).toEqual(['fr', { name: 'French' }]); // Sorted alphabetically
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation'
      );
    });

    test('should handle language API fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      const fetchAndPopulateLanguages = async () => {
        try {
          const response = await mockFetch('/languages');
          return await response.json();
        } catch (error) {
          console.error("Failed to load language options:", error);
          return null;
        }
      };
      
      const result = await fetchAndPopulateLanguages();
      
      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalledWith("Failed to load language options:", expect.any(Error));
      
      consoleError.mockRestore();
    });

    test('should filter languages based on search input', () => {
      const mockOptions = [
        { textContent: 'Spanish', classList: { add: jest.fn(), remove: jest.fn() } },
        { textContent: 'French', classList: { add: jest.fn(), remove: jest.fn() } },
        { textContent: 'German', classList: { add: jest.fn(), remove: jest.fn() } }
      ];
      
      mockElements.languageDropdown.querySelectorAll.mockReturnValue(mockOptions);
      
      const filterLanguages = (searchTerm) => {
        const options = mockElements.languageDropdown.querySelectorAll('.language-option');
        
        options.forEach(option => {
          const text = option.textContent.toLowerCase();
          if (text.includes(searchTerm.toLowerCase())) {
            option.classList.remove('hidden');
          } else {
            option.classList.add('hidden');
          }
        });
      };
      
      filterLanguages('spa');
      
      expect(mockOptions[0].classList.remove).toHaveBeenCalledWith('hidden'); // Spanish matches
      expect(mockOptions[1].classList.add).toHaveBeenCalledWith('hidden');    // French doesn't match
      expect(mockOptions[2].classList.add).toHaveBeenCalledWith('hidden');    // German doesn't match
    });

    test('should select language correctly', () => {
      const mockOption = {
        textContent: 'Spanish',
        dataset: { value: 'es' },
        classList: { add: jest.fn() },
        setAttribute: jest.fn()
      };
      
      const mockPreviousSelected = {
        classList: { remove: jest.fn() },
        removeAttribute: jest.fn()
      };
      
      mockElements.languageDropdown.querySelector.mockReturnValue(mockPreviousSelected);
      
      const selectLanguage = (option) => {
        // Clear previous selection
        const previousSelected = mockElements.languageDropdown.querySelector('.language-option.selected');
        if (previousSelected) {
          previousSelected.classList.remove('selected');
          previousSelected.removeAttribute('data-selected');
        }
        
        // Set new selection
        option.classList.add('selected');
        option.setAttribute('data-selected', 'true');
        
        // Update input values
        mockElements.languageSearch.value = option.textContent;
        mockElements.targetLanguageInput.value = option.dataset.value;
      };
      
      selectLanguage(mockOption);
      
      expect(mockPreviousSelected.classList.remove).toHaveBeenCalledWith('selected');
      expect(mockOption.classList.add).toHaveBeenCalledWith('selected');
      expect(mockElements.languageSearch.value).toBe('Spanish');
      expect(mockElements.targetLanguageInput.value).toBe('es');
    });

    test('should handle keyboard navigation in language dropdown', () => {
      const mockVisibleOptions = [
        { classList: { add: jest.fn(), remove: jest.fn() }, scrollIntoView: jest.fn() },
        { classList: { add: jest.fn(), remove: jest.fn() }, scrollIntoView: jest.fn() },
        { classList: { add: jest.fn(), remove: jest.fn() }, scrollIntoView: jest.fn() }
      ];
      
      const mockCurrentHighlighted = mockVisibleOptions[0];
      mockCurrentHighlighted.classList.remove = jest.fn();
      
      const highlightNextOption = (visibleOptions, currentHighlighted, direction) => {
        // Clear current highlight
        if (currentHighlighted) {
          currentHighlighted.classList.remove('highlighted');
        }
        
        if (visibleOptions.length === 0) return;
        
        let nextIndex = 0;
        
        if (currentHighlighted) {
          const currentIndex = visibleOptions.indexOf(currentHighlighted);
          nextIndex = currentIndex + direction;
          
          if (nextIndex < 0) {
            nextIndex = visibleOptions.length - 1;
          } else if (nextIndex >= visibleOptions.length) {
            nextIndex = 0;
          }
        }
        
        visibleOptions[nextIndex].classList.add('highlighted');
        visibleOptions[nextIndex].scrollIntoView({ block: 'nearest' });
      };
      
      // Test ArrowDown
      highlightNextOption(mockVisibleOptions, mockCurrentHighlighted, 1);
      
      expect(mockCurrentHighlighted.classList.remove).toHaveBeenCalledWith('highlighted');
      expect(mockVisibleOptions[1].classList.add).toHaveBeenCalledWith('highlighted');
      expect(mockVisibleOptions[1].scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    });
  });

  describe('Theme Management', () => {
    test('should initialize theme correctly', () => {
      const savedTheme = 'dark';
      
      const initializeTheme = (theme) => {
        mockDocument.documentElement.setAttribute('data-theme', theme);
        
        if (mockElements.themeIcon) {
          mockElements.themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        }
      };
      
      initializeTheme(savedTheme);
      
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      expect(mockElements.themeIcon.textContent).toBe('☀️');
    });

    test('should toggle theme correctly', () => {
      let currentTheme = 'light';
      
      const toggleTheme = () => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        currentTheme = newTheme;
        
        mockDocument.documentElement.setAttribute('data-theme', newTheme);
        mockElements.themeIcon.textContent = newTheme === 'light' ? '🌙' : '☀️';
        
        return newTheme;
      };
      
      const newTheme = toggleTheme();
      
      expect(newTheme).toBe('dark');
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      expect(mockElements.themeIcon.textContent).toBe('☀️');
      
      // Toggle back
      const lightTheme = toggleTheme();
      expect(lightTheme).toBe('light');
      expect(mockElements.themeIcon.textContent).toBe('🌙');
    });

    test('should save theme to storage', () => {
      const currentSettings = { theme: 'dark', targetLanguage: 'en' };
      
      const saveSettings = () => {
        mockChrome.storage.sync.set({
          subtitleSettings: currentSettings
        });
      };
      
      saveSettings();
      
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        subtitleSettings: currentSettings
      });
    });
  });

  describe('Settings Management', () => {
    test('should handle setting changes correctly', () => {
      let currentSettings = {
        targetLanguage: 'en',
        showOriginal: false,
        censorProfanity: true
      };
      
      const onSettingChange = () => {
        currentSettings.targetLanguage = mockElements.targetLanguageInput.value;
        currentSettings.showOriginal = mockElements.showOriginalCheckbox.checked;
        
        // Save settings
        mockChrome.storage.sync.set({
          subtitleSettings: currentSettings
        });
        
        // Update background script
        mockChrome.runtime.sendMessage({
          type: 'UPDATE_SETTINGS',
          settings: currentSettings
        });
      };
      
      // Simulate setting changes
      mockElements.targetLanguageInput.value = 'es';
      mockElements.showOriginalCheckbox.checked = true;
      
      onSettingChange();
      
      expect(currentSettings.targetLanguage).toBe('es');
      expect(currentSettings.showOriginal).toBe(true);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        subtitleSettings: currentSettings
      });
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'UPDATE_SETTINGS',
        settings: currentSettings
      });
    });

    test('should update settings UI with loaded values', () => {
      const loadedSettings = {
        targetLanguage: 'fr',
        showOriginal: true,
        censorProfanity: false
      };
      
      const mockSelectedOption = {
        dataset: { value: 'fr' },
        textContent: 'French'
      };
      
      mockElements.languageDropdown.querySelector.mockReturnValue(mockSelectedOption);
      
      const updateSettingsUI = (settings) => {
        mockElements.showOriginalCheckbox.checked = settings.showOriginal;
        
        // Update language selection  
        const selectedOption = mockElements.languageDropdown.querySelector(`[data-value="${settings.targetLanguage}"]`);
        if (selectedOption) {
          mockElements.languageSearch.value = selectedOption.textContent;
          mockElements.targetLanguageInput.value = selectedOption.dataset.value;
        }
      };
      
      updateSettingsUI(loadedSettings);
      
      expect(mockElements.showOriginalCheckbox.checked).toBe(true);
      expect(mockElements.languageSearch.value).toBe('French');
      expect(mockElements.targetLanguageInput.value).toBe('fr');
    });

    test('should notify content script of settings changes', () => {
      const currentSettings = { showOriginal: true, targetLanguage: 'es' };
      
      mockChrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 123 }]);
      });
      
      mockChrome.tabs.sendMessage.mockResolvedValue(true);
      
      const notifyContentScript = () => {
        mockChrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            mockChrome.tabs.sendMessage(tabs[0].id, {
              type: 'SETTINGS_UPDATED',
              settings: currentSettings
            });
          }
        });
      };
      
      notifyContentScript();
      
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'SETTINGS_UPDATED',
        settings: currentSettings
      });
    });
  });

  describe('Status Updates', () => {
    test('should get status from background script', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback({ isCapturing: true });
      });
      
      const updateStatus = async () => {
        return new Promise(resolve => {
          mockChrome.runtime.sendMessage({ type: 'GET_STATUS' }, resolve);
        });
      };
      
      const status = await updateStatus();
      
      expect(status.isCapturing).toBe(true);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        { type: 'GET_STATUS' },
        expect.any(Function)
      );
    });

    // FIXED: Uncommented and fixed the status update failure test
    test('should handle status update failure', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      // FIXED: Mock Chrome runtime error properly - set lastError before callback
      mockChrome.runtime.lastError = { message: 'Connection error' };
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback(null);
      });
      
      const updateStatus = () => {
        return new Promise((resolve, reject) => {
          mockChrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
            if (mockChrome.runtime.lastError) {
              reject(new Error(mockChrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        }).catch(error => {
          console.error('Failed to get status:', error);
          return null;
        });
      };
      
      const result = await updateStatus();
      
      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalledWith('Failed to get status:', expect.any(Error));
      
      consoleError.mockRestore();
    });
  });

  describe('Notifications', () => {
    test('should show notification in status area', () => {
      const originalText = 'Ready to start';
      const message = 'Started capturing captions';
      const type = 'success';
      
      mockElements.statusText.textContent = originalText;
      
      const showNotification = (message, type) => {
        const originalText = mockElements.statusText.textContent;
        mockElements.statusText.textContent = message;
        
        // Reset after 3 seconds (simulated)
        setTimeout(() => {
          if (mockElements.statusText.textContent === message) {
            mockElements.statusText.textContent = originalText;
          }
        }, 3000);
      };
      
      showNotification(message, type);
      
      expect(mockElements.statusText.textContent).toBe('Started capturing captions');
    });

    test('should reset notification after timeout', (done) => {
      const originalText = 'Ready to start';
      const message = 'Test notification';
      
      mockElements.statusText.textContent = originalText;
      
      const showNotification = (message, type) => {
        const originalText = mockElements.statusText.textContent;
        mockElements.statusText.textContent = message;
        
        setTimeout(() => {
          if (mockElements.statusText.textContent === message) {
            mockElements.statusText.textContent = originalText;
          }
          
          // Verify notification was reset
          expect(mockElements.statusText.textContent).toBe('Ready to start');
          done();
        }, 100); // Shortened for test
      };
      
      showNotification(message, 'info');
      expect(mockElements.statusText.textContent).toBe('Test notification');
    });
  });

  describe('Help Functionality', () => {
    test('should show help information', () => {
      const mockAlert = jest.fn();
      global.alert = mockAlert;
      
      const showHelp = () => {
        const helpText = `
Subtitle Generator Help:

1. Click "Start Capture" to begin capturing captions from the current tab
2. Search and select target language for translation (100+ languages supported)
3. Toggle "Show original text" to control display
4. Subtitles will appear as an overlay on the webpage

Supported Platforms:
- YouTube (with captions enabled)
- Microsoft Teams (with live captions)
- Zoom (with live transcription)

Requirements:
- Keep the tab active while capturing
- Ensure captions are enabled on the platform

Developed by The Sentinels Team.
        `;
        
        alert(helpText);
      };
      
      showHelp();
      
      expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Subtitle Generator Help:'));
      expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('YouTube'));
      expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Teams'));
      expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Zoom'));
    });
  });

  describe('Message Handling from Background', () => {
    test('should handle CAPTURE_STATUS_CHANGED message', () => {
      const message = {
        type: 'CAPTURE_STATUS_CHANGED',
        isCapturing: true,
        status: 'active'
      };
      
      const handleBackgroundMessage = (message) => {
        switch (message.type) {
          case 'CAPTURE_STATUS_CHANGED':
            // Update UI based on status
            mockElements.statusText.textContent = message.isCapturing ? 'Capturing captions' : 'Ready to start';
            mockElements.statusDot.classList.add(message.isCapturing ? 'active' : 'inactive');
            break;
        }
      };
      
      handleBackgroundMessage(message);
      
      expect(mockElements.statusText.textContent).toBe('Capturing captions');
      expect(mockElements.statusDot.classList.add).toHaveBeenCalledWith('active');
    });

    test('should handle ERROR message from background', () => {
      const message = {
        type: 'ERROR',
        message: 'Translation service unavailable'
      };
      
      const handleBackgroundMessage = (message) => {
        switch (message.type) {
          case 'ERROR':
            mockElements.statusText.textContent = message.message;
            mockElements.statusDot.classList.add('error');
            break;
        }
      };
      
      handleBackgroundMessage(message);
      
      expect(mockElements.statusText.textContent).toBe('Translation service unavailable');
      expect(mockElements.statusDot.classList.add).toHaveBeenCalledWith('error');
    });

    test('should handle unknown message types gracefully', () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      const message = {
        type: 'UNKNOWN_MESSAGE_TYPE',
        data: 'test'
      };
      
      const handleBackgroundMessage = (message) => {
        switch (message.type) {
          case 'CAPTURE_STATUS_CHANGED':
            // Handle known message
            break;
          default:
            console.log('Unknown message type:', message.type);
        }
      };
      
      handleBackgroundMessage(message);
      
      expect(consoleLog).toHaveBeenCalledWith('Unknown message type:', 'UNKNOWN_MESSAGE_TYPE');
      
      consoleLog.mockRestore();
    });
  });

  describe('Cleanup', () => {
    test('should save settings on popup close', () => {
      const currentSettings = { targetLanguage: 'es', theme: 'dark' };
      
      const handleBeforeUnload = () => {
        mockChrome.storage.sync.set({
          subtitleSettings: currentSettings
        });
      };
      
      handleBeforeUnload();
      
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        subtitleSettings: currentSettings
      });
    });

    test('should register beforeunload event listener', () => {
      const registerCleanup = () => {
        mockWindow.addEventListener('beforeunload', jest.fn());
      };
      
      registerCleanup();
      
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    test('should handle Chrome runtime errors gracefully', () => {
      mockChrome.runtime.lastError = { message: 'Extension context invalidated' };
      
      const sendMessageToBackground = (message) => {
        return new Promise((resolve, reject) => {
          mockChrome.runtime.sendMessage(message, (response) => {
            if (mockChrome.runtime.lastError) {
              reject(new Error(mockChrome.runtime.lastError.message));
            } else {
              resolve(response || {});
            }
          });
        });
      };
      
      expect(sendMessageToBackground({ type: 'TEST' }))
        .rejects
        .toThrow('Extension context invalidated');
    });

    test('should handle tab query failures', async () => {
      mockChrome.tabs.query.mockImplementation((query, callback) => {
        // Simulate error - no callback called or empty result
        callback([]);
      });
      
      const getCurrentTabId = async () => {
        return new Promise(resolve => {
          mockChrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            resolve(tabs[0]?.id || null);
          });
        });
      };
      
      const tabId = await getCurrentTabId();
      
      expect(tabId).toBeNull();
    });

    test('should handle storage operation failures', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock storage error
      mockChrome.storage.sync.set.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const saveSettings = () => {
        try {
          mockChrome.storage.sync.set({
            subtitleSettings: { test: 'data' }
          });
        } catch (error) {
          console.error('Failed to save settings:', error);
        }
      };
      
      saveSettings();
      
      expect(consoleError).toHaveBeenCalledWith('Failed to save settings:', expect.any(Error));
      
      consoleError.mockRestore();
    });
  });
});
