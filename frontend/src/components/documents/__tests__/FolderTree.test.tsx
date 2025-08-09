import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FolderTree from '../FolderTree';
import { folderService } from '../../../services';
import { FolderTreeNode } from '../../../types';

// Mock the folder service
jest.mock('../../../services', () => ({
  folderService: {
    getFolderTree: jest.fn(),
  },
}));

const mockFolderService = folderService as jest.Mocked<typeof folderService>;

const mockFolderTree: FolderTreeNode[] = [
  {
    id: '1',
    name: 'Documents',
    parentId: null,
    isPublic: true,
    permissions: { read: [], write: [] },
    createdBy: 'user-1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    children: [
      {
        id: '2',
        name: 'Subfolder',
        parentId: '1',
        isPublic: false,
        permissions: { read: [], write: [] },
        createdBy: 'user-1',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        children: [],
        documentCount: 5,
        totalSize: 1024000,
      },
    ],
    documentCount: 10,
    totalSize: 2048000,
  },
];

describe('FolderTree', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFolderService.getFolderTree.mockResolvedValue(mockFolderTree);
  });

  it('renders loading state initially', () => {
    render(<FolderTree />);
    
    expect(screen.getByText('Loading folders...')).toBeInTheDocument();
  });

  it('renders folder tree after loading', async () => {
    render(<FolderTree />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Folders')).toBeInTheDocument();
    expect(screen.getByText('10 files')).toBeInTheDocument();
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
  });

  it('handles folder selection', async () => {
    const onFolderSelect = jest.fn();
    render(<FolderTree onFolderSelect={onFolderSelect} />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Documents'));
    
    expect(onFolderSelect).toHaveBeenCalledWith(mockFolderTree[0]);
  });

  it('expands and collapses folders', async () => {
    render(<FolderTree />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    // Initially collapsed, subfolder not visible
    expect(screen.queryByText('Subfolder')).not.toBeInTheDocument();
    
    // Click expand button
    const expandButton = screen.getByRole('button', { name: 'Expand folder' });
    fireEvent.click(expandButton);
    
    // Now subfolder should be visible
    expect(screen.getByText('Subfolder')).toBeInTheDocument();
    
    // Click collapse button
    const collapseButton = screen.getByRole('button', { name: 'Collapse folder' });
    fireEvent.click(collapseButton);
    
    // Subfolder should be hidden again
    expect(screen.queryByText('Subfolder')).not.toBeInTheDocument();
  });

  it('shows expand all and collapse all buttons', async () => {
    render(<FolderTree />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Expand All')).toBeInTheDocument();
    expect(screen.getByText('Collapse All')).toBeInTheDocument();
  });

  it('handles expand all action', async () => {
    render(<FolderTree />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    // Initially subfolder not visible
    expect(screen.queryByText('Subfolder')).not.toBeInTheDocument();
    
    // Click expand all
    fireEvent.click(screen.getByText('Expand All'));
    
    // Now subfolder should be visible
    expect(screen.getByText('Subfolder')).toBeInTheDocument();
  });

  it('handles collapse all action', async () => {
    render(<FolderTree />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    // First expand
    fireEvent.click(screen.getByText('Expand All'));
    expect(screen.getByText('Subfolder')).toBeInTheDocument();
    
    // Then collapse all
    fireEvent.click(screen.getByText('Collapse All'));
    expect(screen.queryByText('Subfolder')).not.toBeInTheDocument();
  });

  it('shows folder actions when enabled', async () => {
    render(<FolderTree showActions={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    // Hover over folder to show actions
    const folderItem = screen.getByText('Documents').closest('.folder-tree-node__item');
    fireEvent.mouseEnter(folderItem!);
    
    // Actions should be visible
    expect(screen.getByTitle('Create subfolder')).toBeInTheDocument();
    expect(screen.getByTitle('Edit folder')).toBeInTheDocument();
    expect(screen.getByTitle('Delete folder')).toBeInTheDocument();
  });

  it('handles folder creation', async () => {
    const onFolderCreate = jest.fn();
    render(<FolderTree onFolderCreate={onFolderCreate} showActions={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    // Click create subfolder button
    const createButton = screen.getByTitle('Create subfolder');
    fireEvent.click(createButton);
    
    expect(onFolderCreate).toHaveBeenCalledWith('1');
  });

  it('handles folder editing', async () => {
    const onFolderEdit = jest.fn();
    render(<FolderTree onFolderEdit={onFolderEdit} showActions={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    // Click edit button
    const editButton = screen.getByTitle('Edit folder');
    fireEvent.click(editButton);
    
    expect(onFolderEdit).toHaveBeenCalledWith(mockFolderTree[0]);
  });

  it('handles folder deletion', async () => {
    const onFolderDelete = jest.fn();
    render(<FolderTree onFolderDelete={onFolderDelete} showActions={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    // Click delete button
    const deleteButton = screen.getByTitle('Delete folder');
    fireEvent.click(deleteButton);
    
    expect(onFolderDelete).toHaveBeenCalledWith(mockFolderTree[0]);
  });

  it('shows create root folder button when enabled', async () => {
    render(<FolderTree showCreateRoot={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('➕ New Folder')).toBeInTheDocument();
    });
  });

  it('handles root folder creation', async () => {
    const onFolderCreate = jest.fn();
    render(<FolderTree onFolderCreate={onFolderCreate} showCreateRoot={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('➕ New Folder')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('➕ New Folder'));
    
    expect(onFolderCreate).toHaveBeenCalledWith(null);
  });

  it('shows selected folder state', async () => {
    render(<FolderTree selectedFolderId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    const folderItem = screen.getByText('Documents').closest('.folder-tree-node__item');
    expect(folderItem).toHaveClass('folder-tree-node__item--selected');
  });

  it('shows clear selection button when folder is selected', async () => {
    render(<FolderTree selectedFolderId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText('📁 All Folders')).toBeInTheDocument();
    });
  });

  it('handles clear selection', async () => {
    const onFolderSelect = jest.fn();
    render(<FolderTree selectedFolderId="1" onFolderSelect={onFolderSelect} />);
    
    await waitFor(() => {
      expect(screen.getByText('📁 All Folders')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('📁 All Folders'));
    
    expect(onFolderSelect).toHaveBeenCalledWith(null);
  });

  it('shows empty state when no folders exist', async () => {
    mockFolderService.getFolderTree.mockResolvedValue([]);
    
    render(<FolderTree showCreateRoot={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('No folders found')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Create First Folder')).toBeInTheDocument();
  });

  it('handles loading error', async () => {
    const error = new Error('Failed to load folders');
    mockFolderService.getFolderTree.mockRejectedValue(error);
    
    render(<FolderTree />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load folders')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<FolderTree />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    const folderItem = screen.getByText('Documents').closest('.folder-tree-node__item');
    
    // Focus the folder item
    folderItem!.focus();
    expect(folderItem).toHaveFocus();
    
    // Press Enter to select
    await user.keyboard('{Enter}');
    // Selection behavior would be tested with onFolderSelect mock
  });

  it('shows public/private icons correctly', async () => {
    render(<FolderTree />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    // Public folder should show open folder icon
    const publicFolder = screen.getByText('Documents').closest('.folder-tree-node__item');
    expect(publicFolder?.querySelector('.folder-tree-node__icon')).toHaveTextContent('📂');
    
    // Expand to see private subfolder
    fireEvent.click(screen.getByRole('button', { name: 'Expand folder' }));
    
    await waitFor(() => {
      expect(screen.getByText('Subfolder')).toBeInTheDocument();
    });
    
    // Private folder should show locked icon
    const privateFolder = screen.getByText('Subfolder').closest('.folder-tree-node__item');
    expect(privateFolder?.querySelector('.folder-tree-node__icon')).toHaveTextContent('🔒');
  });

  it('formats file sizes correctly', async () => {
    render(<FolderTree />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    // Should format 2048000 bytes as "2.0 MB"
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
    
    // Expand to see subfolder
    fireEvent.click(screen.getByRole('button', { name: 'Expand folder' }));
    
    await waitFor(() => {
      expect(screen.getByText('Subfolder')).toBeInTheDocument();
    });
    
    // Should format 1024000 bytes as "1000.0 KB"
    expect(screen.getByText('1000.0 KB')).toBeInTheDocument();
  });
});