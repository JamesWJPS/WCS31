import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import FileUpload from '../FileUpload';

// Mock the document service
vi.mock('../../../services', () => ({
  documentService: {
    uploadDocument: vi.fn(),
    uploadBulkDocuments: vi.fn(),
  },
}));

import { documentService } from '../../../services';
const mockDocumentService = documentService as any;

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('FileUpload - Error Handling and Retry Logic', () => {
  const mockProps = {
    folderId: 'test-folder-id',
    onUploadComplete: vi.fn(),
    onUploadError: vi.fn(),
    maxRetries: 2,
    retryDelay: 100,
    showPreviews: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show clear error messages for upload failures', async () => {
    const errorMessage = 'File upload failed due to server error';
    mockDocumentService.uploadDocument.mockRejectedValue(new Error(errorMessage));

    render(<FileUpload {...mockProps} />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    // Fast-forward through all retry attempts
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.getByText(/Upload Failed/)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockProps.onUploadError).toHaveBeenCalledWith(errorMessage);
  });

  it('should detect network errors and show retry option', async () => {
    const networkError = new Error('Network error');
    mockDocumentService.uploadDocument.mockRejectedValue(networkError);

    render(<FileUpload {...mockProps} />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    // Fast-forward through all retry attempts
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.getByText(/Upload Failed - Network Error/)).toBeInTheDocument();
      expect(screen.getByText(/This appears to be a network issue/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry upload/i })).toBeInTheDocument();
    });
  });

  it('should not show retry option for non-network errors', async () => {
    const validationError = new Error('File too large');
    mockDocumentService.uploadDocument.mockRejectedValue(validationError);

    render(<FileUpload {...mockProps} />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    // Fast-forward through all retry attempts
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.getByText(/Upload Failed/)).toBeInTheDocument();
      expect(screen.queryByText(/This appears to be a network issue/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /retry upload/i })).not.toBeInTheDocument();
    });
  });

  it('should show detailed error messages for different error types', async () => {
    render(<FileUpload {...mockProps} maxFileSize={1000} />);

    // Test file size validation error
    const largeFile = new File(['x'.repeat(2000)], 'large.jpg', { type: 'image/jpeg' });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(hiddenInput, 'files', {
      value: [largeFile],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(screen.getByText(/File size exceeds.*limit/)).toBeInTheDocument();
    });
  });

  it('should show detailed error messages for invalid file types', async () => {
    render(<FileUpload {...mockProps} acceptedTypes={['image/jpeg']} />);

    // Test file type validation error
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(hiddenInput, 'files', {
      value: [invalidFile],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(screen.getByText(/File type.*is not supported/)).toBeInTheDocument();
    });
  });

  it('should show retry count in error message', async () => {
    const networkError = new Error('Network timeout');
    mockDocumentService.uploadDocument.mockRejectedValue(networkError);

    render(<FileUpload {...mockProps} />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    // Fast-forward through all retry attempts
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.getByText(/Attempted 2 of 2 retries/)).toBeInTheDocument();
    });
  });

  it('should allow manual retry after automatic retries fail', async () => {
    const networkError = new Error('Network error');
    mockDocumentService.uploadDocument
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({
        id: 'doc-1',
        filename: 'test.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        folderId: 'test-folder-id',
        uploadedBy: 'user-1',
        createdAt: '2023-01-01T00:00:00Z',
        metadata: {},
      });

    render(<FileUpload {...mockProps} />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    // Fast-forward through all automatic retry attempts
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry upload/i })).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /retry upload/i });
    fireEvent.click(retryButton);

    // Fast-forward through retry delay
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockProps.onUploadComplete).toHaveBeenCalled();
    });
  });

  it('should show progress error states for individual files', async () => {
    const networkError = new Error('Network error');
    mockDocumentService.uploadDocument.mockRejectedValue(networkError);

    render(<FileUpload {...mockProps} multiple={false} />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    // Fast-forward through all retry attempts
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.getByText('Upload Progress')).toBeInTheDocument();
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText(/Network error - will retry automatically/)).toBeInTheDocument();
    });
  });

  it('should maintain interface functionality after errors', async () => {
    const error = new Error('Upload failed');
    mockDocumentService.uploadDocument.mockRejectedValue(error);

    render(<FileUpload {...mockProps} />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    // Fast-forward through all retry attempts
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.getByText(/Upload Failed/)).toBeInTheDocument();
    });

    // Interface should still be functional - can still drag and drop
    const dropzone = screen.getByRole('button', { name: 'File upload area' });
    expect(dropzone).toBeInTheDocument();
    expect(dropzone).not.toBeDisabled();

    // Error can be dismissed
    const errorDismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(errorDismissButton);

    await waitFor(() => {
      expect(screen.queryByText(/Upload Failed/)).not.toBeInTheDocument();
    });
  });
});