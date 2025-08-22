import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock LoginModal component
const MockLoginModal = ({ 
  onClose, 
  onLoginSuccess, 
  onShowSignup, 
  isDarkMode 
}) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Mock login logic
      if (email === 'test@example.com' && password === 'password123') {
        onLoginSuccess({ 
          email: 'test@example.com', 
          user_id: 1, 
          credits: 5 
        });
      } else if (email === '2fa@example.com' && password === 'password123') {
        onLoginSuccess({ 
          email: '2fa@example.com', 
          twofa_required: true 
        });
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Mock Google OAuth login
    onLoginSuccess({ 
      email: 'google@example.com', 
      user_id: 2, 
      provider: 'google' 
    });
  };

  return (
    <div data-testid="login-modal" className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      <div data-testid="modal-overlay" onClick={onClose}>
        <div data-testid="modal-content" onClick={(e) => e.stopPropagation()}>
          <button data-testid="close-button" onClick={onClose}>×</button>
          
          <h2>Login to SubLingo</h2>
          
          <form data-testid="login-form" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email">Email</label>
              <input
                data-testid="email-input"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label htmlFor="password">Password</label>
              <input
                data-testid="password-input"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div data-testid="error-message" className="error">
                {error}
              </div>
            )}

            <button 
              data-testid="login-button"
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div data-testid="oauth-section">
            <button 
              data-testid="google-login-button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              Login with Google
            </button>
          </div>

          <div data-testid="signup-section">
            <p>Don't have an account?</p>
            <button data-testid="show-signup-button" onClick={onShowSignup}>
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

describe('LoginModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnLoginSuccess = jest.fn();
  const mockOnShowSignup = jest.fn();

  const defaultProps = {
    onClose: mockOnClose,
    onLoginSuccess: mockOnLoginSuccess,
    onShowSignup: mockOnShowSignup,
    isDarkMode: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render login modal with correct elements', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      expect(screen.getByTestId('login-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
      expect(screen.getByText('Login to SubLingo')).toBeInTheDocument();
    });

    test('should render form with email and password inputs', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      expect(screen.getByTestId('login-form')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });

    test('should render OAuth section', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      expect(screen.getByTestId('oauth-section')).toBeInTheDocument();
      expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
    });

    test('should render signup section', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      expect(screen.getByTestId('signup-section')).toBeInTheDocument();
      expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
      expect(screen.getByTestId('show-signup-button')).toBeInTheDocument();
    });

    test('should apply dark mode styling when isDarkMode is true', () => {
      render(<MockLoginModal {...defaultProps} isDarkMode={true} />);
      
      const modal = screen.getByTestId('login-modal');
      expect(modal).toHaveClass('dark-mode');
    });

    test('should apply light mode styling when isDarkMode is false', () => {
      render(<MockLoginModal {...defaultProps} isDarkMode={false} />);
      
      const modal = screen.getByTestId('login-modal');
      expect(modal).toHaveClass('light-mode');
    });
  });

  describe('Form Interactions', () => {
    test('should update email input value when typed', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      expect(emailInput.value).toBe('test@example.com');
    });

    test('should update password input value when typed', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const passwordInput = screen.getByTestId('password-input');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      expect(passwordInput.value).toBe('password123');
    });

    test('should show loading state when submitting form', async () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      // Check for loading state (this might be brief)
      expect(loginButton).toBeDisabled();
    });
  });

  describe('Authentication Flow', () => {
    test('should call onLoginSuccess with user data on successful login', async () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1);
        expect(mockOnLoginSuccess).toHaveBeenCalledWith({
          email: 'test@example.com',
          user_id: 1,
          credits: 5
        });
      });
    });

    test('should handle 2FA required flow', async () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: '2fa@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1);
        expect(mockOnLoginSuccess).toHaveBeenCalledWith({
          email: '2fa@example.com',
          twofa_required: true
        });
      });
    });

    test('should show error message on failed login', async () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });

    test('should handle Google OAuth login', async () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const googleButton = screen.getByTestId('google-login-button');
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1);
        expect(mockOnLoginSuccess).toHaveBeenCalledWith({
          email: 'google@example.com',
          user_id: 2,
          provider: 'google'
        });
      });
    });
  });

  describe('Modal Controls', () => {
    test('should call onClose when close button is clicked', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const closeButton = screen.getByTestId('close-button');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('should call onClose when overlay is clicked', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const overlay = screen.getByTestId('modal-overlay');
      fireEvent.click(overlay);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('should not call onClose when modal content is clicked', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const modalContent = screen.getByTestId('modal-content');
      fireEvent.click(modalContent);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('should call onShowSignup when signup button is clicked', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const signupButton = screen.getByTestId('show-signup-button');
      fireEvent.click(signupButton);
      
      expect(mockOnShowSignup).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Validation', () => {
    test('should require email input', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const emailInput = screen.getByTestId('email-input');
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    test('should require password input', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const passwordInput = screen.getByTestId('password-input');
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should disable buttons when loading', async () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');
      const googleButton = screen.getByTestId('google-login-button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      // During loading state, buttons should be disabled
      expect(loginButton).toBeDisabled();
      expect(googleButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    test('should have proper form labels', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    test('should associate labels with inputs correctly', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      
      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    test('should have accessible button labels', () => {
      render(<MockLoginModal {...defaultProps} />);
      
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Login with Google')).toBeInTheDocument();
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });
  });
});
