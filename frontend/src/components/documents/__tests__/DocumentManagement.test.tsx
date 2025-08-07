import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentManagement from '../DocumentManagement';
import { useAuth } from '../../../hooks/useAuth';
import { folderService } from '../../../services';

// Mock dependencies
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../services', () => ({
  folderService: {
    createFolder: jest.fn(),
    deleteFolder: jest.fn(),
  },
}));

// Mock child components
jest.mock('../FileUpload', () => {
  return function MockFileUpload({ onUploadComplete }: any) {
    return (
      <div data-testid="file-upload">
        <button onClick={() => onUploadComplete([{ id: '1', name: 'test.pdf' }])}>
          Mock Upload
        </button>
      </div>
    );
  };
});

jest.mock('../FolderTree', () => {
  return function MockFolderTree({ onFolderSelect, onFolderCreate, onFolderEdit, onFolderDelete }: any) {
    return (
      <div data-testid="folder-tree">
        <button onClick={() => onFolderSelect({ id: '1', name: 'Test Folder' })}>
          Select Folder
        </button>
        <button onClick={() => onFolderCreate('1')}>Create Subfolder</button>
        <button onClick={() => onFolderEdit({ id: '1', name: 'Test Folder' })}>
          Edit Folder
        </button>
        <button onClick={() => onFolderDelete({ id: '1', name: 'Test Folder' })}>
          Delete Folder
        </button>
      </div>
    );
  };
});

jest.mock('../DocumentList', () => {
  return function MockDocumentList({ onDocumentEdit, onDocumentDelete, onDocumentMove, onBulkAction }: any) {
    const mockDoc = { id: '1', originalName: 'test.pdf' };
    return (
      <div data-testid="document-list">
        <button onClick={() => onDocumentEdit?.(mockDoc)}>Edit Document</button>
        <button onClick={() => onDocumentDelete?.(mockDoc)}>Delete Document</button>
        <button onClick={() => onDocumentMove?.(mockDoc)}>Move Document</button>
        <button onClick={() => onBulkAction?.('delete', [mockDoc])}>Bulk Delete</button>
      </div>
    );
  };
});

jest.mock('../FolderPermissions', () => {
  return function MockFolderPermissions({ isOpen, onClose, onPermissionsUpdated }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="folder-permissions">
        <button onClick={onClose}>Close Permissions</button>
        <button onClick={() => onPermissionsUpdated({ id: '1', name: 'Updated Folder' })}>
          Update Permissions
        </button>
      </div>
    );
  };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockFolderService = folderService as jest.Mocked<typeof folderService>;

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'administrator' as const,
};

// Mock window.confirm
global.confirm = jest.fn();

describe('DocumentManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser, login: jest.fn(), logout: jest.fn() });
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  it('renders document management interface', () => {
    render(<DocumentManagement />);
    
    expect(screen.getByText('Document Management')).toBeInTheDocument();
    expect(screen.getByText('📁 New Folder')).toBeInTheDocument();
    expect(screen.getByTestId('folder-tree')).toBeInTheDocument();
    expect(screen.getByTestId('document-list')).toBeInTheDocument();
  });

  it('shows upload button when folder is selected', () => {
    render(<DocumentManagement />);
    
    // Initially no upload button
    expect(screen.queryByText('📤 Upload Files')).not.toBeInTheDocument();
    
    // Select a folder
    fireEvent.click(screen.getByText('Select Folder'));
    
    // Now upload button should appear
    expect(screen.getByText('📤 Upload Files')).toBeInTheDocument();
  });

  it('hides actions for read-only users', () => {
    const readOnlyUser = { ...mockUser, role: 'read-only' as const };
    mockUseAuth.mockReturnValue({ user: readOnlyUser, login: jest.fn(), logout: jest.fn() });
    
    render(<DocumentManagement />);
    
    expect(screen.queryByText('📁 New Folder')).not.toBeInTheDocument();
    expect(screen.queryByText('📤 Upload Files')).not.toBeInTheDocument();
  });

  it('opens create folder modal', async () => {
    const user = userEvent.setup();
    render(<DocumentManagement />);
    
    await user.click(screen.getByText('📁 New Folder'));
    
    expect(screen.getByText('Create New Folder')).toBeInTheDocument();
    expect(screen.getByLabelText('Folder Name')).toBeInTheDocument();
  });

  it('creates a new folder', async () => {
    const user = userEvent.setup();
    const mockFolder = { id: '1', name: 'New Folder' };
    mockFolderService.createFolder.mockResolvedValue(mockFolder as any);
    
    render(<DocumentManagement />);
    
    // Open create folder modal
    await user.click(screen.getByText('📁 New Folder'));
    
    // Fill in folder name
    const nameInput = screen.getByLabelText('Folder Name');
    await user.type(nameInput, 'New Folder');
    
    // Submit form
    const createButton = screen.getByText('Create Folder');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(mockFolderService.createFolder).toHaveBeenCalledWith({
        name: 'New Folder',
        parentId: null,
        isPublic: false,
      });
    });
  });

  it('creates a public folder', async () => {
    const user = userEvent.setup();
    const mockFolder = { id: '1', name: 'Public Folder' };
    mockFolderService.createFolder.mockResolvedValue(mockFolder as any);
    
    render(<DocumentManagement />);
    
    // Open create folder modal
    await user.click(screen.getByText('📁 New Folder'));
    
    // Fill in folder name
    const nameInput = screen.getByLabelText('Folder Name');
    await user.type(nameInput, 'Public Folder');
    
    // Check public checkbox
    const publicCheckbox = screen.getByRole('checkbox');
    await user.click(publicCheckbox);
    
    // Submit form
    const createButton = screen.getByText('Create Folder');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(mockFolderService.createFolder).toHaveBeenCalledWith({
        name: 'Public Folder',
        parentId: null,
        isPublic: true,
      });
    });
  });

  it('cancels folder creation', async () => {
    const user = userEvent.setup();
    render(<DocumentManagement />);
    
    // Open create folder modal
    await user.click(screen.getByText('📁 New Folder'));
    
    // Cancel
    await user.click(screen.getByText('Cancel'));
    
    expect(screen.queryByText('Create New Folder')).not.toBeInTheDocument();
  });

  it('handles folder selection', () => {
    render(<DocumentManagement />);
    
    // Initially shows "All Documents"
    expect(screen.getByText('All Documents')).toBeInTheDocument();
    
    // Select a folder
    fireEvent.click(screen.getByText('Select Folder'));
    
    // Should show folder name
    expect(screen.getByText('Test Folder')).toBeInTheDocument();
  });

  it('opens upload modal when upload button is clicked', async () => {
    const user = userEvent.setup();
    render(<DocumentManagement />);
    
    // Select a folder first
    fireEvent.click(screen.getByText('Select Folder'));
    
    // Click upload button
    await user.click(screen.getByText('📤 Upload Files'));
    
    expect(screen.getByText('Upload Files to Test Folder')).toBeInTheDocument();
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });

  it('handles upload completion', async () => {
    const user = userEvent.setup();
    render(<DocumentManagement />);
    
    // Select a folder and open upload modal
    fireEvent.click(screen.getByText('Select Folder'));
    await user.click(screen.getByText('📤 Upload Files'));
    
    // Simulate upload completion
    fireEvent.click(screen.getByText('Mock Upload'));
    
    // Modal should close
    expect(screen.queryByText('Upload Files to Test Folder')).not.toBeInTheDocument();
  });

  it('opens permissions modal', async () => {
    const user = userEvent.setup();
    render(<DocumentManagement />);
    
    // Select a folder first
    fireEvent.click(screen.getByText('Select Folder'));
    
    // Click permissions button
    await user.click(screen.getByText('🔒 Permissions'));
    
    expect(screen.getByTestId('folder-permissions')).toBeInTheDocument();
  });

  it('handles permissions update', () => {
    render(<DocumentManagement />);
    
    // Select a folder and open permissions
    fireEvent.click(screen.getByText('Select Folder'));
    fireEvent.click(screen.getByText('🔒 Permissions'));
    
    // Update permissions
    fireEvent.click(screen.getByText('Update Permissions'));
    
    // Modal should close
    expect(screen.queryByTestId('folder-permissions')).not.toBeInTheDocument();
  });

  it('handles folder deletion with confirmation', async () => {
    mockFolderService.deleteFolder.mockResolvedValue();
    
    render(<DocumentManagement />);
    
    // Delete folder
    fireEvent.click(screen.getByText('Delete Folder'));
    
    expect(global.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete the folder "Test Folder"? This action cannot be undone.'
    );
    
    await waitFor(() => {
      expect(mockFolderService.deleteFolder).toHaveBeenCalledWith('1');
    });
  });

  it('cancels folder deletion when not confirmed', () => {
    (global.confirm as jest.Mock).mockReturnValue(false);
    
    render(<DocumentManagement />);
    
    // Delete folder
    fireEvent.click(screen.getByText('Delete Folder'));
    
    expect(mockFolderService.deleteFolder).not.toHaveBeenCalled();
  });

  it('handles folder creation from tree', () => {
    render(<DocumentManagement />);
    
    // Create subfolder
    fireEvent.click(screen.getByText('Create Subfolder'));
    
    expect(screen.getByText('Create New Folder')).toBeInTheDocument();
  });

  it('handles folder editing from tree', () => {
    render(<DocumentManagement />);
    
    // Edit folder
    fireEvent.click(screen.getByText('Edit Folder'));
    
    expect(screen.getByTestId('folder-permissions')).toBeInTheDocument();
  });

  it('handles document actions', () => {
    render(<DocumentManagement />);
    
    // These would trigger console.log in the mock implementation
    fireEvent.click(screen.getByText('Edit Document'));
    fireEvent.click(screen.getByText('Move Document'));
    fireEvent.click(screen.getByText('Bulk Delete'));
    
    // No assertions needed as these are placeholder implementations
  });

  it('shows folder-specific upload button', async () => {
    const user = userEvent.setup();
    render(<DocumentManagement />);
    
    // Select a folder
    fireEvent.click(screen.getByText('Select Folder'));
    
    // Should show upload button in folder actions
    const folderUploadButton = screen.getAllByText('📤 Upload')[1]; // Second upload button
    await user.click(folderUploadButton);
    
    expect(screen.getByText('Upload Files to Test Folder')).toBeInTheDocument();
  });

  it('validates folder name input', async () => {
    const user = userEvent.setup();
    
    // Mock alert
    global.alert = jest.fn();
    
    render(<DocumentManagement />);
    
    // Open create folder modal
    await user.click(screen.getByText('📁 New Folder'));
    
    // Submit without name
    const createButton = screen.getByText('Create Folder');
    await user.click(createButton);
    
    expect(global.alert).toHaveBeenCalledWith('Please enter a folder name');
    expect(mockFolderService.createFolder).not.toHaveBeenCalled();
  });

  it('handles folder creation errors', async () => {
    const user = userEvent.setup();
    const error = new Error('Failed to create folder');
    mockFolderService.createFolder.mockRejectedValue(error);
    
    // Mock alert and console.error
    global.alert = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<DocumentManagement />);
    
    // Open create folder modal and submit
    await user.click(screen.getByText('📁 New Folder'));
    
    const nameInput = screen.getByLabelText('Folder Name');
    await user.type(nameInput, 'Test Folder');
    
    const createButton = screen.getByText('Create Folder');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create folder:', error);
      expect(global.alert).toHaveBeenCalledWith('Failed to create folder. Please try again.');
    });
    
    consoleSpy.mockRestore();
  });

  it('handles folder deletion errors', async () => {
    const error = new Error('Failed to delete folder');
    mockFolderService.deleteFolder.mockRejectedValue(error);
    
    // Mock alert and console.error
    global.alert = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<DocumentManagement />);
    
    // Delete folder
    fireEvent.click(screen.getByText('Delete Folder'));
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to delete folder:', error);
      expect(global.alert).toHaveBeenCalledWith('Failed to delete folder. Please try again.');
    });
    
    consoleSpy.mockRestore();
  });
});