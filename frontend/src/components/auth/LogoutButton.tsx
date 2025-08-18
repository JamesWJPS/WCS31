import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

interface LogoutButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showConfirmation?: boolean;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({
  variant = 'secondary',
  size = 'medium',
  className = '',
  showConfirmation = false,
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (showConfirmation && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, redirect to login
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
      setShowConfirm(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <div className="logout-confirmation">
        <span>Are you sure you want to sign out?</span>
        <div className="logout-confirmation__actions">
          <Button
            variant="danger"
            size="small"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Signing out...' : 'Yes, sign out'}
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={handleCancel}
            disabled={isLoggingOut}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={className}
      aria-label="Sign out of your account"
    >
      {isLoggingOut ? 'Signing out...' : 'Sign Out'}
    </Button>
  );
};

export default LogoutButton;