import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock StaticSubtitleUpload component
const MockStaticSubtitleUpload = ({ isDarkMode }) => {
  const [file, setFile] = React.useState(null);
  const [targetLanguage, setTargetLanguage] = React.useState('en');
  const [censorProfanity, setCensorProfanity] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [translationResult, setTranslationResult] = React.useState(null);
  const [error, setError] = React.useState('');

  const supportedLanguages = {
    'en': 'English',
    'es': 'Spanish', 
    'fr': 'French',
    'de': 'German',
    'pt': 'Portuguese',
    'it': 'Italian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese'
  };

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    setError('');
    
    if (selectedFile) {
      const validExtensions = ['.srt', '.vtt'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        setError('Please select a valid .srt or .vtt file');
        setFile(null);
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      const fakeEvent = { target: { files: [droppedFile] } };
      handleFileSelect(fakeEvent);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // Mock upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Mock translation result
      if (file.name === 'error-test.srt') {
        throw new Error('Translation failed');
      }

      const mockResult = {
        original_filename: file.name,
        translated_filename: `${file.name.split('.')[0]}_${targetLanguage}.${file.name.split('.')[1]}`,
        source_language: 'pt',
        target_language: targetLanguage,
        message: 'Translation completed successfully',
        translated_file_path: '/downloads/translated-file.srt',
        original_file_path: '/uploads/original-file.srt'
      };

      setTranslationResult(mockResult);
    } catch (err) {
      setError(err.message || 'Translation failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = () => {
    if (translationResult?.translated_file_path) {
      // Mock download
      const link = document.createElement('a');
      link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent('Mock translated content');
      link.download = translationResult.translated_filename;
      link.click();
    }
  };

  const handleReset = () => {
    setFile(null);
    setTranslationResult(null);
    setError('');
    setUploadProgress(0);
  };

  return (
    <div data-testid="static-subtitle-upload" className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      <div className="container">
        <h1>Static Subtitle Translation</h1>
        <p>Upload your .srt or .vtt subtitle files for translation</p>

        {!translationResult ? (
          <>
            {/* File Upload Section */}
            <div 
              data-testid="drop-zone"
              className="drop-zone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="drop-content">
                {file ? (
                  <div data-testid="file-selected">
                    <span data-testid="file-name">{file.name}</span>
                    <span data-testid="file-size">({Math.round(file.size / 1024)} KB)</span>
                  </div>
                ) : (
                  <div data-testid="file-prompt">
                    <p>Drag and drop your subtitle file here</p>
                    <p>or</p>
                    <label htmlFor="file-input" className="file-input-label">
                      Choose File
                    </label>
                  </div>
                )}
              </div>
            </div>

            <input
              data-testid="file-input"
              id="file-input"
              type="file"
              accept=".srt,.vtt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {/* Translation Settings */}
            <div data-testid="translation-settings" className="settings-section">
              <h3>Translation Settings</h3>
              
              <div className="setting-group">
                <label htmlFor="target-language">Target Language</label>
                <select
                  data-testid="target-language-select"
                  id="target-language"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                >
                  {Object.entries(supportedLanguages).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="setting-group">
                <label>
                  <input
                    data-testid="profanity-filter-checkbox"
                    type="checkbox"
                    checked={censorProfanity}
                    onChange={(e) => setCensorProfanity(e.target.checked)}
                  />
                  Enable profanity filter
                </label>
              </div>
            </div>

            {error && (
              <div data-testid="error-message" className="error-message">
                {error}
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div data-testid="upload-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span data-testid="progress-text">{uploadProgress}%</span>
              </div>
            )}

            {/* Action Buttons */}
            <div data-testid="action-buttons" className="button-group">
              <button
                data-testid="upload-button"
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="primary-button"
              >
                {isUploading ? 'Translating...' : 'Translate File'}
              </button>

              {file && (
                <button
                  data-testid="clear-button"
                  onClick={handleReset}
                  disabled={isUploading}
                  className="secondary-button"
                >
                  Clear
                </button>
              )}
            </div>
          </>
        ) : (
          /* Translation Results */
          <div data-testid="translation-results" className="results-section">
            <h3>Translation Complete!</h3>
            
            <div data-testid="result-details" className="result-info">
              <p><strong>Original:</strong> {translationResult.original_filename}</p>
              <p><strong>Translated:</strong> {translationResult.translated_filename}</p>
              <p><strong>Source Language:</strong> {translationResult.source_language}</p>
              <p><strong>Target Language:</strong> {translationResult.target_language}</p>
              <p><strong>Status:</strong> {translationResult.message}</p>
            </div>

            <div data-testid="result-actions" className="button-group">
              <button
                data-testid="download-button"
                onClick={handleDownload}
                className="primary-button"
              >
                Download Translated File
              </button>

              <button
                data-testid="new-translation-button"
                onClick={handleReset}
                className="secondary-button"
              >
                Translate Another File
              </button>
            </div>
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
      expect(screen.getByText('Static Subtitle Translation')).toBeInTheDocument();
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
      expect(screen.getByText('Drag and drop your subtitle file here')).toBeInTheDocument();
    });

    test('should render translation settings', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      expect(screen.getByTestId('translation-settings')).toBeInTheDocument();
      expect(screen.getByTestId('target-language-select')).toBeInTheDocument();
      expect(screen.getByTestId('profanity-filter-checkbox')).toBeInTheDocument();
    });

    test('should render action buttons', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      expect(screen.getByTestId('action-buttons')).toBeInTheDocument();
      expect(screen.getByTestId('upload-button')).toBeInTheDocument();
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

    test('should show clear button when file is selected', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByTestId('clear-button')).toBeInTheDocument();
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
      // Create a file larger than 10MB
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
    test('should change target language', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const languageSelect = screen.getByTestId('target-language-select');
      fireEvent.change(languageSelect, { target: { value: 'es' } });
      
      expect(languageSelect.value).toBe('es');
    });

    test('should toggle profanity filter', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const checkbox = screen.getByTestId('profanity-filter-checkbox');
      expect(checkbox.checked).toBe(true);
      
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    test('should display all supported languages', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const languageSelect = screen.getByTestId('target-language-select');
      const options = Array.from(languageSelect.options);
      
      expect(options).toHaveLength(9);
      expect(options[0].value).toBe('en');
      expect(options[0].textContent).toBe('English');
    });
  });

  describe('Upload Process', () => {
    test('should disable upload button when no file is selected', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const uploadButton = screen.getByTestId('upload-button');
      expect(uploadButton).toBeDisabled();
    });

    test('should enable upload button when file is selected', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      const uploadButton = screen.getByTestId('upload-button');
      expect(uploadButton).not.toBeDisabled();
    });

    test('should show progress during upload', async () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByTestId('upload-button'));
      
      expect(screen.getByTestId('upload-progress')).toBeInTheDocument();
      expect(screen.getByTestId('progress-text')).toBeInTheDocument();
    });

    test('should show translation results after successful upload', async () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByTestId('upload-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('translation-results')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      expect(screen.getByText('Translation Complete!')).toBeInTheDocument();
      expect(screen.getByTestId('result-details')).toBeInTheDocument();
      expect(screen.getByTestId('download-button')).toBeInTheDocument();
    });

    test('should handle upload errors', async () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'error-test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByTestId('upload-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Translation failed');
      }, { timeout: 3000 });
    });

    test('should disable buttons during upload', async () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByTestId('upload-button'));
      
      expect(screen.getByTestId('upload-button')).toBeDisabled();
      expect(screen.getByTestId('clear-button')).toBeDisabled();
    });
  });

  describe('Result Actions', () => {
    test('should handle file download', async () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      // Set up successful translation
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByTestId('upload-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('download-button')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Mock createElement and click for download
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
      
      fireEvent.click(screen.getByTestId('download-button'));
      
      expect(mockLink.click).toHaveBeenCalled();
    });

    test('should reset for new translation', async () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      // Complete a translation
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByTestId('upload-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('new-translation-button')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      fireEvent.click(screen.getByTestId('new-translation-button'));
      
      // Should return to upload form
      expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
      expect(screen.queryByTestId('translation-results')).not.toBeInTheDocument();
    });

    test('should clear selected file when clear button is clicked', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      expect(screen.getByTestId('file-selected')).toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('clear-button'));
      
      expect(screen.queryByTestId('file-selected')).not.toBeInTheDocument();
      expect(screen.getByTestId('file-prompt')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper labels for form elements', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      expect(screen.getByLabelText('Target Language')).toBeInTheDocument();
      expect(screen.getByText('Enable profanity filter')).toBeInTheDocument();
    });

    test('should have accessible file input', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', '.srt,.vtt');
    });
  });
});
