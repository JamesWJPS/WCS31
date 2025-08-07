import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileUpload from '../FileUpload';
import { documentService } from '../../../services';
import { Document } from '../../../types';

// Mock the document service
jest.mock('../../../services', () => ({
  documentService: {
    uploadDocument: jest.fn(),
    uploadBulkDocuments: jest.fn(),
  },
}));

const mockDocumentService = documentService as jest.Mocked<typeof documentService>;

const mockDocument: Document = {
  id: '1',
  filename: 'test-file.pdf',
  originalName: 'test-file.pdf',
  mimeType: 'application/pdf',
  size: 1024,
  folderId: 'folder-1',
  uploadedBy: 'user-1',
  createdAt: '2023-01-01T00:00:00Z',
  metadata: {
    title: 'Test Document',
    description: 'A test document',
    tags: ['test'],
  },
};

describe('FileUpload', () => {
  const defaultProps = {
    folderId: 'folder-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload dropzone', () => {
    render(<FileUpload {...defaultProps} />);
    
    expect(screen.getByText('Drag and drop files here')).toBeInTheDocument();
    expect(screen.getByText('browse files')).toBeInTheDocument();
    expect(screen.getByText(/Supported formats:/)).toBeInTheDocument();
    expect(screen.getByText(/Maximum file size:/)).toBeInTheDocument();
  });

  it('shows drag over state when files are dragged over', () => {
    render(<FileUpload {...defaultProps} />);
    
    const dropzone = screen.getByRole('button', { name: 'File upload area' });
    
    fireEvent.dragOver(dropzone);
    expect(screen.getByText('Drop files here')).toBeInTheDocument();
    
    fireEvent.dragLeave(dropzone);
    expect(screen.getByText('Drag and drop files here')).toBeInTheDocument();
  });

  it('handles file selection through input', async () => {
    const user = userEvent.setup();
    const onUploadComplete = jest.fn();
    mockDocumentService.uploadDocument.mockResolvedValue(mockDocument);

    render(<FileUpload {...defaultProps} onUploadComplete={onUploadComplete} />);
    
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByRole('button', { name: 'File upload area' });
    
    // Simulate file selection
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(mockDocumentService.uploadDocument).toHaveBeenCalledWith(file, 'folder-1');
    });
    
    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith([mockDocument]);
    });
  });

  it('handles drag and drop file upload', async () => {
    const onUploadComplete = jest.fn();
    mockDocumentService.uploadDocument.mockResolvedValue(mockDocument);

    render(<FileUpload {...defaultProps} onUploadComplete={onUploadComplete} />);
    
    const dropzone = screen.getByRole('button', { name: 'File upload area' });
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });
    
    await waitFor(() => {
      expect(mockDocumentService.uploadDocument).toHaveBeenCalledWith(file, 'folder-1');
    });
    
    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith([mockDocument]);
    });
  });

  it('validates file types', async () => {
    const onUploadError = jest.fn();
    
    render(<FileUpload {...defaultProps} onUploadError={onUploadError} />);
    
    const dropzone = screen.getByRole('button', { name: 'File upload area' });
    const invalidFile = new File(['test content'], 'test.exe', { type: 'application/x-executable' });
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [invalidFile],
      },
    });
    
    await waitFor(() => {
      expect(screen.getByText(/File type.*is not supported/)).toBeInTheDocument();
    });
    
    expect(mockDocumentService.uploadDocument).not.toHaveBeenCalled();
  });

  it('validates file size', async () => {
    render(<FileUpload {...defaultProps} maxFileSize={100} />);
    
    const dropzone = screen.getByRole('button', { name: 'File upload area' });
    const largeFile = new File(['x'.repeat(200)], 'large.pdf', { type: 'application/pdf' });
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [largeFile],
      },
    });
    
    await waitFor(() => {
      expect(screen.getByText(/File size exceeds.*limit/)).toBeInTheDocument();
    });
    
    expect(mockDocumentService.uploadDocument).not.toHaveBeenCalled();
  });

  it('handles multiple file upload', async () => {
    const onUploadComplete = jest.fn();
    const documents = [mockDocument, { ...mockDocument, id: '2' }];
    mockDocumentService.uploadBulkDocuments.mockResolvedValue(documents);

    render(<FileUpload {...defaultProps} onUploadComplete={onUploadComplete} multiple={true} />);
    
    const dropzone = screen.getByRole('button', { name: 'File upload area' });
    const files = [
      new File(['test 1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['test 2'], 'test2.pdf', { type: 'application/pdf' }),
    ];
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files,
      },
    });
    
    await waitFor(() => {
      expect(mockDocumentService.uploadBulkDocuments).toHaveBeenCalledWith(files, 'folder-1');
    });
    
    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith(documents);
    });
  });

  it('shows upload progress', async () => {
    mockDocumentService.uploadDocument.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockDocument), 100))
    );

    render(<FileUpload {...defaultProps} />);
    
    const dropzone = screen.getByRole('button', { name: 'File upload area' });
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });
    
    // Should show uploading state
    await waitFor(() => {
      expect(screen.getByText('Uploading files...')).toBeInTheDocument();
    });
    
    // Should show progress
    await waitFor(() => {
      expect(screen.getByText('Upload Progress')).toBeInTheDocument();
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
    
    // Should complete
    await waitFor(() => {
      expect(mockDocumentService.uploadDocument).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('handles upload errors', async () => {
    const onUploadError = jest.fn();
    const error = new Error('Upload failed');
    mockDocumentService.uploadDocument.mockRejectedValue(error);

    render(<FileUpload {...defaultProps} onUploadError={onUploadError} />);
    
    const dropzone = screen.getByRole('button', { name: 'File upload area' });
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });
    
    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
    
    expect(onUploadError).toHaveBeenCalledWith('Upload failed');
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} />);
    
    const dropzone = screen.getByRole('button', { name: 'File upload area' });
    
    await user.tab();
    expect(dropzone).toHaveFocus();
    
    await user.keyboard('{Enter}');
    // Should trigger file input click (tested indirectly through focus behavior)
  });

  it('displays file size formatting correctly', () => {
    render(<FileUpload {...defaultProps} maxFileSize={10 * 1024 * 1024} />);
    
    expect(screen.getByText(/Maximum file size: 10 MB/)).toBeInTheDocument();
  });

  it('accepts custom file types', () => {
    const customTypes = ['image/jpeg', 'image/png'];
    render(<FileUpload {...defaultProps} acceptedTypes={customTypes} />);
    
    expect(screen.getByText(/Supported formats: jpeg, png/)).toBeInTheDocument();
  });

  it('handles single file mode', async () => {
    const onUploadComplete = jest.fn();
    mockDocumentService.uploadDocument.mockResolvedValue(mockDocument);

    render(<FileUpload {...defaultProps} onUploadComplete={onUploadComplete} multiple={false} />);
    
    const dropzone = screen.getByRole('button', { name: 'File upload area' });
    const files = [
      new File(['test 1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['test 2'], 'test2.pdf', { type: 'application/pdf' }),
    ];
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files,
      },
    });
    
    // Should upload files individually, not as bulk
    await waitFor(() => {
      expect(mockDocumentService.uploadDocument).toHaveBeenCalledTimes(2);
    });
    
    expect(mockDocumentService.uploadBulkDocuments).not.toHaveBeenCalled();
  });
});