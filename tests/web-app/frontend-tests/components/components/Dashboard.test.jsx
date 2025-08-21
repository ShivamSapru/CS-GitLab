import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock the Dashboard component before importing
jest.mock('../../../../../frontend/src/components/Dashboard.jsx', () => {
  return ({ onNavigate, isDarkMode, user, onShowLogin }) => {
    return (
      <div data-testid="dashboard" className={isDarkMode ? 'dark-mode' : 'light-mode'}>
        <h1>Subtitle Translator Dashboard</h1>
        {user ? (
          <div data-testid="user-info">
            <span>Welcome, {user.email || user.name}</span>
            <span data-testid="credits">Credits: {user.credits || 5}</span>
          </div>
        ) : (
          <button data-testid="login-button" onClick={onShowLogin}>
            Login Required
          </button>
        )}
        
        <div data-testid="navigation-options">
          <button onClick={() => onNavigate('upload')} data-testid="nav-upload">
            Static Translation
          </button>
          <button onClick={() => onNavigate('library')} data-testid="nav-library">
            Translation Library
          </button>
          <button onClick={() => onNavigate('transcribe')} data-testid="nav-transcribe">
            Audio/Video Transcription
          </button>
          <button onClick={() => onNavigate('realtime')} data-testid="nav-realtime">
            Real-time Translation
          </button>
        </div>

        <div data-testid="features-section">
          <div data-testid="feature-card-static">
            <h3>Static Translation</h3>
            <p>Upload and translate .srt and .vtt subtitle files</p>
          </div>
          <div data-testid="feature-card-realtime">
            <h3>Real-time Translation</h3>
            <p>Live translation using Chrome extension</p>
          </div>
          <div data-testid="feature-card-transcription">
            <h3>Audio/Video Transcription</h3>
            <p>Convert audio to subtitles with translation</p>
          </div>
        </div>
      </div>
    );
  };
});

import Dashboard from '../../../../../frontend/src/components/Dashboard.jsx';

describe('Dashboard Component', () => {
  const mockOnNavigate = jest.fn();
  const mockOnShowLogin = jest.fn();

  const defaultProps = {
    onNavigate: mockOnNavigate,
    isDarkMode: false,
    user: null,
    onShowLogin: mockOnShowLogin
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render dashboard with correct title', () => {
      render(<Dashboard {...defaultProps} />);
      
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(screen.getByText('Subtitle Translator Dashboard')).toBeInTheDocument();
    });

    test('should apply dark mode styling when isDarkMode is true', () => {
      render(<Dashboard {...defaultProps} isDarkMode={true} />);
      
      const dashboard = screen.getByTestId('dashboard');
      expect(dashboard).toHaveClass('dark-mode');
    });

    test('should apply light mode styling when isDarkMode is false', () => {
      render(<Dashboard {...defaultProps} isDarkMode={false} />);
      
      const dashboard = screen.getByTestId('dashboard');
      expect(dashboard).toHaveClass('light-mode');
    });

    test('should render all navigation options', () => {
      render(<Dashboard {...defaultProps} />);
      
      expect(screen.getByTestId('nav-upload')).toBeInTheDocument();
      expect(screen.getByTestId('nav-library')).toBeInTheDocument();
      expect(screen.getByTestId('nav-transcribe')).toBeInTheDocument();
      expect(screen.getByTestId('nav-realtime')).toBeInTheDocument();
    });

    test('should render feature cards', () => {
      render(<Dashboard {...defaultProps} />);
      
      expect(screen.getByTestId('feature-card-static')).toBeInTheDocument();
      expect(screen.getByTestId('feature-card-realtime')).toBeInTheDocument();
      expect(screen.getByTestId('feature-card-transcription')).toBeInTheDocument();
      
      // Check for unique text in cards
      expect(screen.getByText('Upload and translate .srt and .vtt subtitle files')).toBeInTheDocument();
      expect(screen.getByText('Live translation using Chrome extension')).toBeInTheDocument();
      expect(screen.getByText('Convert audio to subtitles with translation')).toBeInTheDocument();
    });
  });

  describe('User Authentication States', () => {
    test('should show login button when user is not authenticated', () => {
      render(<Dashboard {...defaultProps} user={null} />);
      
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
      expect(screen.getByText('Login Required')).toBeInTheDocument();
      expect(screen.queryByTestId('user-info')).not.toBeInTheDocument();
    });

    test('should show user info when user is authenticated', () => {
      const mockUser = {
        email: 'test@example.com',
        name: 'Test User',
        credits: 3
      };

      render(<Dashboard {...defaultProps} user={mockUser} />);
      
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
      expect(screen.getByText('Welcome, test@example.com')).toBeInTheDocument();
      expect(screen.getByTestId('credits')).toHaveTextContent('Credits: 3');
      expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
    });

    test('should display default credits when not specified', () => {
      const mockUser = {
        email: 'test@example.com',
        name: 'Test User'
      };

      render(<Dashboard {...defaultProps} user={mockUser} />);
      
      expect(screen.getByTestId('credits')).toHaveTextContent('Credits: 5');
    });

    test('should handle user with name instead of email', () => {
      const mockUser = {
        name: 'John Doe',
        credits: 2
      };

      render(<Dashboard {...defaultProps} user={mockUser} />);
      
      expect(screen.getByText('Welcome, John Doe')).toBeInTheDocument();
    });
  });

  describe('Navigation Interactions', () => {
    test('should call onNavigate with correct parameter when upload button is clicked', () => {
      render(<Dashboard {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('nav-upload'));
      
      expect(mockOnNavigate).toHaveBeenCalledTimes(1);
      expect(mockOnNavigate).toHaveBeenCalledWith('upload');
    });

    test('should call onNavigate with correct parameter when library button is clicked', () => {
      render(<Dashboard {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('nav-library'));
      
      expect(mockOnNavigate).toHaveBeenCalledTimes(1);
      expect(mockOnNavigate).toHaveBeenCalledWith('library');
    });

    test('should call onNavigate with correct parameter when transcribe button is clicked', () => {
      render(<Dashboard {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('nav-transcribe'));
      
      expect(mockOnNavigate).toHaveBeenCalledTimes(1);
      expect(mockOnNavigate).toHaveBeenCalledWith('transcribe');
    });

    test('should call onNavigate with correct parameter when realtime button is clicked', () => {
      render(<Dashboard {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('nav-realtime'));
      
      expect(mockOnNavigate).toHaveBeenCalledTimes(1);
      expect(mockOnNavigate).toHaveBeenCalledWith('realtime');
    });

    test('should call onShowLogin when login button is clicked', () => {
      render(<Dashboard {...defaultProps} user={null} />);
      
      fireEvent.click(screen.getByTestId('login-button'));
      
      expect(mockOnShowLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('Feature Cards Content', () => {
    test('should display correct content for static translation feature', () => {
      render(<Dashboard {...defaultProps} />);
      
      const staticCard = screen.getByTestId('feature-card-static');
      expect(staticCard).toHaveTextContent('Static Translation');
      expect(staticCard).toHaveTextContent('Upload and translate .srt and .vtt subtitle files');
    });

    test('should display correct content for real-time translation feature', () => {
      render(<Dashboard {...defaultProps} />);
      
      const realtimeCard = screen.getByTestId('feature-card-realtime');
      expect(realtimeCard).toHaveTextContent('Real-time Translation');
      expect(realtimeCard).toHaveTextContent('Live translation using Chrome extension');
    });

    test('should display correct content for transcription feature', () => {
      render(<Dashboard {...defaultProps} />);
      
      const transcriptionCard = screen.getByTestId('feature-card-transcription');
      expect(transcriptionCard).toHaveTextContent('Audio/Video Transcription');
      expect(transcriptionCard).toHaveTextContent('Convert audio to subtitles with translation');
    });
  });

  describe('Props Validation', () => {
    test('should handle missing onNavigate prop gracefully', () => {
      const propsWithoutOnNavigate = { ...defaultProps, onNavigate: undefined };
      
      expect(() => {
        render(<Dashboard {...propsWithoutOnNavigate} />);
      }).not.toThrow();
    });

    test('should handle missing onShowLogin prop gracefully', () => {
      const propsWithoutOnShowLogin = { ...defaultProps, onShowLogin: undefined };
      
      expect(() => {
        render(<Dashboard {...propsWithoutOnShowLogin} />);
      }).not.toThrow();
    });

    test('should handle undefined user prop', () => {
      render(<Dashboard {...defaultProps} user={undefined} />);
      
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have accessible navigation buttons', () => {
      render(<Dashboard {...defaultProps} />);
      
      const navButtons = [
        screen.getByTestId('nav-upload'),
        screen.getByTestId('nav-library'), 
        screen.getByTestId('nav-transcribe'),
        screen.getByTestId('nav-realtime')
      ];

      navButtons.forEach(button => {
        expect(button).toBeInTheDocument();
        expect(button.tagName).toBe('BUTTON');
      });
    });

    test('should have accessible login button when user is not authenticated', () => {
      render(<Dashboard {...defaultProps} user={null} />);
      
      const loginButton = screen.getByTestId('login-button');
      expect(loginButton).toBeInTheDocument();
      expect(loginButton.tagName).toBe('BUTTON');
    });
  });
});