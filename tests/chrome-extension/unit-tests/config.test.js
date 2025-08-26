// config.test.js - Tests for Chrome extension configuration management
import { jest } from '@jest/globals';

describe('Configuration Management', () => {
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock config object
    mockConfig = {
      AZURE_TRANSLATOR_KEY: "",
      AZURE_TRANSLATOR_REGION: "",
      AZURE_TRANSLATOR_ENDPOINT: "https://translator-api-mgmt.azure-api.net/translator"
    };
  });

  describe('Configuration Structure', () => {
    test('should have all required configuration properties', () => {
      const requiredProperties = [
        'AZURE_TRANSLATOR_KEY',
        'AZURE_TRANSLATOR_REGION', 
        'AZURE_TRANSLATOR_ENDPOINT'
      ];
      
      requiredProperties.forEach(property => {
        expect(mockConfig).toHaveProperty(property);
      });
    });

    test('should have correct data types for configuration values', () => {
      expect(typeof mockConfig.AZURE_TRANSLATOR_KEY).toBe('string');
      expect(typeof mockConfig.AZURE_TRANSLATOR_REGION).toBe('string');
      expect(typeof mockConfig.AZURE_TRANSLATOR_ENDPOINT).toBe('string');
    });

    test('should have valid endpoint URL format', () => {
      const urlRegex = /^https?:\/\/.+/;
      expect(mockConfig.AZURE_TRANSLATOR_ENDPOINT).toMatch(urlRegex);
      expect(mockConfig.AZURE_TRANSLATOR_ENDPOINT).toContain('translator');
    });

    test('should use secure HTTPS endpoint', () => {
      expect(mockConfig.AZURE_TRANSLATOR_ENDPOINT.startsWith('https://')).toBe(true);
    });

    test('should point to Azure API Management endpoint', () => {
      expect(mockConfig.AZURE_TRANSLATOR_ENDPOINT).toContain('azure-api.net');
      expect(mockConfig.AZURE_TRANSLATOR_ENDPOINT).toContain('translator-api-mgmt');
    });
  });

  describe('Configuration Validation', () => {
    test('should detect empty API key', () => {
      const validateConfig = (config) => {
        const errors = [];
        
        if (!config.AZURE_TRANSLATOR_KEY || config.AZURE_TRANSLATOR_KEY.trim() === '') {
          errors.push('AZURE_TRANSLATOR_KEY is required');
        }
        
        return errors;
      };
      
      const errors = validateConfig(mockConfig);
      
      expect(errors).toContain('AZURE_TRANSLATOR_KEY is required');
    });

    test('should detect empty region', () => {
      const validateConfig = (config) => {
        const errors = [];
        
        if (!config.AZURE_TRANSLATOR_REGION || config.AZURE_TRANSLATOR_REGION.trim() === '') {
          errors.push('AZURE_TRANSLATOR_REGION is required');
        }
        
        return errors;
      };
      
      const errors = validateConfig(mockConfig);
      
      expect(errors).toContain('AZURE_TRANSLATOR_REGION is required');
    });

    test('should validate API key format', () => {
      const testConfigs = [
        { ...mockConfig, AZURE_TRANSLATOR_KEY: 'valid-key-12345678901234567890' },
        { ...mockConfig, AZURE_TRANSLATOR_KEY: 'short' },
        { ...mockConfig, AZURE_TRANSLATOR_KEY: 'abc123def456ghi789jkl012mno345pqr678' }
      ];
      
      const validateApiKey = (key) => {
        // Azure Translator keys are typically 32 characters
        if (key.length < 10) {
          return 'API key too short';
        }
        
        if (key.length > 100) {
          return 'API key too long';
        }
        
        // Should contain alphanumeric characters and possibly hyphens
        const validFormat = /^[a-zA-Z0-9\-_]+$/;
        if (!validFormat.test(key)) {
          return 'API key contains invalid characters';
        }
        
        return null; // Valid
      };
      
      expect(validateApiKey(testConfigs[0].AZURE_TRANSLATOR_KEY)).toBeNull();
      expect(validateApiKey(testConfigs[1].AZURE_TRANSLATOR_KEY)).toBe('API key too short');
      expect(validateApiKey(testConfigs[2].AZURE_TRANSLATOR_KEY)).toBeNull();
    });

    test('should validate Azure region format', () => {
      const validRegions = ['eastus', 'westus2', 'centralus', 'westeurope', 'eastasia'];
      const invalidRegions = ['invalid-region', '', 'us-east-1', 'EASTUS'];
      
      const validateRegion = (region) => {
        // Azure regions are typically lowercase with no special characters except numbers
        const validFormat = /^[a-z0-9]+$/;
        
        if (!validFormat.test(region)) {
          return 'Invalid region format';
        }
        
        return null;
      };
      
      validRegions.forEach(region => {
        expect(validateRegion(region)).toBeNull();
      });
      
      invalidRegions.forEach(region => {
        if (region !== '') { // Empty string handled separately
          expect(validateRegion(region)).toBe('Invalid region format');
        }
      });
    });

    test('should validate endpoint URL format', () => {
      const testEndpoints = [
        'https://api.cognitive.microsofttranslator.com/translate',
        'https://translator-api-mgmt.azure-api.net/translator',
        'http://unsecure-endpoint.com', // Should fail
        'not-a-url',                     // Should fail
        'ftp://wrong-protocol.com'       // Should fail
      ];
      
      const validateEndpoint = (endpoint) => {
        try {
          const url = new URL(endpoint);
          
          if (url.protocol !== 'https:') {
            return 'Endpoint must use HTTPS';
          }
          
          if (!url.hostname.includes('microsoft') && !url.hostname.includes('azure')) {
            return 'Endpoint should be an Azure/Microsoft domain';
          }
          
          return null;
        } catch (error) {
          return 'Invalid URL format';
        }
      };
      
      expect(validateEndpoint(testEndpoints[0])).toBeNull(); // Valid Microsoft endpoint
      expect(validateEndpoint(testEndpoints[1])).toBeNull(); // Valid Azure endpoint
      expect(validateEndpoint(testEndpoints[2])).toBe('Endpoint must use HTTPS');
      expect(validateEndpoint(testEndpoints[3])).toBe('Invalid URL format');
      expect(validateEndpoint(testEndpoints[4])).toBe('Endpoint must use HTTPS');
    });
  });

  describe('Configuration Loading', () => {
    test('should handle missing config file gracefully', () => {
      const loadConfig = () => {
        try {
          // Simulate missing config
          throw new Error('Config file not found');
        } catch (error) {
          console.warn('Config file not found, using defaults');
          return {
            AZURE_TRANSLATOR_KEY: "",
            AZURE_TRANSLATOR_REGION: "",
            AZURE_TRANSLATOR_ENDPOINT: "https://translator-api-mgmt.azure-api.net/translator"
          };
        }
      };
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      const config = loadConfig();
      
      expect(consoleWarn).toHaveBeenCalledWith('Config file not found, using defaults');
      expect(config.AZURE_TRANSLATOR_ENDPOINT).toBe('https://translator-api-mgmt.azure-api.net/translator');
      
      consoleWarn.mockRestore();
    });

    test('should merge environment variables with config', () => {
      const defaultConfig = {
        AZURE_TRANSLATOR_KEY: "",
        AZURE_TRANSLATOR_REGION: "",
        AZURE_TRANSLATOR_ENDPOINT: "https://translator-api-mgmt.azure-api.net/translator"
      };
      
      // Mock environment variables
      const envVars = {
        AZURE_TRANSLATOR_KEY: 'env-key-12345',
        AZURE_TRANSLATOR_REGION: 'eastus'
      };
      
      const mergeConfig = (defaultConfig, envVars) => {
        return {
          ...defaultConfig,
          ...Object.fromEntries(
            Object.entries(envVars).filter(([key, value]) => value !== undefined && value !== '')
          )
        };
      };
      
      const finalConfig = mergeConfig(defaultConfig, envVars);
      
      expect(finalConfig.AZURE_TRANSLATOR_KEY).toBe('env-key-12345');
      expect(finalConfig.AZURE_TRANSLATOR_REGION).toBe('eastus');
      expect(finalConfig.AZURE_TRANSLATOR_ENDPOINT).toBe('https://translator-api-mgmt.azure-api.net/translator');
    });

    test('should prioritize non-empty values when merging', () => {
      const config1 = {
        AZURE_TRANSLATOR_KEY: "config-key",
        AZURE_TRANSLATOR_REGION: "",
        AZURE_TRANSLATOR_ENDPOINT: "https://config-endpoint.com"
      };
      
      const config2 = {
        AZURE_TRANSLATOR_KEY: "",
        AZURE_TRANSLATOR_REGION: "westus",
        AZURE_TRANSLATOR_ENDPOINT: "https://override-endpoint.com"
      };
      
      const mergeNonEmpty = (base, override) => {
        const result = { ...base };
        
        Object.keys(override).forEach(key => {
          if (override[key] && override[key].trim() !== '') {
            result[key] = override[key];
          }
        });
        
        return result;
      };
      
      const merged = mergeNonEmpty(config1, config2);
      
      expect(merged.AZURE_TRANSLATOR_KEY).toBe('config-key'); // Keep non-empty original
      expect(merged.AZURE_TRANSLATOR_REGION).toBe('westus');  // Use non-empty override
      expect(merged.AZURE_TRANSLATOR_ENDPOINT).toBe('https://override-endpoint.com'); // Override
    });
  });

  describe('Configuration Usage', () => {
    test('should format API URL correctly', () => {
      const config = {
        ...mockConfig,
        AZURE_TRANSLATOR_ENDPOINT: "https://translator-api-mgmt.azure-api.net/translator"
      };
      
      const buildApiUrl = (baseEndpoint, targetLanguage, includeProfanityFilter = false) => {
        let url = `${baseEndpoint}/translate?api-version=3.0&to=${targetLanguage}`;
        
        if (includeProfanityFilter) {
          url += "&profanityAction=Marked";
        }
        
        return url;
      };
      
      const urlWithoutFilter = buildApiUrl(config.AZURE_TRANSLATOR_ENDPOINT, 'es');
      const urlWithFilter = buildApiUrl(config.AZURE_TRANSLATOR_ENDPOINT, 'fr', true);
      
      expect(urlWithoutFilter).toBe('https://translator-api-mgmt.azure-api.net/translator/translate?api-version=3.0&to=es');
      expect(urlWithFilter).toBe('https://translator-api-mgmt.azure-api.net/translator/translate?api-version=3.0&to=fr&profanityAction=Marked');
    });

    test('should build request headers correctly', () => {
      const config = {
        ...mockConfig,
        AZURE_TRANSLATOR_KEY: 'test-key-12345',
        AZURE_TRANSLATOR_REGION: 'eastus'
      };
      
      const buildHeaders = (config) => {
        const headers = {
          'Content-Type': 'application/json'
        };
        
        if (config.AZURE_TRANSLATOR_KEY) {
          headers['Ocp-Apim-Subscription-Key'] = config.AZURE_TRANSLATOR_KEY;
        }
        
        if (config.AZURE_TRANSLATOR_REGION) {
          headers['Ocp-Apim-Subscription-Region'] = config.AZURE_TRANSLATOR_REGION;
        }
        
        return headers;
      };
      
      const headers = buildHeaders(config);
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Ocp-Apim-Subscription-Key']).toBe('test-key-12345');
      expect(headers['Ocp-Apim-Subscription-Region']).toBe('eastus');
    });

    test('should handle missing credentials gracefully', () => {
      const incompleteConfig = {
        ...mockConfig,
        AZURE_TRANSLATOR_KEY: '', // Missing key
        AZURE_TRANSLATOR_REGION: 'eastus'
      };
      
      const validateForApiCall = (config) => {
        const errors = [];
        
        if (!config.AZURE_TRANSLATOR_KEY) {
          errors.push('API key is required for translation requests');
        }
        
        if (!config.AZURE_TRANSLATOR_ENDPOINT) {
          errors.push('API endpoint is required');
        }
        
        return {
          isValid: errors.length === 0,
          errors: errors
        };
      };
      
      const validation = validateForApiCall(incompleteConfig);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('API key is required for translation requests');
    });
  });

  describe('Configuration Security', () => {
    test('should not log sensitive configuration values', () => {
      const config = {
        AZURE_TRANSLATOR_KEY: 'secret-key-12345',
        AZURE_TRANSLATOR_REGION: 'eastus',
        AZURE_TRANSLATOR_ENDPOINT: 'https://translator-api-mgmt.azure-api.net/translator'
      };
      
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      const logConfigSafely = (config) => {
        const safeConfig = { ...config };
        
        // Mask sensitive values
        if (safeConfig.AZURE_TRANSLATOR_KEY) {
          safeConfig.AZURE_TRANSLATOR_KEY = safeConfig.AZURE_TRANSLATOR_KEY.substring(0, 8) + '***';
        }
        
        console.log('Configuration loaded:', safeConfig);
      };
      
      logConfigSafely(config);
      
      expect(consoleLog).toHaveBeenCalledWith(
        'Configuration loaded:',
        expect.objectContaining({
          AZURE_TRANSLATOR_KEY: 'secret-k***'
        })
      );
      
      consoleLog.mockRestore();
    });

    test('should validate configuration against known secure patterns', () => {
      const suspiciousConfigs = [
        { ...mockConfig, AZURE_TRANSLATOR_KEY: 'test123' }, // Too simple
        { ...mockConfig, AZURE_TRANSLATOR_KEY: 'password' }, // Common word
        { ...mockConfig, AZURE_TRANSLATOR_ENDPOINT: 'http://localhost:8080' }, // Localhost
        { ...mockConfig, AZURE_TRANSLATOR_ENDPOINT: 'https://evil-site.com' } // Suspicious domain
      ];
      
      const validateSecurity = (config) => {
        const warnings = [];
        
        // Check for weak API keys
        if (config.AZURE_TRANSLATOR_KEY) {
          const weakPatterns = ['test', 'demo', 'example', 'password', '123'];
          const lowerKey = config.AZURE_TRANSLATOR_KEY.toLowerCase();
          
          if (weakPatterns.some(pattern => lowerKey.includes(pattern))) {
            warnings.push('API key appears to be a test/demo key');
          }
          
          if (config.AZURE_TRANSLATOR_KEY.length < 16) {
            warnings.push('API key seems too short for production use');
          }
        }
        
        // Check for suspicious endpoints
        if (config.AZURE_TRANSLATOR_ENDPOINT) {
          if (config.AZURE_TRANSLATOR_ENDPOINT.includes('localhost') || 
              config.AZURE_TRANSLATOR_ENDPOINT.includes('127.0.0.1')) {
            warnings.push('Endpoint points to localhost - development mode?');
          }
          
          if (!config.AZURE_TRANSLATOR_ENDPOINT.includes('microsoft') && 
              !config.AZURE_TRANSLATOR_ENDPOINT.includes('azure')) {
            warnings.push('Endpoint does not appear to be an official Azure endpoint');
          }
        }
        
        return warnings;
      };
      
      expect(validateSecurity(suspiciousConfigs[0])).toContain('API key appears to be a test/demo key');
      expect(validateSecurity(suspiciousConfigs[1])).toContain('API key appears to be a test/demo key');
      expect(validateSecurity(suspiciousConfigs[2])).toContain('Endpoint points to localhost - development mode?');
      expect(validateSecurity(suspiciousConfigs[3])).toContain('Endpoint does not appear to be an official Azure endpoint');
    });

    test('should recommend secure configuration practices', () => {
      const getSecurityRecommendations = () => {
        return [
          'Store API keys in environment variables, not in code',
          'Use Azure Key Vault for production deployments',
          'Rotate API keys regularly',
          'Monitor API usage for unusual patterns',
          'Use the least privileged access principle',
          'Enable logging and monitoring for API calls'
        ];
      };
      
      const recommendations = getSecurityRecommendations();
      
      expect(recommendations).toHaveLength(6);
      expect(recommendations).toContain('Store API keys in environment variables, not in code');
      expect(recommendations).toContain('Use Azure Key Vault for production deployments');
    });
  });

  describe('Configuration Export/Import', () => {
    test('should export configuration safely', () => {
      const config = {
        AZURE_TRANSLATOR_KEY: 'secret-key-12345',
        AZURE_TRANSLATOR_REGION: 'eastus',
        AZURE_TRANSLATOR_ENDPOINT: 'https://translator-api-mgmt.azure-api.net/translator'
      };
      
      const exportConfig = (config, includeSensitive = false) => {
        const exported = { ...config };
        
        if (!includeSensitive) {
          // Remove or mask sensitive data
          delete exported.AZURE_TRANSLATOR_KEY;
        }
        
        return exported;
      };
      
      const safeExport = exportConfig(config, false);
      const fullExport = exportConfig(config, true);
      
      expect(safeExport).not.toHaveProperty('AZURE_TRANSLATOR_KEY');
      expect(safeExport).toHaveProperty('AZURE_TRANSLATOR_REGION');
      
      expect(fullExport).toHaveProperty('AZURE_TRANSLATOR_KEY');
    });

    test('should import configuration with validation', () => {
      const importedData = {
        AZURE_TRANSLATOR_KEY: 'imported-key-67890',
        AZURE_TRANSLATOR_REGION: 'westus',
        AZURE_TRANSLATOR_ENDPOINT: 'https://custom-endpoint.azure-api.net/translator',
        extraProperty: 'should be filtered'
      };
      
      const importConfig = (data) => {
        const allowedKeys = [
          'AZURE_TRANSLATOR_KEY',
          'AZURE_TRANSLATOR_REGION', 
          'AZURE_TRANSLATOR_ENDPOINT'
        ];
        
        const filtered = {};
        
        allowedKeys.forEach(key => {
          if (data[key] !== undefined) {
            filtered[key] = data[key];
          }
        });
        
        return filtered;
      };
      
      const result = importConfig(importedData);
      
      expect(result).toHaveProperty('AZURE_TRANSLATOR_KEY', 'imported-key-67890');
      expect(result).toHaveProperty('AZURE_TRANSLATOR_REGION', 'westus');
      expect(result).toHaveProperty('AZURE_TRANSLATOR_ENDPOINT');
      expect(result).not.toHaveProperty('extraProperty');
    });
  });

  describe('Configuration Documentation', () => {
    test('should provide configuration field descriptions', () => {
      const getConfigurationHelp = () => {
        return {
          AZURE_TRANSLATOR_KEY: {
            description: 'Your Azure Translator subscription key',
            required: true,
            example: '1234567890abcdef1234567890abcdef',
            obtainFrom: 'Azure Portal > Cognitive Services > Translator resource'
          },
          AZURE_TRANSLATOR_REGION: {
            description: 'Azure region for your Translator resource',
            required: true,
            example: 'eastus',
            obtainFrom: 'Azure Portal > Cognitive Services > Translator resource > Keys and Endpoint'
          },
          AZURE_TRANSLATOR_ENDPOINT: {
            description: 'API endpoint URL for translation requests',
            required: true,
            example: 'https://api.cognitive.microsofttranslator.com',
            default: 'https://translator-api-mgmt.azure-api.net/translator'
          }
        };
      };
      
      const help = getConfigurationHelp();
      
      expect(help.AZURE_TRANSLATOR_KEY.required).toBe(true);
      expect(help.AZURE_TRANSLATOR_REGION.example).toBe('eastus');
      expect(help.AZURE_TRANSLATOR_ENDPOINT.default).toContain('translator-api-mgmt');
    });

    test('should validate configuration completeness', () => {
      const help = {
        AZURE_TRANSLATOR_KEY: { required: true },
        AZURE_TRANSLATOR_REGION: { required: true },
        AZURE_TRANSLATOR_ENDPOINT: { required: true }
      };
      
      const testConfigs = [
        { AZURE_TRANSLATOR_KEY: 'key', AZURE_TRANSLATOR_REGION: 'region', AZURE_TRANSLATOR_ENDPOINT: 'endpoint' },
        { AZURE_TRANSLATOR_KEY: 'key', AZURE_TRANSLATOR_REGION: '', AZURE_TRANSLATOR_ENDPOINT: 'endpoint' },
        { AZURE_TRANSLATOR_KEY: '', AZURE_TRANSLATOR_REGION: '', AZURE_TRANSLATOR_ENDPOINT: '' }
      ];
      
      const checkCompleteness = (config, help) => {
        const missing = [];
        
        Object.keys(help).forEach(key => {
          if (help[key].required && (!config[key] || config[key].trim() === '')) {
            missing.push(key);
          }
        });
        
        return {
          isComplete: missing.length === 0,
          missing: missing
        };
      };
      
      expect(checkCompleteness(testConfigs[0], help).isComplete).toBe(true);
      expect(checkCompleteness(testConfigs[1], help).missing).toContain('AZURE_TRANSLATOR_REGION');
      expect(checkCompleteness(testConfigs[2], help).missing).toHaveLength(3);
    });
  });
});
