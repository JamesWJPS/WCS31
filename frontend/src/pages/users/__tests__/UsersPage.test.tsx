import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UsersPage from '../UsersPage';
import { useAuth } from '../../../hooks/useAuth';
import { User } from '../../../types';

// Mock the auth hook
vi.mock('../../../hooks/useAuth');

// Mock the user components
vi.mock('../../../components/users/UserList', () => ({
  default: ({ onEditUser, onCreateUser, refreshTrigger }: any) => (
    <div data-testid="user-list">
      <button onClick={onCreateUser}>Create User</button>
      <button onClick={() => onEditUser({ id: '1', username: 'test' })}>Edit User</button>
      <span data-testid="refresh-trigger">{refreshTrigger}</span>
    </div>
  ),
}));

vi.mock('../../../components/users/UserForm', () => ({
  default: ({ isOpen, onClose, onSuccess, user }: any) =>
    isOpen ? (
      <div data-testid="user-form">
        <span data-testid="form-mode">{user ? 'edit' : 'create'}</span>
        <button onClick={onClose}>Close</button>
        <button onClick={() => { onSuccess(); onClose(); }}>Success</button>
      </div>
    ) : null,
}));

const mockAdminUser: User = {
  id: '1',
  username: 'admin',
  email: 'admin@example.com',
  role: 'administrator',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastLogin: '2024-01-02T00:00:00Z',
  isActive: true,
};

const mockEditorUser: User = {
  id: '2',
  username: 'editor',
  email: 'editor@example.com',
  role: 'editor',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastLogin: '2024-01-02T00:00:00Z',
  isActive: true,
};

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user management interface for administrators', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    render(<UsersPage />);

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText(/Manage system users, their roles, and access permissions/)).toBeInTheDocument();
    expect(screen.getByTestId('user-list')).toBeInTheDocument();
  });

  it('shows access denied for non-administrator users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockEditorUser,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    render(<UsersPage />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('You do not have permission to access user management.')).toBeInTheDocument();
    expect(screen.queryByTestId('user-list')).not.toBeInTheDocument();
  });

  it('shows access denied when no user is logged in', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    render(<UsersPage />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByTestId('user-list')).not.toBeInTheDocument();
  });

  it('opens create user form when create button is clicked', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    render(<UsersPage />);

    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    expect(screen.getByTestId('user-form')).toBeInTheDocument();
    expect(screen.getByTestId('form-mode')).toHaveTextContent('create');
  });

  it('opens edit user form when edit button is clicked', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    render(<UsersPage />);

    const editButton = screen.getByText('Edit User');
    fireEvent.click(editButton);

    expect(screen.getByTestId('user-form')).toBeInTheDocument();
    expect(screen.getByTestId('form-mode')).toHaveTextContent('edit');
  });

  it('closes form when close button is clicked', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    render(<UsersPage />);

    // Open form
    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    expect(screen.getByTestId('user-form')).toBeInTheDocument();

    // Close form
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('user-form')).not.toBeInTheDocument();
  });

  it('refreshes user list when form success is triggered', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    render(<UsersPage />);

    // Initial refresh trigger should be 0
    expect(screen.getByTestId('refresh-trigger')).toHaveTextContent('0');

    // Open form
    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    // Trigger success
    const successButton = screen.getByText('Success');
    fireEvent.click(successButton);

    // Refresh trigger should be incremented
    expect(screen.getByTestId('refresh-trigger')).toHaveTextContent('1');
  });

  it('handles multiple form operations correctly', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    render(<UsersPage />);

    // Create user
    fireEvent.click(screen.getByText('Create User'));
    expect(screen.getByTestId('form-mode')).toHaveTextContent('create');

    // Close form
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByTestId('user-form')).not.toBeInTheDocument();

    // Edit user
    fireEvent.click(screen.getByText('Edit User'));
    expect(screen.getByTestId('form-mode')).toHaveTextContent('edit');

    // Success and close
    fireEvent.click(screen.getByText('Success'));
    expect(screen.queryByTestId('user-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('refresh-trigger')).toHaveTextContent('1');
  });
});