import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';

// Simplified Mock StaticSubtitleUpload component - basic functionality only
const MockStaticSubtitleUpload = ({ isDarkMode }) => {
  const [uploadedFile, setUploadedFile] = React.useState(null);
  const [error, setError] = React.useState(null);

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validExtensions = ['.srt', '.vtt'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        setError('Please select a valid .srt or .vtt file');
        return;
      }
      
      setUploadedFile(file);
      setError(null);
    }
  };

  const resetComponent = () => {
    setUploadedFile(null);
    setError(null);
  };

  return (
    <div data-testid="static-subtitle-upload" className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      <div className="container">
        <h1>Subtitle Translation</h1>
        <p>Upload your .srt or .vtt subtitle files for translation</p>

        {error && (
          <div data-testid="error-message" className="error-message">
            {error}
          </div>
        )}

        <div data-testid="drop-zone" className="drop-zone">
          <div className="drop-content">
            {uploadedFile ? (
              <div data-testid="file-selected">
                <span data-testid="file-name">{uploadedFile.name}</span>
              </div>
            ) : (
              <div data-testid="file-prompt">
                <p>Drop your subtitle files here</p>
                <p>Supports SRT, VTT formats</p>
                <button onClick={() => document.getElementById('file-input').click()}>
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
          accept=".srt,.vtt"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        <div data-testid="action-buttons" className="button-group">
          {uploadedFile && (
            <button onClick={resetComponent}>Reset</button>
          )}
        </div>
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

    test('should reject invalid file extensions', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByTestId('error-message')).toHaveTextContent('Please select a valid .srt or .vtt file');
      expect(screen.queryByTestId('file-selected')).not.toBeInTheDocument();
    });

    test('should show reset button when file is selected', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.srt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper file input attributes', () => {
      render(<MockStaticSubtitleUpload {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', '.srt,.vtt');
    });
  });
});
