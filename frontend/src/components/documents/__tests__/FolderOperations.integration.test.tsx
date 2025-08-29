import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { useFolderOperations } from '../FolderOperations';
import { folderService } from '../../../services';
import { Folder } from '../../../types';

// Mock the services
vi.mock('../../../services', () => ({
  folderService: {
    createFolder: vi.fn(),
    updateFolder: vi.fn(),
    deleteFolder: vi.fn(),
    getFolder: vi.fn(),
    getFolderStatistics: vi.fn()
  }
}));

// Mock UI components
vi.mock('../../ui', () => ({
  Button: ({ children, onClick, disabled, loading, variant, type }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled || loading}
      data-variant={variant}
      type={type}
      data-testid={`button-${variant || 'default'}-${type || 'button'}`}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
  Modal: ({ children, isOpen, title }: any) => 
    isOpen ? <div data-testid="modal" aria-label={title}>{children}</div> : null,
  Input: ({ value, onChange, disabled, placeholder, id, ...props }: any) => (
    <input
      id={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      data-testid={`input-${id}`}
      {...props}
    />
  ),
  ErrorMessage: ({ message }: any) => <div data-testid="error-message">{message}</div>
}));

const TestComponent: React.FC<{ currentUserId?: string }> = ({ currentUserId }) => {
  const { openCreateModal, openEditModal, openDeleteModal, modals } = useFolderOperations({
    currentUserId,
    onError: vi.fn(),
    onFolderCreated: vi.fn(),
    onFolderUpdated: vi.fn(),
    onFolderDeleted: vi.fn()
  });

  const mockFolder: Folder = {
    id: 'folder-1',
    name: 'Test Folder',
    parentId: null,
    isPublic: false,
    permissions: {
      read: ['user-1'],
      write: ['user-1']
    },
    createdBy: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  return (
    <div>
      <button onClick={() => openCreateModal(null)} data-testid="open-create">Create Folder</button>
      <button onClick={() => openEditModal(mockFolder)} data-testid="open-edit">Edit Folder</button>
      <button onClick={() => openDeleteModal(mockFolder)} data-testid="open-delete">Delete Folder</button>
      {modals}
    </div>
  );
};

describe('FolderOperations - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Folder Modal', () => {
    it('should open and close create folder modal', async () => {
      const user = userEvent.setup();
      render(<TestComponent currentUserId="user-1" />);

      // Modal should not be visible initially
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();

      // Open modal
      await user.click(screen.getByTestId('open-create'));
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByLabelText('Create New Folder')).toBeInTheDocument();

      // Close modal
      await user.click(screen.getByTestId('button-secondary-button'));
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should validate folder name and show errors', async () => {
      const user = userEvent.setup();
      render(<TestComponent currentUserId="user-1" />);

      await user.click(screen.getByTestId('open-create'));

      // Try to submit without name
      await user.click(screen.getByTestId('button-primary-submit'));
      expect(screen.getByTestId('error-message')).toHaveTextContent('Folder name is required');

      // Enter invalid name
      const input = screen.getByTestId('input-folder-name');
      await user.type(input, 'invalid<>name');
      await user.click(screen.getByTestId('button-primary-submit'));
      expect(screen.getByTestId('error-message')).toHaveTextContent('Folder name can only contain letters, numbers, spaces, hyphens, underscores, periods, and parentheses');
    });

    it('should create folder successfully with valid input', async () => {
      const user = userEvent.setup();
      const mockFolder: Folder = {
        id: 'new-folder',
        name: 'New Folder',
        parentId: null,
        isPublic: false,
        permissions: { read: ['user-1'], write: ['user-1'] },
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      vi.mocked(folderService.createFolder).mockResolvedValue(mockFolder);

      render(<TestComponent currentUserId="user-1" />);

      await user.click(screen.getByTestId('open-create'));

      const input = screen.getByTestId('input-folder-name');
      await user.type(input, 'New Folder');
      await user.click(screen.getByTestId('button-primary-submit'));

      await waitFor(() => {
        expect(folderService.createFolder).toHaveBeenCalledWith({
          name: 'New Folder',
          parentId: null,
          isPublic: false,
          permissions: {
            read: ['user-1'],
            write: ['user-1']
          }
        });
      });
    });
  });

  describe('Edit Folder Modal', () => {
    it('should open edit modal with existing folder data', async () => {
      const user = userEvent.setup();
      render(<TestComponent currentUserId="user-1" />);

      await user.click(screen.getByTestId('open-edit'));
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit Folder')).toBeInTheDocument();
      
      const input = screen.getByTestId('input-edit-folder-name');
      expect(input).toHaveValue('Test Folder');
    });

    it('should update folder successfully', async () => {
      const user = userEvent.setup();
      const updatedFolder: Folder = {
        id: 'folder-1',
        name: 'Updated Folder',
        parentId: null,
        isPublic: false,
        permissions: { read: ['user-1'], write: ['user-1'] },
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      vi.mocked(folderService.updateFolder).mockResolvedValue(updatedFolder);

      render(<TestComponent currentUserId="user-1" />);

      await user.click(screen.getByTestId('open-edit'));
      
      const input = screen.getByTestId('input-edit-folder-name');
      await user.clear(input);
      await user.type(input, 'Updated Folder');
      await user.click(screen.getByTestId('button-primary-submit'));

      await waitFor(() => {
        expect(folderService.updateFolder).toHaveBeenCalledWith('folder-1', {
          name: 'Updated Folder',
          isPublic: false
        });
      });
    });
  });

  describe('Delete Folder Modal', () => {
    it('should open delete modal and show confirmation', async () => {
      const user = userEvent.setup();
      vi.mocked(folderService.getFolderStatistics).mockResolvedValue({
        documentCount: 3,
        totalSize: 1024,
        subfolderCount: 1
      });

      render(<TestComponent currentUserId="user-1" />);

      await user.click(screen.getByTestId('open-delete'));
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete Folder')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
      expect(screen.getByText(/Test Folder/)).toBeInTheDocument();
    });

    it('should require exact folder name confirmation', async () => {
      const user = userEvent.setup();
      vi.mocked(folderService.getFolderStatistics).mockResolvedValue({
        documentCount: 0,
        totalSize: 0,
        subfolderCount: 0
      });

      render(<TestComponent currentUserId="user-1" />);

      await user.click(screen.getByTestId('open-delete'));
      
      const deleteButton = screen.getByTestId('button-danger-submit');
      expect(deleteButton).toBeDisabled();

      const confirmInput = screen.getByTestId('input-confirm-folder-name');
      await user.type(confirmInput, 'Wrong Name');
      expect(deleteButton).toBeDisabled();

      await user.clear(confirmInput);
      await user.type(confirmInput, 'Test Folder');
      expect(deleteButton).not.toBeDisabled();
    });

    it('should delete folder when confirmed', async () => {
      const user = userEvent.setup();
      vi.mocked(folderService.getFolderStatistics).mockResolvedValue({
        documentCount: 0,
        totalSize: 0,
        subfolderCount: 0
      });
      vi.mocked(folderService.deleteFolder).mockResolvedValue();

      render(<TestComponent currentUserId="user-1" />);

      await user.click(screen.getByTestId('open-delete'));
      
      const confirmInput = screen.getByTestId('input-confirm-folder-name');
      await user.type(confirmInput, 'Test Folder');
      
      const deleteButton = screen.getByTestId('button-danger-submit');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(folderService.deleteFolder).toHaveBeenCalledWith('folder-1');
      });
    });
  });
});