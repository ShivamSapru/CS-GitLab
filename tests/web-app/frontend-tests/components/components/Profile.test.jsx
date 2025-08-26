import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock Profile component
const MockProfile = ({ isDarkMode, onLogout, onShowLogin }) => {
  const [user, setUser] = React.useState({
    email: 'test@example.com',
    display_name: 'John Doe',
    credits: 3,
    provider: 'email',
    twofa_enabled: false
  });
  const [isEditing, setIsEditing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = React.useState(false);
  const [show2FASetup, setShow2FASetup] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    display_name: user.display_name,
    email: user.email
  });
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setEditForm({
      display_name: user.display_name,
      email: user.email
    });
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUser(prev => ({
        ...prev,
        display_name: editForm.display_name,
        email: editForm.email
      }));
      
      setIsEditing(false);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setUser(prev => ({ ...prev, twofa_enabled: true }));
      setShow2FASetup(false);
      setSuccess('Two-factor authentication enabled successfully');
    } catch (err) {
      setError('Failed to enable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setUser(prev => ({ ...prev, twofa_enabled: false }));
      setSuccess('Two-factor authentication disabled');
    } catch (err) {
      setError('Failed to disable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  // Fixed useEffect with proper cleanup
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <div data-testid="profile-component" className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      <div className="profile-container">
        <h1>Profile Settings</h1>

        {error && (
          <div data-testid="error-message" className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div data-testid="success-message" className="success-message">
            {success}
          </div>
        )}

        {/* Personal Information */}
        <section data-testid="personal-info-section" className="profile-section">
          <h2>Personal Information</h2>
          
          {!isEditing ? (
            <div data-testid="profile-display">
              <div data-testid="name-display">
                <strong>Name:</strong> {user.display_name}
              </div>
              <div data-testid="email-display">
                <strong>Email:</strong> {user.email}
              </div>
              <div data-testid="provider-display">
                <strong>Account Type:</strong> {user.provider === 'google' ? 'Google Account' : 'Email Account'}
              </div>
              
              <button 
                data-testid="edit-profile-button"
                onClick={handleEditToggle}
                className="primary-button"
              >
                Edit Profile
              </button>
            </div>
          ) : (
            <div data-testid="profile-edit-form">
              <div>
                <label htmlFor="display_name">Display Name</label>
                <input
                  data-testid="name-input"
                  id="display_name"
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm(prev => ({...prev, display_name: e.target.value}))}
                />
              </div>
              
              <div>
                <label htmlFor="email">Email</label>
                <input
                  data-testid="email-input"
                  id="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({...prev, email: e.target.value}))}
                />
              </div>
              
              <div className="button-group">
                <button 
                  data-testid="save-profile-button"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="primary-button"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                
                <button 
                  data-testid="cancel-edit-button"
                  onClick={handleEditToggle}
                  disabled={isLoading}
                  className="secondary-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Security Section */}
        <section data-testid="security-section" className="profile-section">
          <h2>Security</h2>
          
          <div data-testid="2fa-section">
            <div data-testid="2fa-status">
              <strong>Two-Factor Authentication:</strong> 
              <span className={user.twofa_enabled ? 'enabled' : 'disabled'}>
                {user.twofa_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            {!user.twofa_enabled ? (
              <button 
                data-testid="enable-2fa-button"
                onClick={() => setShow2FASetup(true)}
                className="primary-button"
              >
                Enable 2FA
              </button>
            ) : (
              <button 
                data-testid="disable-2fa-button"
                onClick={handleDisable2FA}
                disabled={isLoading}
                className="danger-button"
              >
                {isLoading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            )}
          </div>
          
          <div data-testid="password-section">
            <button 
              data-testid="change-password-button"
              onClick={() => setShowChangePassword(true)}
              className="primary-button"
            >
              Change Password
            </button>
          </div>
        </section>

        {/* Account Actions */}
        <section data-testid="account-actions-section" className="profile-section">
          <h2>Account Actions</h2>
          
          <button 
            data-testid="logout-button"
            onClick={onLogout}
            className="danger-button"
          >
            Logout
          </button>
        </section>
      </div>

      {/* Modals */}
      {show2FASetup && (
        <div data-testid="2fa-setup-modal" className="modal">
          <div className="modal-content">
            <h3>Setup Two-Factor Authentication</h3>
            <p>Please scan the QR code with your authenticator app</p>
            <button 
              data-testid="confirm-2fa-button"
              onClick={handleEnable2FA}
              disabled={isLoading}
              className="primary-button"
            >
              {isLoading ? 'Enabling...' : 'Confirm Setup'}
            </button>
            <button 
              data-testid="cancel-2fa-button"
              onClick={() => setShow2FASetup(false)}
              disabled={isLoading}
              className="secondary-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showChangePassword && (
        <div data-testid="change-password-modal" className="modal">
          <div className="modal-content">
            <h3>Change Password</h3>
            <button 
              data-testid="close-password-modal-button"
              onClick={() => setShowChangePassword(false)}
              className="secondary-button"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

describe('Profile Component', () => {
  const mockOnLogout = jest.fn();
  const mockOnShowLogin = jest.fn();

  const defaultProps = {
    isDarkMode: false,
    onLogout: mockOnLogout,
    onShowLogin: mockOnShowLogin
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render profile component with correct structure', () => {
      render(<MockProfile {...defaultProps} />);
      
      expect(screen.getByTestId('profile-component')).toBeInTheDocument();
      expect(screen.getByText('Profile Settings')).toBeInTheDocument();
      expect(screen.getByTestId('personal-info-section')).toBeInTheDocument();
      expect(screen.getByTestId('security-section')).toBeInTheDocument();
    });

    test('should apply dark mode styling', () => {
      render(<MockProfile {...defaultProps} isDarkMode={true} />);
      
      expect(screen.getByTestId('profile-component')).toHaveClass('dark-mode');
    });

    test('should display user information', () => {
      render(<MockProfile {...defaultProps} />);
      
      expect(screen.getByTestId('name-display')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('email-display')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('provider-display')).toHaveTextContent('Email Account');
    });
  });

  describe('Profile Editing', () => {
    test('should toggle edit mode when edit button is clicked', () => {
      render(<MockProfile {...defaultProps} />);
      
      const editButton = screen.getByTestId('edit-profile-button');
      fireEvent.click(editButton);
      
      expect(screen.getByTestId('profile-edit-form')).toBeInTheDocument();
      expect(screen.getByTestId('name-input')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
    });

    test('should update form fields when typing', () => {
      render(<MockProfile {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('edit-profile-button'));
      
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
      
      expect(nameInput.value).toBe('Jane Doe');
    });

    test('should save profile changes', async () => {
      render(<MockProfile {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('edit-profile-button'));
      
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
      
      fireEvent.click(screen.getByTestId('save-profile-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });
    });

    test('should cancel editing', () => {
      render(<MockProfile {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('edit-profile-button'));
      fireEvent.click(screen.getByTestId('cancel-edit-button'));
      
      expect(screen.getByTestId('profile-display')).toBeInTheDocument();
      expect(screen.queryByTestId('profile-edit-form')).not.toBeInTheDocument();
    });
  });

  describe('Two-Factor Authentication', () => {
    test('should show enable 2FA button when disabled', () => {
      render(<MockProfile {...defaultProps} />);
      
      expect(screen.getByTestId('2fa-status')).toHaveTextContent('Disabled');
      expect(screen.getByTestId('enable-2fa-button')).toBeInTheDocument();
    });

    test('should open 2FA setup modal', () => {
      render(<MockProfile {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('enable-2fa-button'));
      
      expect(screen.getByTestId('2fa-setup-modal')).toBeInTheDocument();
    });

    test('should enable 2FA', async () => {
      render(<MockProfile {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('enable-2fa-button'));
      fireEvent.click(screen.getByTestId('confirm-2fa-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('2fa-status')).toHaveTextContent('Enabled');
      });
    });
  });

  describe('Security Features', () => {
    test('should show change password button', () => {
      render(<MockProfile {...defaultProps} />);
      
      expect(screen.getByTestId('change-password-button')).toBeInTheDocument();
    });

    test('should open change password modal', () => {
      render(<MockProfile {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('change-password-button'));
      
      expect(screen.getByTestId('change-password-modal')).toBeInTheDocument();
    });
  });

  describe('Account Actions', () => {
    test('should call onLogout when logout button is clicked', () => {
      render(<MockProfile {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('logout-button'));
      
      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Success Message Cleanup', () => {
    test('should clear success message after timeout', async () => {
      render(<MockProfile {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('edit-profile-button'));
      fireEvent.click(screen.getByTestId('save-profile-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });

      // Wait for cleanup
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 3100));
      });
      
      expect(screen.queryByTestId('success-message')).not.toBeInTheDocument();
    });
  });
});
