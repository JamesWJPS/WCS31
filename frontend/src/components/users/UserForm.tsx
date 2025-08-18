import React, { useState, useEffect } from 'react';
import { User, ValidationError, CreateUserData, UpdateUserData } from '../../types';
import { userService } from '../../services/userService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { ErrorMessage } from '../ui/ErrorMessage';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import './UserForm.css';

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: User | null; // null for create, User for edit
}

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'administrator' | 'editor' | 'read-only';
  isActive: boolean;
}

const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, onSuccess, user }) => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'read-only',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const isEditMode = !!user;

  useEffect(() => {
    if (isOpen) {
      if (user) {
        // Edit mode - populate form with user data
        setFormData({
          username: user.username,
          email: user.email,
          password: '',
          confirmPassword: '',
          role: user.role,
          isActive: user.isActive,
        });
      } else {
        // Create mode - reset form
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'read-only',
          isActive: true,
        });
      }
      setError(null);
      setValidationErrors([]);
    }
  }, [isOpen, user]);

  const validateForm = (): boolean => {
    const errors: ValidationError[] = [];

    if (!formData.username.trim()) {
      errors.push({ field: 'username', message: 'Username is required' });
    } else if (formData.username.length < 3) {
      errors.push({ field: 'username', message: 'Username must be at least 3 characters' });
    }

    if (!formData.email.trim()) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }

    if (!isEditMode) {
      // Password validation only for create mode
      if (!formData.password) {
        errors.push({ field: 'password', message: 'Password is required' });
      } else if (formData.password.length < 8) {
        errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
      }

      if (formData.password !== formData.confirmPassword) {
        errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
      }
    } else if (formData.password) {
      // Password validation for edit mode only if password is provided
      if (formData.password.length < 8) {
        errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
      }

      if (formData.password !== formData.confirmPassword) {
        errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;

      if (isEditMode && user) {
        // Update existing user
        const updateData: UpdateUserData = {
          username: formData.username,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive,
        };

        // Only include password if it's provided
        if (formData.password) {
          (updateData as any).password = formData.password;
        }

        response = await userService.updateUser(user.id, updateData);
      } else {
        // Create new user
        const createData: CreateUserData = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        };

        response = await userService.createUser(createData);
      }

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.error?.message || `Failed to ${isEditMode ? 'update' : 'create'} user`);
      }
    } catch (err) {
      setError(`Failed to ${isEditMode ? 'update' : 'create'} user`);
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} user:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    setValidationErrors(prev => prev.filter(error => error.field !== field));
  };

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(error => error.field === field)?.message;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit User' : 'Create New User'}
      size="medium"
    >
      <form onSubmit={handleSubmit} className="user-form">
        {error && <ErrorMessage message={error} />}

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="username">Username *</label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              error={getFieldError('username')}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-field">
            <label htmlFor="email">Email *</label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={getFieldError('email')}
              disabled={loading}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="password">
              {isEditMode ? 'New Password (leave blank to keep current)' : 'Password *'}
            </label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              error={getFieldError('password')}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">
              {isEditMode ? 'Confirm New Password' : 'Confirm Password *'}
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              error={getFieldError('confirmPassword')}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="role">Role *</label>
            <Select
              id="role"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value as any)}
              disabled={loading}
            >
              <option value="read-only">Read Only</option>
              <option value="editor">Editor</option>
              <option value="administrator">Administrator</option>
            </Select>
            <small className="field-help">
              {formData.role === 'administrator' && 'Full system access including user management'}
              {formData.role === 'editor' && 'Can create and edit content and documents'}
              {formData.role === 'read-only' && 'Can only view content and documents'}
            </small>
          </div>

          {isEditMode && (
            <div className="form-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  disabled={loading}
                />
                <span className="checkbox-text">Active User</span>
              </label>
              <small className="field-help">
                Inactive users cannot log in to the system
              </small>
            </div>
          )}
        </div>

        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditMode ? 'Update User' : 'Create User'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserForm;