import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FolderPermissions from '../FolderPermissions';
import { folderService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { Folder } from '../../../types';

// Mock dependencies
jest.mock('../../../services', () => ({
  folderService: {
    updateFolder: jest.fn(),
  },
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

const mockFolderService = folderService as jest.Mocked<typeof folderService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockFolder: Folder = {
  id: 'folder-1',
  name: 'Test Folder',
  parentId: null,
  isPublic: false,
  permissions: {
    read: ['user-1'],
    write: ['user-1'],
  },
  createdBy: 'user-1',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'administrator' as const,
};

describe('FolderPermissions', () => {
  const defaultProps = {
    folder: mockFolder,
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser, login: jest.fn(), logout: jest.fn() });
  });

  it('renders permissions modal when open', () => {
    render(<FolderPermissions {...defaultProps} />);
    
    expect(screen.getByText('Permissions: Test Folder')).toBeInTheDocument();
    expect(screen.getByText('Folder Visibility')).toBeInTheDocument();
    expect(screen.getByText('User Permissions')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<FolderPermissions {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Permissions: Test Folder')).not.toBeInTheDocument();
  });

  it('shows access denied for unauthorized users', () => {
    mockUseAuth.mockReturnValue({ 
      user: { ...mockUser, id: 'other-user', role: 'read-only' }, 
      login: jest.fn(), 
      logout: jest.fn() 
    });
    
    render(<FolderPermissions {...defaultProps} />);
    
    expect(screen.getByText("You don't have permission to manage this folder's permissions.")).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('allows folder creator to manage permissions', () => {
    render(<FolderPermissions {...defaultProps} />);
    
    expect(screen.getByText('Folder Visibility')).toBeInTheDocument();
    expect(screen.getByText('User Permissions')).toBeInTheDocument();
  });

  it('allows administrators to manage permissions', () => {
    const adminUser = { ...mockUser, id: 'admin-user', role: 'administrator' as const };
    mockUseAuth.mockReturnValue({ user: adminUser, login: jest.fn(), logout: jest.fn() });
    
    render(<FolderPermissions {...defaultProps} />);
    
    expect(screen.getByText('Folder Visibility')).toBeInTheDocument();
    expect(screen.getByText('User Permissions')).toBeInTheDocument();
  });

  it('displays current folder visibility state', () => {
    render(<FolderPermissions {...defaultProps} />);
    
    const publicCheckbox = screen.getByRole('checkbox');
    expect(publicCheckbox).not.toBeChecked(); // folder.isPublic is false
    expect(screen.getByText('🔒 Private')).toBeInTheDocument();
  });

  it('displays public folder state', () => {
    const publicFolder = { ...mockFolder, isPublic: true };
    render(<FolderPermissions {...defaultProps} folder={publicFolder} />);
    
    const publicCheckbox = screen.getByRole('checkbox');
    expect(publicCheckbox).toBeChecked();
    expect(screen.getByText('🌐 Public')).toBeInTheDocument();
  });

  it('toggles folder visibility', async () => {
    const user = userEvent.setup();
    render(<FolderPermissions {...defaultProps} />);
    
    const publicCheckbox = screen.getByRole('checkbox');
    await user.click(publicCheckbox);
    
    expect(publicCheckbox).toBeChecked();
    expect(screen.getByText('🌐 Public')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).not.toBeDisabled();
  });

  it('displays user permissions', () => {
    render(<FolderPermissions {...defaultProps} />);
    
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com • administrator')).toBeInTheDocument();
    
    const permissionSelect = screen.getByDisplayValue('Read & Write');
    expect(permissionSelect).toBeInTheDocument();
  });

  it('changes user permissions', async () => {
    const user = userEvent.setup();
    render(<FolderPermissions {...defaultProps} />);
    
    const permissionSelect = screen.getByDisplayValue('Read & Write');
    await user.selectOptions(permissionSelect, 'read');
    
    expect(screen.getByDisplayValue('Read Only')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).not.toBeDisabled();
  });

  it('saves permission changes', async () => {
    const user = userEvent.setup();
    const onPermissionsUpdated = jest.fn();
    const updatedFolder = { ...mockFolder, isPublic: true };
    
    mockFolderService.updateFolder.mockResolvedValue(updatedFolder);
    
    render(<FolderPermissions {...defaultProps} onPermissionsUpdated={onPermissionsUpdated} />);
    
    // Toggle public
    const publicCheckbox = screen.getByRole('checkbox');
    await user.click(publicCheckbox);
    
    // Save changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(mockFolderService.updateFolder).toHaveBeenCalledWith('folder-1', {
        isPublic: true,
        permissions: {
          read: ['user-1'],
          write: ['user-1'],
        },
      });
    });
    
    expect(onPermissionsUpdated).toHaveBeenCalledWith(updatedFolder);
  });

  it('handles save errors', async () => {
    const user = userEvent.setup();
    const error = new Error('Failed to update permissions');
    
    mockFolderService.updateFolder.mockRejectedValue(error);
    
    render(<FolderPermissions {...defaultProps} />);
    
    // Make a change
    const publicCheckbox = screen.getByRole('checkbox');
    await user.click(publicCheckbox);
    
    // Save changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to update permissions')).toBeInTheDocument();
    });
  });

  it('cancels changes', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    
    render(<FolderPermissions {...defaultProps} onClose={onClose} />);
    
    // Make a change
    const publicCheckbox = screen.getByRole('checkbox');
    await user.click(publicCheckbox);
    
    // Cancel
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('disables save button when no changes made', () => {
    render(<FolderPermissions {...defaultProps} />);
    
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when changes are made', async () => {
    const user = userEvent.setup();
    render(<FolderPermissions {...defaultProps} />);
    
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
    
    // Make a change
    const publicCheckbox = screen.getByRole('checkbox');
    await user.click(publicCheckbox);
    
    expect(saveButton).not.toBeDisabled();
  });

  it('shows loading state while saving', async () => {
    const user = userEvent.setup();
    
    // Make updateFolder return a promise that doesn't resolve immediately
    mockFolderService.updateFolder.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockFolder), 100))
    );
    
    render(<FolderPermissions {...defaultProps} />);
    
    // Make a change
    const publicCheckbox = screen.getByRole('checkbox');
    await user.click(publicCheckbox);
    
    // Save changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);
    
    // Should show loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
    
    // Wait for save to complete
    await waitFor(() => {
      expect(mockFolderService.updateFolder).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('displays permission level explanations', () => {
    render(<FolderPermissions {...defaultProps} />);
    
    expect(screen.getByText('Permission Levels')).toBeInTheDocument();
    expect(screen.getByText(/No Access.*cannot see or access/)).toBeInTheDocument();
    expect(screen.getByText(/Read Only.*view and download/)).toBeInTheDocument();
    expect(screen.getByText(/Read & Write.*view, download, upload, and manage/)).toBeInTheDocument();
  });

  it('shows appropriate visibility descriptions', () => {
    render(<FolderPermissions {...defaultProps} />);
    
    expect(screen.getByText(/only accessible to users with specific permissions/)).toBeInTheDocument();
    
    // Toggle to public
    const publicCheckbox = screen.getByRole('checkbox');
    fireEvent.click(publicCheckbox);
    
    expect(screen.getByText(/visible to website visitors/)).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<FolderPermissions {...defaultProps} />);
    
    // Tab to checkbox
    await user.tab();
    const publicCheckbox = screen.getByRole('checkbox');
    expect(publicCheckbox).toHaveFocus();
    
    // Space to toggle
    await user.keyboard(' ');
    expect(publicCheckbox).toBeChecked();
  });
});