import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserForm from '../UserForm';
import { userService } from '../../../services/userService';
import { User } from '../../../types';

// Mock the user service
vi.mock('../../../services/userService');

// Mock UI components
vi.mock('../../ui/Button', () => ({
  default: ({ children, onClick, type, variant, disabled, ...props }: any) => (
    <button
      onClick={onClick}
      type={type}
      data-variant={variant}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('../../ui/Input', () => ({
  default: ({ onChange, value, error, id, type, disabled, ...props }: any) => (
    <div>
      <input
        id={id}
        type={type}
        onChange={onChange}
        value={value}
        disabled={disabled}
        {...props}
      />
      {error && <span data-testid={`error-${id}`}>{error}</span>}
    </div>
  ),
}));

vi.mock('../../ui/Select', () => ({
  default: ({ children, onChange, value, id, disabled, ...props }: any) => (
    <select
      id={id}
      onChange={onChange}
      value={value}
      disabled={disabled}
      data-testid={`select-${id}`}
      {...props}
    >
      {children}
    </select>
  ),
}));

vi.mock('../../ui/Modal', () => ({
  default: ({ children, isOpen, onClose, title }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null,
}));

vi.mock('../../ui/ErrorMessage', () => ({
  default: ({ message }: { message: string }) => (
    <div data-testid="error-message">{message}</div>
  ),
}));

vi.mock('../../ui/LoadingSpinner', () => ({
  default: ({ size }: { size?: string }) => (
    <div data-testid="loading-spinner" data-size={size}>Loading...</div>
  ),
}));

const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'editor',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastLogin: '2024-01-02T00:00:00Z',
  isActive: true,
};

describe('UserForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('renders create user form when no user is provided', () => {
      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={null}
        />
      );

      expect(screen.getByText('Create New User')).toBeInTheDocument();
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={null}
        />
      );

      const submitButton = screen.getByText('Create User');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-username')).toHaveTextContent('Username is required');
        expect(screen.getByTestId('error-email')).toHaveTextContent('Email is required');
        expect(screen.getByTestId('error-password')).toHaveTextContent('Password is required');
      });
    });

    it('validates password confirmation', async () => {
      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={null}
        />
      );

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'different' } });

      const submitButton = screen.getByText('Create User');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-confirmPassword')).toHaveTextContent('Passwords do not match');
      });
    });

    it('creates user successfully', async () => {
      vi.mocked(userService.createUser).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={null}
        />
      );

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const roleSelect = screen.getByLabelText(/role/i);

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.change(roleSelect, { target: { value: 'editor' } });

      const submitButton = screen.getByText('Create User');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(userService.createUser).toHaveBeenCalledWith({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          role: 'editor',
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    it('renders edit user form when user is provided', () => {
      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={mockUser}
        />
      );

      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByText('Update User')).toBeInTheDocument();
    });

    it('populates form with user data', () => {
      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={mockUser}
        />
      );

      const usernameInput = screen.getByDisplayValue('testuser');
      const emailInput = screen.getByDisplayValue('test@example.com');
      const roleSelect = screen.getByTestId('select-role');

      expect(usernameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(roleSelect).toBeInTheDocument();
      expect(roleSelect).toHaveValue('editor');
    });

    it('shows active user checkbox in edit mode', () => {
      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={mockUser}
        />
      );

      const activeCheckbox = screen.getByLabelText(/active user/i);
      expect(activeCheckbox).toBeInTheDocument();
      expect(activeCheckbox).toBeChecked();
    });

    it('allows password to be optional in edit mode', async () => {
      vi.mocked(userService.updateUser).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={mockUser}
        />
      );

      const usernameInput = screen.getByDisplayValue('testuser');
      fireEvent.change(usernameInput, { target: { value: 'updateduser' } });

      const submitButton = screen.getByText('Update User');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(userService.updateUser).toHaveBeenCalledWith('1', {
          username: 'updateduser',
          email: 'test@example.com',
          role: 'editor',
          isActive: true,
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('includes password in update when provided', async () => {
      vi.mocked(userService.updateUser).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={mockUser}
        />
      );

      const passwordInput = screen.getByLabelText('New Password (leave blank to keep current)');
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });

      const submitButton = screen.getByText('Update User');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(userService.updateUser).toHaveBeenCalledWith('1', {
          username: 'testuser',
          email: 'test@example.com',
          role: 'editor',
          isActive: true,
          password: 'newpassword123',
        });
      });
    });
  });

  it('displays error message when operation fails', async () => {
    vi.mocked(userService.createUser).mockResolvedValue({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Username already exists',
        timestamp: '2024-01-01T00:00:00Z',
      },
    });

    render(
      <UserForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        user={null}
      />
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByText('Create User');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Username already exists');
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <UserForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        user={null}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    render(
      <UserForm
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        user={null}
      />
    );

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });
});