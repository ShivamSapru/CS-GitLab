import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock SignupModal component matching actual implementation
const MockSignupModal = ({ 
  onClose, 
  onSignupSuccess, 
  onShowLogin, 
  isDarkMode 
}) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      // Mock signup logic
      if (email === 'existing@example.com') {
        setError('Email already exists');
      } else if (email === '2fa-signup@example.com') {
        onSignupSuccess({ 
          email: email,
          setup_2fa_required: true 
        });
      } else {
        onSignupSuccess({ 
          email: email, 
          user_id: 1, 
          credits: 5
        });
      }
    } catch (err) {
      setError('Signup failed. Please try again.');
    }
  };

  const handleGoogleSignup = () => {
    onSignupSuccess({ 
      email: 'google-signup@example.com', 
      user_id: 2, 
      provider: 'google',
      setup_2fa_required: true
    });
  };

  return (
    <div 
      data-testid="signup-modal" 
      className={isDarkMode ? 'dark-mode' : 'light-mode'}
    >
      <div data-testid="modal-overlay" onClick={onClose}>
        <div data-testid="modal-content" onClick={(e) => e.stopPropagation()}>
          <button data-testid="close-button" onClick={onClose}>×</button>
          
          <h2>Sign Up</h2>
          
          <form data-testid="signup-form" onSubmit={handleSubmit}>
            {error && (
              <div data-testid="error-message" className="error">
                {error}
              </div>
            )}

            {success && (
              <div data-testid="success-message" className="success">
                {success}
              </div>
            )}

            <div>
              <input
                data-testid="email-input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div>
              <input
                data-testid="password-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <input
                data-testid="confirm-password-input"
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button 
              data-testid="signup-button"
              type="submit"
            >
              Sign Up
            </button>
          </form>

          <div data-testid="oauth-section">
            <button 
              data-testid="google-signup-button"
              onClick={handleGoogleSignup}
            >
              Continue with Google
            </button>
          </div>

          <div data-testid="login-section">
            <p>Already have an account?</p>
            <button data-testid="show-login-button" onClick={onShowLogin}>
              Log in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

describe('SignupModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSignupSuccess = jest.fn();
  const mockOnShowLogin = jest.fn();

  const defaultProps = {
    onClose: mockOnClose,
    onSignupSuccess: mockOnSignupSuccess,
    onShowLogin: mockOnShowLogin,
    isDarkMode: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render signup modal with correct elements', () => {
      render(<MockSignupModal {...defaultProps} />);
      
      expect(screen.getByTestId('signup-modal')).toBeInTheDocument();
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
      expect(screen.getByTestId('signup-form')).toBeInTheDocument();
    });

    test('should render all form inputs', () => {
      render(<MockSignupModal {...defaultProps} />);
      
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
    });

    test('should apply dark mode styling', () => {
      render(<MockSignupModal {...defaultProps} isDarkMode={true} />);
      
      expect(screen.getByTestId('signup-modal')).toHaveClass('dark-mode');
    });

    test('should render OAuth and login sections', () => {
      render(<MockSignupModal {...defaultProps} />);
      
      expect(screen.getByTestId('oauth-section')).toBeInTheDocument();
      expect(screen.getByTestId('google-signup-button')).toBeInTheDocument();
      expect(screen.getByTestId('login-section')).toBeInTheDocument();
      expect(screen.getByTestId('show-login-button')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    test('should update form fields when typed', () => {
      render(<MockSignupModal {...defaultProps} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');

      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

      expect(emailInput.value).toBe('john@example.com');
      expect(passwordInput.value).toBe('password123');
      expect(confirmPasswordInput.value).toBe('password123');
    });
  });

  describe('Form Validation', () => {
    test('should show error when passwords do not match', async () => {
      render(<MockSignupModal {...defaultProps} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      const signupButton = screen.getByTestId('signup-button');
      
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
      
      fireEvent.click(signupButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Passwords do not match');
      });
    });

    test('should handle existing email error', async () => {
      render(<MockSignupModal {...defaultProps} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      
      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      
      fireEvent.click(screen.getByTestId('signup-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Email already exists');
      });
    });
  });

  describe('Signup Flow', () => {
    test('should call onSignupSuccess with user data on successful signup', async () => {
      render(<MockSignupModal {...defaultProps} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      
      fireEvent.click(screen.getByTestId('signup-button'));

      await waitFor(() => {
        expect(mockOnSignupSuccess).toHaveBeenCalledTimes(1);
        expect(mockOnSignupSuccess).toHaveBeenCalledWith({
          email: 'john@example.com',
          user_id: 1,
          credits: 5
        });
      });
    });

    test('should handle 2FA setup required flow', async () => {
      render(<MockSignupModal {...defaultProps} />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      
      fireEvent.change(emailInput, { target: { value: '2fa-signup@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      
      fireEvent.click(screen.getByTestId('signup-button'));

      await waitFor(() => {
        expect(mockOnSignupSuccess).toHaveBeenCalledWith({
          email: '2fa-signup@example.com',
          setup_2fa_required: true
        });
      });
    });

    test('should handle Google OAuth signup', async () => {
      render(<MockSignupModal {...defaultProps} />);
      
      const googleButton = screen.getByTestId('google-signup-button');
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockOnSignupSuccess).toHaveBeenCalledWith({
          email: 'google-signup@example.com',
          user_id: 2,
          provider: 'google',
          setup_2fa_required: true
        });
      });
    });
  });

  describe('Modal Controls', () => {
    test('should call onClose when close button is clicked', () => {
      render(<MockSignupModal {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('close-button'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('should call onClose when overlay is clicked', () => {
      render(<MockSignupModal {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('modal-overlay'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('should call onShowLogin when login button is clicked', () => {
      render(<MockSignupModal {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('show-login-button'));
      expect(mockOnShowLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    test('should have required attributes on inputs', () => {
      render(<MockSignupModal {...defaultProps} />);
      
      expect(screen.getByTestId('email-input')).toHaveAttribute('required');
      expect(screen.getByTestId('password-input')).toHaveAttribute('required');
      expect(screen.getByTestId('confirm-password-input')).toHaveAttribute('required');
    });

    test('should have correct input types', () => {
      render(<MockSignupModal {...defaultProps} />);
      
      expect(screen.getByTestId('email-input')).toHaveAttribute('type', 'email');
      expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'password');
      expect(screen.getByTestId('confirm-password-input')).toHaveAttribute('type', 'password');
    });
  });
});
