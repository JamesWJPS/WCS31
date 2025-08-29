import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import FolderTree from '../FolderTree';
import { folderService } from '../../../services';
import { FolderTreeNode } from '../../../types';

// Mock the services
vi.mock('../../../services', () => ({
  folderService: {
    getFolderTree: vi.fn(),
    getFolderPath: vi.fn(),
  }
}));

// Mock the FolderOperations hook
vi.mock('../FolderOperations', () => ({
  useFolderOperations: () => ({
    openCreateModal: vi.fn(),
    openEditModal: vi.fn(),
    openDeleteModal: vi.fn(),
    modals: null
  })
}));

const mockFolderTree: FolderTreeNode[] = [
  {
    id: '1',
    name: 'Documents',
    parentId: null,
    isPublic: true,
    permissions: { read: [], write: [] },
    createdBy: 'user1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    children: [
      {
        id: '2',
        name: 'Subfolder',
        parentId: '1',
        isPublic: false,
        permissions: { read: [], write: [] },
        createdBy: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        children: [],
        documentCount: 5,
        totalSize: 1024000
      }
    ],
    documentCount: 10,
    totalSize: 2048000
  }
];

describe('FolderTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (folderService.getFolderTree as any).mockResolvedValue(mockFolderTree);
    (folderService.getFolderPath as any).mockResolvedValue([]);
  });

  it('renders folder tree with hierarchical structure', async () => {
    render(<FolderTree />);

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    // Check if expand/collapse functionality works
    const expandButton = screen.getByLabelText('Expand folder');
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Subfolder')).toBeInTheDocument();
    });
  });

  it('shows breadcrumb navigation when enabled', async () => {
    const mockPath = [
      { id: '1', name: 'Documents', parentId: null, isPublic: true, permissions: { read: [], write: [] }, createdBy: 'user1', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
    ];
    (folderService.getFolderPath as any).mockResolvedValue(mockPath);

    render(<FolderTree selectedFolderId="1" showBreadcrumbs={true} />);

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
  });

  it('handles folder selection', async () => {
    const onFolderSelect = vi.fn();
    render(<FolderTree onFolderSelect={onFolderSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Documents'));
    expect(onFolderSelect).toHaveBeenCalledWith(mockFolderTree[0]);
  });

  it('shows create folder button when showCreateRoot is true', async () => {
    render(<FolderTree showCreateRoot={true} />);

    await waitFor(() => {
      expect(screen.getByTitle('Create new root folder')).toBeInTheDocument();
    });
  });

  it('displays folder statistics', async () => {
    render(<FolderTree />);

    await waitFor(() => {
      expect(screen.getByText('10 files')).toBeInTheDocument();
    });
  });

  it('handles expand all and collapse all actions', async () => {
    render(<FolderTree />);

    await waitFor(() => {
      expect(screen.getByText('Expand All')).toBeInTheDocument();
      expect(screen.getByText('Collapse All')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Expand All'));
    fireEvent.click(screen.getByText('Collapse All'));
  });

  it('handles loading state', () => {
    (folderService.getFolderTree as any).mockImplementation(() => new Promise(() => {}));
    
    render(<FolderTree />);
    
    expect(screen.getByText('Loading folders...')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    (folderService.getFolderTree as any).mockRejectedValue(new Error('Failed to load'));
    
    render(<FolderTree />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
});