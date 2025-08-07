import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserList from '../UserList';
import { userService } from '../../../services/userService';
import { User } from '../../../types';

// Mock the user service
vi.mock('../../../services/userService');

// Mock UI components
vi.mock('../../ui/Button', () => ({
  default: ({ children, onClick, variant, size, ...props }: any) => (
    <button onClick={onClick} data-variant={variant} data-size={size} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('../../ui/Input', () => ({
  default: ({ onChange, value, placeholder, ...props }: any) => (
    <input
      onChange={onChange}
      value={value}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

vi.mock('../../ui/Select', () => ({
  default: ({ children, onChange, value, ...props }: any) => (
    <select onChange={onChange} value={value} {...props}>
      {children}
    </select>
  ),
}));

vi.mock('../../ui/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock('../../ui/ErrorMessage', () => ({
  default: ({ message }: { message: string }) => (
    <div data-testid="error-message">{message}</div>
  ),
}));

const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    role: 'administrator',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastLogin: '2024-01-02T00:00:00Z',
    isActive: true,
  },
  {
    id: '2',
    username: 'editor',
    email: 'editor@example.com',
    role: 'editor',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastLogin: null,
    isActive: false,
  },
];

describe('UserList', () => {
  const mockOnEditUser = vi.fn();
  const mockOnCreateUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userService.getUsers).mockResolvedValue({
      success: true,
      data: mockUsers,
    });
  });

  it('renders loading state initially', () => {
    render(
      <UserList
        onEditUser={mockOnEditUser}
        onCreateUser={mockOnCreateUser}
      />
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('renders user list after loading', async () => {
    render(
      <UserList
        onEditUser={mockOnEditUser}
        onCreateUser={mockOnCreateUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('editor')).toBeInTheDocument();
    });

    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('editor@example.com')).toBeInTheDocument();
  });

  it('displays user roles with correct styling', async () => {
    render(
      <UserList
        onEditUser={mockOnEditUser}
        onCreateUser={mockOnCreateUser}
      />
    );

    await waitFor(() => {
      const roleBadges = screen.getAllByText(/^(administrator|editor)$/);
      const adminRole = roleBadges.find(badge => 
        badge.textContent === 'administrator' && badge.closest('.role-badge')
      );
      const editorRole = roleBadges.find(badge => 
        badge.textContent === 'editor' && badge.closest('.role-badge')
      );
      
      expect(adminRole).toBeInTheDocument();
      expect(editorRole).toBeInTheDocument();
      expect(adminRole?.closest('.role-badge')).toHaveClass('role-admin');
      expect(editorRole?.closest('.role-badge')).toHaveClass('role-editor');
    });
  });

  it('displays user status correctly', async () => {
    render(
      <UserList
        onEditUser={mockOnEditUser}
        onCreateUser={mockOnCreateUser}
      />
    );

    await waitFor(() => {
      const statusBadges = screen.getAllByText(/^(Active|Inactive)$/);
      const activeStatus = statusBadges.find(badge => 
        badge.textContent === 'Active' && badge.closest('.status-badge')
      );
      const inactiveStatus = statusBadges.find(badge => 
        badge.textContent === 'Inactive' && badge.closest('.status-badge')
      );
      
      expect(activeStatus).toBeInTheDocument();
      expect(inactiveStatus).toBeInTheDocument();
      expect(activeStatus?.closest('.status-badge')).toHaveClass('active');
      expect(inactiveStatus?.closest('.status-badge')).toHaveClass('inactive');
    });
  });

  it('handles search filter', async () => {
    render(
      <UserList
        onEditUser={mockOnEditUser}
        onCreateUser={mockOnCreateUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'admin' } });

    await waitFor(() => {
      expect(userService.getUsers).toHaveBeenCalledWith({
        search: 'admin',
      });
    });
  });

  it('handles role filter', async () => {
    render(
      <UserList
        onEditUser={mockOnEditUser}
        onCreateUser={mockOnCreateUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    const roleSelect = screen.getByDisplayValue('');
    fireEvent.change(roleSelect, { target: { value: 'administrator' } });

    await waitFor(() => {
      expect(userService.getUsers).toHaveBeenLastCalledWith({
        role: 'administrator',
      });
    });
  });

  it('calls onEditUser when edit button is clicked', async () => {
    render(
      <UserList
        onEditUser={mockOnEditUser}
        onCreateUser={mockOnCreateUser}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Edit')).toHaveLength(2);
    });

    fireEvent.click(screen.getAllByText('Edit')[0]);
    expect(mockOnEditUser).toHaveBeenCalledWith(mockUsers[0]);
  });

  it('calls onCreateUser when create button is clicked', async () => {
    render(
      <UserList
        onEditUser={mockOnEditUser}
        onCreateUser={mockOnCreateUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create User'));
    expect(mockOnCreateUser).toHaveBeenCalled();
  });

  it('handles user activation/deactivation', async () => {
    vi.mocked(userService.deactivateUser).mockResolvedValue({
      success: true,
      data: { ...mockUsers[0], isActive: false },
    });

    render(
      <UserList
        onEditUser={mockOnEditUser}
        onCreateUser={mockOnCreateUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Deactivate')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Deactivate'));

    await waitFor(() => {
      expect(userService.deactivateUser).toHaveBeenCalledWith('1');
    });
  });

  it('handles user deletion with confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(userService.deleteUser).mockResolvedValue({
      success: true,
    });

    render(
      <UserList
        onEditUser={mockOnEditUser}
        onCreateUser={mockOnCreateUser}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Delete')).toHaveLength(2);
    });

    fireEvent.click(screen.getAllByText('Delete')[0]);

    expect(confirmSpy).toHaveBeenCalledWith(
      'Are you sure you want to delete user "admin"? This action cannot be undone.'
    );

    await waitFor(() => {
      expect(userService.deleteUser).toHaveBeenCalledWith('1');
    });

    confirmSpy.mockRestore();
  });

  it('displays error message when loading fails', async () => {
    vi.mocked(userService.getUsers).mockResolvedValue({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch users',
        timestamp: '2024-01-01T00:00:00Z',
      },
    });

    render(
      <UserList
        onEditUser={mockOnEditUser}
        onCreateUser={mockOnCreateUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch users')).toBeInTheDocument();
    });
  });

  it('displays no users message when list is empty', async () => {
    vi.mocked(userService.getUsers).mockResolvedValue({
      success: true,
      data: [],
    });

    render(
      <UserList
        onEditUser={mockOnEditUser}
        onCreateUser={mockOnCreateUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No users found matching your criteria.')).toBeInTheDocument();
    });
  });
});