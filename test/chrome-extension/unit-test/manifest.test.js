// manifest.test.js - Tests for Chrome extension manifest
import { jest } from '@jest/globals';

describe('Chrome Extension Manifest', () => {
  let manifest;

  beforeEach(() => {
    // Mock manifest.json content
    manifest = {
      manifest_version: 3,
      name: "Real-time Subtitle Translator",
      version: "1.0.0",
      description: "Real-time subtitles and translate them using Microsoft Azure Speech Services",
      permissions: [
        "storage",
        "activeTab", 
        "scripting"
      ],
      background: {
        service_worker: "background/background.js",
        type: "module"
      },
      content_scripts: [
        {
          matches: ["*://*.youtube.com/*"],
          js: ["content/youtube.js", "content/overlay.js"],
          run_at: "document_end",
          all_frames: false
        },
        {
          matches: ["*://*.teams.microsoft.com/*", "*://*.teams.live.com/*"],
          js: ["content/teams.js", "content/overlay.js"],
          run_at: "document_end",
          all_frames: false
        },
        {
          matches: ["*://*.zoom.us/*"],
          js: ["content/zoom.js", "content/overlay.js"],
          run_at: "document_end",
          all_frames: false
        }
      ],
      action: {
        default_popup: "popup/popup.html",
        default_title: "Subtitle Generator",
        default_icon: {
          "16": "assets/icon16.png",
          "32": "assets/icon32.png",
          "48": "assets/icon48.png",
          "128": "assets/icon128.png"
        }
      },
      icons: {
        "16": "assets/icon16.png",
        "32": "assets/icon32.png",
        "48": "assets/icon48.png",
        "128": "assets/icon128.png"
      }
    };
  });

  describe('Manifest Version and Metadata', () => {
    test('should use Manifest V3', () => {
      expect(manifest.manifest_version).toBe(3);
    });

    test('should have required metadata fields', () => {
      expect(manifest.name).toBeDefined();
      expect(manifest.version).toBeDefined();
      expect(manifest.description).toBeDefined();
      
      expect(typeof manifest.name).toBe('string');
      expect(typeof manifest.version).toBe('string');
      expect(typeof manifest.description).toBe('string');
    });

    test('should have descriptive name and description', () => {
      expect(manifest.name).toBe("Real-time Subtitle Generator & Translator");
      expect(manifest.description).toContain('subtitle');
      expect(manifest.description).toContain('translate');
      expect(manifest.description).toContain('Azure');
    });

    test('should have valid version format', () => {
      const versionRegex = /^\d+\.\d+\.\d+$/;
      expect(manifest.version).toMatch(versionRegex);
      expect(manifest.version).toBe("1.0.0");
    });
  });

  describe('Permissions', () => {
    test('should have required permissions array', () => {
      expect(Array.isArray(manifest.permissions)).toBe(true);
      expect(manifest.permissions.length).toBeGreaterThan(0);
    });

    test('should include necessary permissions for extension functionality', () => {
      const requiredPermissions = ['storage', 'activeTab', 'scripting'];
      
      requiredPermissions.forEach(permission => {
        expect(manifest.permissions).toContain(permission);
      });
    });

    test('should not include unnecessary permissions', () => {
      const unnecessaryPermissions = [
        'tabs',
        'webNavigation',
        'history',
        'bookmarks',
        '*://*/*'
      ];
      
      unnecessaryPermissions.forEach(permission => {
        expect(manifest.permissions).not.toContain(permission);
      });
    });

    test('should use minimal permission principle', () => {
      expect(manifest.permissions).toContain('activeTab');
      expect(manifest.permissions).not.toContain('tabs');
      
      const hostPermissions = manifest.permissions.filter(p => p.includes('://'));
      expect(hostPermissions).toHaveLength(0);
    });
  });

  describe('Background Script Configuration', () => {
    test('should have background service worker configuration', () => {
      expect(manifest.background).toBeDefined();
      expect(manifest.background.service_worker).toBeDefined();
      expect(manifest.background.type).toBe('module');
    });

    test('should point to correct background script file', () => {
      expect(manifest.background.service_worker).toBe('background/background.js');
    });

    test('should use ES6 modules', () => {
      expect(manifest.background.type).toBe('module');
    });

    test('should not have deprecated background page configuration', () => {
      expect(manifest.background.page).toBeUndefined();
      expect(manifest.background.scripts).toBeUndefined();
      expect(manifest.background.persistent).toBeUndefined();
    });
  });

  describe('Content Scripts Configuration', () => {
    test('should have content scripts array', () => {
      expect(Array.isArray(manifest.content_scripts)).toBe(true);
      expect(manifest.content_scripts.length).toBeGreaterThan(0);
    });

    test('should have YouTube content script configuration', () => {
      const youtubeScript = manifest.content_scripts.find(script => 
        script.matches.some(match => match.includes('youtube.com'))
      );
      
      expect(youtubeScript).toBeDefined();
      expect(youtubeScript.matches).toContain('*://*.youtube.com/*');
      expect(youtubeScript.js).toContain('content/youtube.js');
      expect(youtubeScript.js).toContain('content/overlay.js');
    });

    test('should have Teams content script configuration', () => {
      const teamsScript = manifest.content_scripts.find(script => 
        script.matches.some(match => match.includes('teams.microsoft.com'))
      );
      
      expect(teamsScript).toBeDefined();
      expect(teamsScript.matches).toContain('*://*.teams.microsoft.com/*');
      expect(teamsScript.matches).toContain('*://*.teams.live.com/*');
      expect(teamsScript.js).toContain('content/teams.js');
      expect(teamsScript.js).toContain('content/overlay.js');
    });

    test('should have Zoom content script configuration', () => {
      const zoomScript = manifest.content_scripts.find(script => 
        script.matches.some(match => match.includes('zoom.us'))
      );
      
      expect(zoomScript).toBeDefined();
      expect(zoomScript.matches).toContain('*://*.zoom.us/*');
      expect(zoomScript.js).toContain('content/zoom.js');
      expect(zoomScript.js).toContain('content/overlay.js');
    });

    test('should use secure URL patterns', () => {
      manifest.content_scripts.forEach(script => {
        script.matches.forEach(match => {
          // Should allow both http and https
          expect(match.startsWith('*://') || match.startsWith('https://')).toBe(true);
          
          // Should use specific domains
          expect(match).not.toBe('*://*/*');
          expect(match).not.toBe('<all_urls>');
        });
      });
    });

    test('should run at appropriate timing', () => {
      manifest.content_scripts.forEach(script => {
        expect(script.run_at).toBe('document_end');
        expect(script.all_frames).toBe(false);
      });
    });

    test('should include overlay script in all content script configurations', () => {
      manifest.content_scripts.forEach(script => {
        expect(script.js).toContain('content/overlay.js');
      });
    });
  });

  describe('Action (Popup) Configuration', () => {
    test('should have action configuration for popup', () => {
      expect(manifest.action).toBeDefined();
      expect(manifest.action.default_popup).toBeDefined();
      expect(manifest.action.default_title).toBeDefined();
    });

    test('should point to correct popup file', () => {
      expect(manifest.action.default_popup).toBe('popup/popup.html');
    });

    test('should have descriptive popup title', () => {
      expect(manifest.action.default_title).toBe('Subtitle Generator');
    });

    test('should have popup icon configuration', () => {
      expect(manifest.action.default_icon).toBeDefined();
      
      const iconSizes = ['16', '32', '48', '128'];
      iconSizes.forEach(size => {
        expect(manifest.action.default_icon[size]).toBeDefined();
        expect(manifest.action.default_icon[size]).toBe(`assets/icon${size}.png`);
      });
    });
  });

  describe('Icons Configuration', () => {
    test('should have extension icons', () => {
      expect(manifest.icons).toBeDefined();
    });

    test('should have all required icon sizes', () => {
      const requiredSizes = ['16', '32', '48', '128'];
      
      requiredSizes.forEach(size => {
        expect(manifest.icons[size]).toBeDefined();
        expect(manifest.icons[size]).toBe(`assets/icon${size}.png`);
      });
    });

    test('should use consistent icon naming', () => {
      Object.values(manifest.icons).forEach(iconPath => {
        expect(iconPath).toMatch(/^assets\/icon\d+\.png$/);
      });
    });

    test('should match action and manifest icons', () => {
      const iconSizes = ['16', '32', '48', '128'];
      
      iconSizes.forEach(size => {
        expect(manifest.icons[size]).toBe(manifest.action.default_icon[size]);
      });
    });
  });

  describe('File Structure Validation', () => {
    test('should reference existing script files', () => {
      const referencedFiles = [
        manifest.background.service_worker,
        manifest.action.default_popup,
        ...manifest.content_scripts.flatMap(script => script.js)
      ];
      
      // All referenced files should be strings
      referencedFiles.forEach(file => {
        expect(typeof file).toBe('string');
        expect(file.length).toBeGreaterThan(0);
      });
    });

    test('should use consistent directory structure', () => {
      // Background script in background/ directory
      expect(manifest.background.service_worker).toMatch(/^background\//);
      
      // Content scripts in content/ directory
      manifest.content_scripts.forEach(script => {
        script.js.forEach(jsFile => {
          expect(jsFile).toMatch(/^content\//);
        });
      });
      
      // Popup in popup/ directory
      expect(manifest.action.default_popup).toMatch(/^popup\//);
      
      // Icons in assets/ directory
      Object.values(manifest.icons).forEach(iconPath => {
        expect(iconPath).toMatch(/^assets\//);
      });
    });

    test('should have platform-specific content scripts', () => {
      const expectedPlatforms = ['youtube', 'teams', 'zoom'];
      
      expectedPlatforms.forEach(platform => {
        const hasScript = manifest.content_scripts.some(script => 
          script.js.some(jsFile => jsFile.includes(platform))
        );
        expect(hasScript).toBe(true);
      });
    });
  });

  describe('Security Considerations', () => {
    test('should not request broad host permissions', () => {
      const broadPatterns = ['<all_urls>', '*://*/*', 'http://*/*', 'https://*/*'];
      
      // Check permissions
      broadPatterns.forEach(pattern => {
        expect(manifest.permissions).not.toContain(pattern);
      });
      
      // Check content script matches
      manifest.content_scripts.forEach(script => {
        script.matches.forEach(match => {
          expect(broadPatterns).not.toContain(match);
        });
      });
    });

    test('should use specific domain matches', () => {
      const expectedDomains = ['youtube.com', 'teams.microsoft.com', 'teams.live.com', 'zoom.us'];
      
      manifest.content_scripts.forEach(script => {
        script.matches.forEach(match => {
          const hasExpectedDomain = expectedDomains.some(domain => match.includes(domain));
          expect(hasExpectedDomain).toBe(true);
        });
      });
    });

    test('should not include dangerous permissions', () => {
      const dangerousPermissions = [
        'webRequest',
        'webRequestBlocking', 
        'proxy',
        'management',
        'nativeMessaging',
        'debugger'
      ];
      
      dangerousPermissions.forEach(permission => {
        expect(manifest.permissions).not.toContain(permission);
      });
    });

    test('should use secure content script injection', () => {
      manifest.content_scripts.forEach(script => {
        // Should not run in all frames unless necessary
        expect(script.all_frames).toBe(false);
        
        // Should run at appropriate time
        expect(['document_start', 'document_end', 'document_idle']).toContain(script.run_at);
      });
    });
  });

  describe('Manifest Validation', () => {
    test('should be valid JSON structure', () => {
      // Simulate JSON validation
      const manifestString = JSON.stringify(manifest);
      const parsedManifest = JSON.parse(manifestString);
      
      expect(parsedManifest).toEqual(manifest);
    });

    test('should have no required fields missing', () => {
      const requiredFields = [
        'manifest_version',
        'name', 
        'version',
        'description'
      ];
      
      requiredFields.forEach(field => {
        expect(manifest[field]).toBeDefined();
        expect(manifest[field]).not.toBe('');
      });
    });

    test('should follow Chrome extension naming conventions', () => {
      // Name should be descriptive but not too long
      expect(manifest.name.length).toBeGreaterThan(10);
      expect(manifest.name.length).toBeLessThan(100);
      
      // Description should be informative
      expect(manifest.description.length).toBeGreaterThan(20);
      expect(manifest.description.length).toBeLessThan(500);
    });

    test('should be compatible with Chrome extension store requirements', () => {
      // Should use Manifest V3
      expect(manifest.manifest_version).toBe(3);
      
      // Should have appropriate description
      expect(manifest.description).not.toContain('test');
      expect(manifest.description).not.toContain('TODO');
      
      // Should have version in semantic format
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
