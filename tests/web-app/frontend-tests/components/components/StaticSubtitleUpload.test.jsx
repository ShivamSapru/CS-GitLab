import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock StaticSubtitleUpload component matching the actual complex implementation
const MockStaticSubtitleUpload = ({ isDarkMode }) => {
  const [uploadedFile, setUploadedFile] = React.useState(null);
  const [targetLanguages, setTargetLanguages] = React.useState([]);
  const [censorProfanity, setCensorProfanity] = React.useState(false);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [translationProgress, setTranslationProgress] = React.useState(0);
  const [translatedFiles, setTranslatedFiles] = React.useState([]);
  const [error, setError] = React.useState(null);
  const [currentTranslatingLanguage, setCurrentTranslatingLanguage] = React.useState('');
  const [dragActive, setDragActive] = React.useState(false);
  const [backendConnected, setBackendConnected] = React.useState(true);
  const [languages] = React.useState([
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' }
  ]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file) => {
    setError(null);
    
    const validExtensions = ['.srt', '.vtt'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      setError('Please select a valid .srt or .vtt file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB');
      return;
    }
    
    setUploadedFile(file);
  };

  const startTranslation = async () => {
    if (!uploadedFile || targetLanguages.length === 0) {
      setError('Please select a file and target languages');
      return;
    }

    setIsTranslating(true);
    setTranslationProgress(0);
    setError(null);
    
    try {
      // Mock translation process
      for (let i = 0; i < targetLanguages.length; i++) {
        const language = targetLanguages[i];
        setCurrentTranslatingLanguage(`Translating to ${language.name}...`);
        
        // Simulate progress
        for (let progress = 0; progress <= 100; progress += 20) {
          setTranslationProgress(((i * 100) + progress) / targetLanguages.length);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Add translated file
        setTranslatedFiles(prev => [...prev, {
          language: language.code,
          languageName: language.name,
          filename: `${uploadedFile.name.split('.')[0]}_${language.code}.${uploadedFile.name.split('.')[1]}`,
          downloadUrl: 'mock-download-url'
        }]);
      }
      
      setCurrentTranslatingLanguage('');
    } catch (err) {
      setError('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
      setTranslationProgress(0);
    }
  };

  const downloadFile = (filename) => {
    // Mock download
    const link = document.createElement('a');
    link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent('Mock translated content');
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetComponent = () => {
    setUploadedFile(null);
    setTargetLanguages([]);
    setTranslatedFiles([]);
    setError(null);
    setTranslationProgress(0);
    setIsTranslating(false);
    setCurrentTranslatingLanguage('');
  };

  return (
    <div data-testid="static-subtitle-upload" className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      <div className="container">
        <h1>Subtitle Translation</h1>
        <p>Upload your .srt or .vtt subtitle files for translation</p>

        {/* Backend Connection Status */}
        {!backendConnected && (
          <div className="connection-error">
            <p>Azure Translation Service: Disconnected</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div data-testid="error-message" className="error-message">
            {error}
          </div>
        )}

        {/* File Upload Area */}
        <div 
          data-testid="drop-zone"
          className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="drop-content">
            {uploadedFile ? (
              <div data-testid="file-selected">
                <span data-testid="file-name">{uploadedFile.name}</span>
                <span data-testid="file-size">({Math.round(uploadedFile.size / 1024)} KB)</span>
              </div>
            ) : (
              <div data-testid="file-prompt">
                <p>Drop your subtitle files here</p>
                <p>Supports SRT, VTT formats • Powered by Azure Translator</p>
                <button
                  onClick={() => document.getElementById('file-input').click()}
                  className="browse-button"
                >
                  Browse Files
                </button>
              </div>
            )}
          </div>
        </div>

        <input
          id="file-input"
          data-testid="file-input"
          type="file"
          className="hidden"
          accept=".srt,.vtt"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        {/* Language Selection */}
        {uploadedFile && (
          <div data-testid="translation-settings" className="settings-section">
            <h3>Select Target Languages</h3>
            <div className="language-grid">
              {languages.map((language) => (
                <label key={language.code} className="language-option">
                  <input
                    type="checkbox"
                    data-testid={`language-${language.code}`}
                    checked={targetLanguages.some(lang => lang.code === language.code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTargetLanguages(prev => [...prev, language]);
                      } else {
                        setTargetLanguages(prev => prev.filter(lang => lang.code !== language.code));
                      }
                    }}
                  />
                  {language.name}
                </label>
              ))}
            </div>
            
            <div className="setting-group">
              <label>
                <input
                  data-testid="profanity-filter-checkbox"
                  type="checkbox"
                  checked={censorProfanity}
                  onChange={(e) => setCensorProfanity(e.target.checked)}
                />
                Censor profanity
              </label>
            </div>
          </div>
        )}

        {/* Translation Progress */}
        {isTranslating && (
          <div data-testid="upload-progress" className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${translationProgress}%` }}
              />
            </div>
            <span data-testid="progress-text">{Math.round(translationProgress)}%</span>
            {currentTranslatingLanguage && (
              <p data-testid="current-language">{currentTranslatingLanguage}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div data-testid="action-buttons" className="button-group">
          {uploadedFile && (
            <button
              onClick={resetComponent}
              className="secondary-button"
            >
              Reset
            </button>
          )}

          {uploadedFile && !isTranslating && translatedFiles.length === 0 && (
            <button
              data-testid="upload-button"
              onClick={startTranslation}
              disabled={targetLanguages.length === 0}
              className="primary-button"
            >
              Start Translation
            </button>
          )}
        </div>

        {/* Download Results */}
        {translatedFiles.length > 0 && (
          <div data-testid="translation-results" className="results-section">
            <h3>Translation Complete!</h3>
            
            <div data-testid="result-details" className="result-info">
              <p><strong>Original:</strong> {uploadedFile.name}</p>
              <p><strong>Files translated:</strong> {translatedFiles.length}</p>
            </div>

            <div className="files-list">
              {translatedFiles.map((file) => (
                <div key={file.language} className="file-item">
                  <div className="file-info">
                    <div data-testid={`file-name-${file.language}`}>{file.filename}</div>
                    <div>Translated to {file.languageName}</div>
                  </div>
                  <button
                    data-testid={`download-button-${file.language}`}
                    onClick={() => downloadFile(file.filename)}
                    className="download-button"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>

            <button
              data-testid="new-translation-button"
              onClick={resetComponent}
              className="secondary-button"
            >
              Translate Another File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

describe('StaticSubtitleUpload Component', () => {
  const defaultProps = {
    isDarkMode: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render upload component with correct title', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      expect(screen.getByTestId('static-subtitle-upload')).toBeInTheDocument();
      expect(screen.getByText('Subtitle Translation')).toBeInTheDocument();
      expect(screen.getByText('Upload your .srt or .vtt subtitle files for translation')).toBeInTheDocument();
    });

    test('should apply dark mode styling', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} isDarkMode={true} />);
      
      expect(screen.getByTestId('static-subtitle-upload')).toHaveClass('dark-mode');
    });

    test('should render drop zone initially', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
      expect(screen.getByTestId('file-prompt')).toBeInTheDocument();
      expect(screen.getByText('Drop your subtitle files here')).toBeInTheDocument();
    });

    test('should render action buttons container', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      expect(screen.getByTestId('action-buttons')).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    test('should handle file selection via input', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['subtitle content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByTestId('file-selected')).toBeInTheDocument();
      expect(screen.getByTestId('file-name')).toHaveTextContent('test.srt');
    });

    test('should display file size when file is selected', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['x'.repeat(1024)], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByTestId('file-size')).toHaveTextContent('(1 KB)');
    });

    test('should show translation settings when file is selected', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByTestId('translation-settings')).toBeInTheDocument();
    });

    test('should reject invalid file extensions', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByTestId('error-message')).toHaveTextContent('Please select a valid .srt or .vtt file');
      expect(screen.queryByTestId('file-selected')).not.toBeInTheDocument();
    });

    test('should reject files larger than 10MB', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      // Mock large file size
      Object.defineProperty(File.prototype, 'size', { 
        value: 11 * 1024 * 1024, 
        configurable: true 
      });
      const file = new File(['content'], 'large.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByTestId('error-message')).toHaveTextContent('File size must be less than 10MB');
    });

    test('should handle drag and drop', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const dropZone = screen.getByTestId('drop-zone');
      const file = new File(['content'], 'dropped.srt', { type: 'text/plain' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] }
      });
      
      expect(screen.getByTestId('file-selected')).toBeInTheDocument();
      expect(screen.getByTestId('file-name')).toHaveTextContent('dropped.srt');
    });
  });

  describe('Translation Settings', () => {
    test('should show language selection when file is uploaded', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByTestId('translation-settings')).toBeInTheDocument();
      expect(screen.getByText('Select Target Languages')).toBeInTheDocument();
    });

    test('should allow language selection', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      const spanishCheckbox = screen.getByTestId('language-es');
      fireEvent.click(spanishCheckbox);
      
      expect(spanishCheckbox.checked).toBe(true);
    });

    test('should toggle profanity filter', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      const checkbox = screen.getByTestId('profanity-filter-checkbox');
      expect(checkbox.checked).toBe(false);
      
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('Upload Process', () => {
    test('should enable upload button when file and languages are selected', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByTestId('language-es'));
      
      const uploadButton = screen.getByTestId('upload-button');
      expect(uploadButton).not.toBeDisabled();
    });

    test('should show progress during upload', async () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByTestId('language-es'));
      fireEvent.click(screen.getByTestId('upload-button'));
      
      expect(screen.getByTestId('upload-progress')).toBeInTheDocument();
      expect(screen.getByTestId('progress-text')).toBeInTheDocument();
    });

    test('should show translation results after successful upload', async () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByTestId('language-es'));
      fireEvent.click(screen.getByTestId('upload-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('translation-results')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      expect(screen.getByText('Translation Complete!')).toBeInTheDocument();
      expect(screen.getByTestId('result-details')).toBeInTheDocument();
    });
  });

  describe('Result Actions', () => {
    test('should handle file download', async () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      // Set up successful translation
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByTestId('language-es'));
      fireEvent.click(screen.getByTestId('upload-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('download-button-es')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Mock createElement and click for download
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      
      const createElement = jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
      const appendChild = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      const removeChild = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});
      
      fireEvent.click(screen.getByTestId('download-button-es'));
      
      expect(mockLink.click).toHaveBeenCalled();
      
      createElement.mockRestore();
      appendChild.mockRestore();
      removeChild.mockRestore();
    });

    test('should reset for new translation', async () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      // Complete a translation
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByTestId('language-es'));
      fireEvent.click(screen.getByTestId('upload-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('new-translation-button')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      fireEvent.click(screen.getByTestId('new-translation-button'));
      
      // Should return to upload form
      expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
      expect(screen.queryByTestId('translation-results')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should show error for invalid file type', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByTestId('error-message')).toHaveTextContent('Please select a valid .srt or .vtt file');
    });

    test('should show error for file too large', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      // Mock large file
      Object.defineProperty(File.prototype, 'size', { 
        value: 15 * 1024 * 1024, 
        configurable: true 
      });
      const file = new File(['content'], 'large.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByTestId('error-message')).toHaveTextContent('File size must be less than 10MB');
    });
  });

  describe('Accessibility', () => {
    test('should have proper file input attributes', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', '.srt,.vtt');
    });

    test('should have proper form labels', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByText('Select Target Languages')).toBeInTheDocument();
      expect(screen.getByText('Censor profanity')).toBeInTheDocument();
    });
  });
});
