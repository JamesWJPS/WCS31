import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentList from '../DocumentList';
import { documentService } from '../../../services';
import { Document } from '../../../types';

// Mock the document service
jest.mock('../../../services', () => ({
  documentService: {
    getDocuments: jest.fn(),
    getDocumentsInFolder: jest.fn(),
    downloadDocument: jest.fn(),
  },
}));

const mockDocumentService = documentService as jest.Mocked<typeof documentService>;

const mockDocuments: Document[] = [
  {
    id: '1',
    filename: 'document1.pdf',
    originalName: 'Document 1.pdf',
    mimeType: 'application/pdf',
    size: 1024000,
    folderId: 'folder-1',
    uploadedBy: 'user-1',
    createdAt: '2023-01-01T00:00:00Z',
    metadata: {
      title: 'Document 1',
      description: 'First document',
      tags: ['important', 'pdf'],
    },
  },
  {
    id: '2',
    filename: 'image.jpg',
    originalName: 'Image.jpg',
    mimeType: 'image/jpeg',
    size: 512000,
    folderId: 'folder-1',
    uploadedBy: 'user-2',
    createdAt: '2023-01-02T00:00:00Z',
    metadata: {
      title: 'Image',
      description: 'An image file',
      tags: ['image'],
    },
  },
];

// Mock URL.createObjectURL and related APIs
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('DocumentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocumentService.getDocuments.mockResolvedValue(mockDocuments);
    mockDocumentService.getDocumentsInFolder.mockResolvedValue(mockDocuments);
  });

  it('renders loading state initially', () => {
    render(<DocumentList />);
    
    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });

  it('renders document list after loading', async () => {
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Image')).toBeInTheDocument();
    expect(screen.getByText('2 of 2 documents')).toBeInTheDocument();
  });

  it('loads documents for specific folder', async () => {
    render(<DocumentList folderId="folder-1" />);
    
    await waitFor(() => {
      expect(mockDocumentService.getDocumentsInFolder).toHaveBeenCalledWith('folder-1');
    });
    
    expect(screen.getByText('2 of 2 documents in this folder')).toBeInTheDocument();
  });

  it('handles document selection', async () => {
    const onDocumentSelect = jest.fn();
    render(<DocumentList onDocumentSelect={onDocumentSelect} />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Document 1'));
    
    expect(onDocumentSelect).toHaveBeenCalledWith(mockDocuments[0]);
  });

  it('filters documents by search term', async () => {
    const user = userEvent.setup();
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('Search documents...');
    await user.type(searchInput, 'image');
    
    // Should only show the image document
    expect(screen.queryByText('Document 1')).not.toBeInTheDocument();
    expect(screen.getByText('Image')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 documents')).toBeInTheDocument();
  });

  it('filters documents by mime type', async () => {
    const user = userEvent.setup();
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    const typeFilter = screen.getByDisplayValue('All Types');
    await user.selectOptions(typeFilter, 'application/pdf');
    
    // Should only show PDF documents
    expect(screen.getByText('Document 1')).toBeInTheDocument();
    expect(screen.queryByText('Image')).not.toBeInTheDocument();
  });

  it('sorts documents by name', async () => {
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    const nameSort = screen.getByText('Name ↑');
    fireEvent.click(nameSort);
    
    // Should toggle to descending
    expect(screen.getByText('Name ↓')).toBeInTheDocument();
  });

  it('sorts documents by date', async () => {
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    const dateSort = screen.getByText('Date');
    fireEvent.click(dateSort);
    
    expect(screen.getByText('Date ↑')).toBeInTheDocument();
  });

  it('sorts documents by size', async () => {
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    const sizeSort = screen.getByText('Size');
    fireEvent.click(sizeSort);
    
    expect(screen.getByText('Size ↑')).toBeInTheDocument();
  });

  it('switches between list and grid view', async () => {
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    const gridViewButton = screen.getByLabelText('Grid view');
    fireEvent.click(gridViewButton);
    
    const documentItems = document.querySelector('.document-list__items');
    expect(documentItems).toHaveClass('document-list__items--grid');
    
    const listViewButton = screen.getByLabelText('List view');
    fireEvent.click(listViewButton);
    
    expect(documentItems).toHaveClass('document-list__items--list');
  });

  it('handles document download', async () => {
    const mockBlob = new Blob(['file content'], { type: 'application/pdf' });
    mockDocumentService.downloadDocument.mockResolvedValue(mockBlob);
    
    // Mock document.createElement and appendChild
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation();
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation();
    
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    const downloadButton = screen.getAllByTitle('Download')[0];
    fireEvent.click(downloadButton);
    
    await waitFor(() => {
      expect(mockDocumentService.downloadDocument).toHaveBeenCalledWith('1');
    });
    
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockAnchor.download).toBe('Document 1.pdf');
    expect(mockAnchor.click).toHaveBeenCalled();
    
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('handles document editing', async () => {
    const onDocumentEdit = jest.fn();
    render(<DocumentList onDocumentEdit={onDocumentEdit} />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    const editButton = screen.getAllByTitle('Edit')[0];
    fireEvent.click(editButton);
    
    expect(onDocumentEdit).toHaveBeenCalledWith(mockDocuments[0]);
  });

  it('handles document deletion', async () => {
    const onDocumentDelete = jest.fn();
    render(<DocumentList onDocumentDelete={onDocumentDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    const deleteButton = screen.getAllByTitle('Delete')[0];
    fireEvent.click(deleteButton);
    
    expect(onDocumentDelete).toHaveBeenCalledWith(mockDocuments[0]);
  });

  it('handles document moving', async () => {
    const onDocumentMove = jest.fn();
    render(<DocumentList onDocumentMove={onDocumentMove} />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    const moveButton = screen.getAllByTitle('Move')[0];
    fireEvent.click(moveButton);
    
    expect(onDocumentMove).toHaveBeenCalledWith(mockDocuments[0]);
  });

  it('supports bulk selection', async () => {
    render(<DocumentList selectable={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    const selectAllButton = screen.getByText('Select All');
    fireEvent.click(selectAllButton);
    
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('handles bulk actions', async () => {
    const onBulkAction = jest.fn();
    render(<DocumentList selectable={true} onBulkAction={onBulkAction} />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    // Select all documents
    const selectAllButton = screen.getByText('Select All');
    fireEvent.click(selectAllButton);
    
    // Open bulk actions
    const actionsButton = screen.getByText('Actions');
    fireEvent.click(actionsButton);
    
    // Click download all
    const downloadAllButton = screen.getByText('Download All');
    fireEvent.click(downloadAllButton);
    
    expect(onBulkAction).toHaveBeenCalledWith('download', mockDocuments);
  });

  it('shows empty state when no documents exist', async () => {
    mockDocumentService.getDocuments.mockResolvedValue([]);
    
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('No documents found')).toBeInTheDocument();
    });
  });

  it('handles loading error', async () => {
    const error = new Error('Failed to load documents');
    mockDocumentService.getDocuments.mockRejectedValue(error);
    
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load documents')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('displays file icons correctly', async () => {
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    const documentItems = document.querySelectorAll('.document-list__icon');
    
    // PDF should show document icon
    expect(documentItems[0]).toHaveTextContent('📄');
    
    // Image should show image icon
    expect(documentItems[1]).toHaveTextContent('🖼️');
  });

  it('formats file sizes correctly', async () => {
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    // 1024000 bytes should be formatted as "1000 KB"
    expect(screen.getByText('1000 KB')).toBeInTheDocument();
    
    // 512000 bytes should be formatted as "500 KB"
    expect(screen.getByText('500 KB')).toBeInTheDocument();
  });

  it('formats dates correctly', async () => {
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    // Should format ISO date to readable format
    expect(screen.getByText(/Jan 1, 2023/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 2, 2023/)).toBeInTheDocument();
  });

  it('displays document tags', async () => {
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    expect(screen.getByText('important')).toBeInTheDocument();
    expect(screen.getByText('pdf')).toBeInTheDocument();
    expect(screen.getByText('image')).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<DocumentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    const firstDocument = screen.getByText('Document 1').closest('.document-list__item');
    
    // Focus the document item
    firstDocument!.focus();
    expect(firstDocument).toHaveFocus();
    
    // Press Enter to select
    await user.keyboard('{Enter}');
    // Selection behavior would be tested with onDocumentSelect mock
  });
});