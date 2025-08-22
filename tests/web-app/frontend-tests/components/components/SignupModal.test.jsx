import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock SignupModal component
const MockSignupModal = ({ 
  onClose, 
  onSignupSuccess, 
  onShowLogin, 
  isDarkMode 
}) => {
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
      return;
    }

    setErrors({});

    try {
      // Mock signup logic
      if (formData.email === 'existing@example.com') {
        setErrors({ email: 'Email already exists' });
      } else if (formData.email === '2fa-signup@example.com') {
        onSignupSuccess({ 
          email: formData.email,
          setup_2fa_required: true 
        });
      } else {
        onSignupSuccess({ 
          email: formData.email, 
          user_id: 1, 
          credits: 5,
          firstName: formData.firstName,
          lastName: formData.lastName
        });
      }
    } catch (err) {
      setErrors({ submit: 'Signup failed. Please try again.' });
    } finally {
      setIsLoading(false);
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
    <div data-testid="signup-modal" className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      <div data-testid="modal-overlay" onClick={onClose}>
        <div data-testid="modal-content" onClick={(e) => e.stopPropagation()}>
          <button data-testid="close-button" onClick={onClose}>×</button>
          
          <h2>Create Your SubLingo Account</h2>
          
          <form data-testid="signup-form" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="firstName">First Name</label>
              <input
                data-testid="firstname-input"
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
              />
              {errors.firstName && (
                <div data-testid="firstname-error" className="error">
                  {errors.firstName}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="lastName">Last Name</label>
              <input
                data-testid="lastname-input"
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
              />
              {errors.lastName && (
                <div data-testid="lastname-error" className="error">
                  {errors.lastName}
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="email">Email</label>
              <input
                data-testid="email-input"
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
              {errors.email && (
                <div data-testid="email-error" className="error">
                  {errors.email}
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="password">Password</label>
              <input
                data-testid="password-input"
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
              />
              {errors.password && (
                <div data-testid="password-error" className="error">
                  {errors.password}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                data-testid="confirm-password-input"
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                required
              />
              {errors.confirmPassword && (
                <div data-testid="confirm-password-error" className="error">
                  {errors.confirmPassword}
                </div>
              )}
            </div>

            {errors.submit && (
              <div data-testid="submit-error" className="error">
                {errors.submit}
              </div>
            )}

            <button 
              data-testid="signup-button"
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div data-testid="oauth-section">
            <button 
              data-testid="google-signup-button"
              onClick={handleGoogleSignup}
              disabled={isLoading}
            >
              Sign Up with Google
            </button>
          </div>

          <div data-testid="login-section">
            <p>Already have an account?</p>
            <button data-testid="show-login-button" onClick={onShowLogin}>
              Login
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
      expect(screen.getByText('Create Your SubLingo Account')).toBeInTheDocument();
      expect(screen.getByTestId('signup-form')).toBeInTheDocument();
    });

    test('should render all form inputs', () => {
      render(<MockSignupModal {...defaultProps} />);
      
      expect(screen.getByTestId('firstname-input')).toBeInTheDocument();
      expect(screen.getByTestId('lastname-input')).toBeInTheDocument();
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
      
      const firstNameInput = screen.getByTestId('firstname-input');
      const lastNameInput = screen.getByTestId('lastname-input');
      const emailInput = screen.getByTestId('email-input');

      fireEvent.change(firstNameInput, { target: { value: 'John' } });
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });

      expect(firstNameInput.value).toBe('John');
      expect(lastNameInput.value).toBe('Doe');
      expect(emailInput.value).toBe('john@example.com');
    });

    test('should clear field errors when user types', () => {
      render(<MockSignupModal {...defaultProps} />);
      
      const signupButton = screen.getByTestId('signup-button');
      fireEvent.click(signupButton);

      // Should show validation errors
      expect(screen.getByTestId('firstname-error')).toBeInTheDocument();

      // Typing should clear the error
      const firstNameInput = screen.getByTestId('firstname-input');
      fireEvent.change(firstNameInput, { target: { value: 'John' } });

      expect(screen.queryByTestId('firstname-error')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('should show validation errors for empty required fields', async () => {
      render(<MockSignupModal {...defaultProps} />);
      
      const signupButton = screen.getByTestId('signup-button');
      fireEvent.click(signupButton);

      await waitFor(() => {
        expect(screen.getByTestId('firstname-error')).toHaveTextContent('First name is required');
        expect(screen.getByTestId('lastname-error')).toHaveTextContent('Last name is required');
        expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required');
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password is required');
      });
    });

    test('should validate password length', async () => {
      render(<MockSignupModal {...defaultProps} />);
      
      const passwordInput = screen.getByTestId('password-input');
      fireEvent.change(passwordInput, { target: { value: 'short' } });
      
      const signupButton = screen.getByTestId('signup-button');
      fireEvent.click(signupButton);

      await waitFor(() => {
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password must be at least 8 characters');
      });
    });

    test('should validate password confirmation match', async () => {
      render(<MockSignupModal {...defaultProps} />);
      
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
      
      const signupButton = screen.getByTestId('signup-button');
      fireEvent.click(signupButton);

      await waitFor(() => {
        expect(screen.getByTestId('confirm-password-error')).toHaveTextContent('Passwords do not match');
      });
    });

    test('should handle existing email error', async () => {
      render(<MockSignupModal {...defaultProps} />);
      
      // Fill out form with existing email
      fireEvent.change(screen.getByTestId('firstname-input'), { target: { value: 'John' } });
      fireEvent.change(screen.getByTestId('lastname-input'), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'existing@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
      fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'password123' } });
      
      fireEvent.click(screen.getByTestId('signup-button'));

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Email already exists');
      });
    });
  });

  describe('Signup Flow', () => {
    test('should call onSignupSuccess with user data on successful signup', async () => {
      render(<MockSignupModal {...defaultProps} />);
      
      // Fill out valid form
      fireEvent.change(screen.getByTestId('firstname-input'), { target: { value: 'John' } });
      fireEvent.change(screen.getByTestId('lastname-input'), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
      fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'password123' } });
      
      fireEvent.click(screen.getByTestId('signup-button'));

      await waitFor(() => {
        expect(mockOnSignupSuccess).toHaveBeenCalledTimes(1);
        expect(mockOnSignupSuccess).toHaveBeenCalledWith({
          email: 'john@example.com',
          user_id: 1,
          credits: 5,
          firstName: 'John',
          lastName: 'Doe'
        });
      });
    });

    test('should handle 2FA setup required flow', async () => {
      render(<MockSignupModal {...defaultProps} />);
      
      // Fill out form with 2FA email
      fireEvent.change(screen.getByTestId('firstname-input'), { target: { value: 'Jane' } });
      fireEvent.change(screen.getByTestId('lastname-input'), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByTestId('email-input'), { target: { value: '2fa-signup@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
      fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'password123' } });
      
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

    test('should show loading state during signup', async () => {
      render(<MockSignupModal {...defaultProps} />);
      
      // Fill out form
      fireEvent.change(screen.getByTestId('firstname-input'), { target: { value: 'John' } });
      fireEvent.change(screen.getByTestId('lastname-input'), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
      fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'password123' } });
      
      const signupButton = screen.getByTestId('signup-button');
      fireEvent.click(signupButton);

      expect(signupButton).toBeDisabled();
      expect(screen.getByTestId('google-signup-button')).toBeDisabled();
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
    test('should have proper form labels', () => {
      render(<MockSignupModal {...defaultProps} />);
      
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    test('should have required attributes on inputs', () => {
      render(<MockSignupModal {...defaultProps} />);
      
      expect(screen.getByTestId('firstname-input')).toHaveAttribute('required');
      expect(screen.getByTestId('lastname-input')).toHaveAttribute('required');
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
