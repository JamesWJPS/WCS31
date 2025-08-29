import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import FileUpload from '../FileUpload';
import { documentService } from '../../../services';

// Mock the services
vi.mock('../../../services', () => ({
  documentService: {
    uploadDocument: vi.fn(),
    uploadBulkDocuments: vi.fn(),
  },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

const mockDocumentService = documentService as any;

describe('FileUpload - Retry Functionality', () => {
  const mockProps = {
    folderId: 'test-folder-id',
    onUploadComplete: vi.fn(),
    onUploadError: vi.fn(),
    maxRetries: 2,
    retryDelay: 100, // Short delay for testing
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should retry upload on network errors', async () => {
    // Mock network error on first call, success on second
    mockDocumentService.uploadDocument
      .mockRejectedValueOnce(new Error('Network error'))
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

    // Fast-forward through retry delay
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockDocumentService.uploadDocument).toHaveBeenCalledTimes(2);
    });

    expect(mockProps.onUploadComplete).toHaveBeenCalled();
  });

  it('should show retry button for network errors', async () => {
    mockDocumentService.uploadDocument.mockRejectedValue(new Error('Network error'));

    render(<FileUpload {...mockProps} showPreviews={true} />);

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
    });

    expect(screen.getByText(/This appears to be a network issue/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry upload/i })).toBeInTheDocument();
  });

  it('should not show retry button for non-network errors', async () => {
    mockDocumentService.uploadDocument.mockRejectedValue(new Error('File too large'));

    render(<FileUpload {...mockProps} showPreviews={true} />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(screen.getByText(/Upload Failed/)).toBeInTheDocument();
    });

    expect(screen.queryByText(/This appears to be a network issue/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry upload/i })).not.toBeInTheDocument();
  });

  it('should allow manual retry when retry button is clicked', async () => {
    mockDocumentService.uploadDocument
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
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

    render(<FileUpload {...mockProps} showPreviews={true} />);

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

  it('should show retry count in error message', async () => {
    mockDocumentService.uploadDocument.mockRejectedValue(new Error('Network error'));

    render(<FileUpload {...mockProps} showPreviews={true} />);

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

  it('should use exponential backoff for retries', async () => {
    const startTime = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(startTime);

    mockDocumentService.uploadDocument.mockRejectedValue(new Error('Network error'));

    render(<FileUpload {...mockProps} />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    // First retry should happen after 100ms (retryDelay)
    vi.advanceTimersByTime(100);
    expect(mockDocumentService.uploadDocument).toHaveBeenCalledTimes(2);

    // Second retry should happen after 200ms (retryDelay * 2)
    vi.advanceTimersByTime(200);
    expect(mockDocumentService.uploadDocument).toHaveBeenCalledTimes(3);
  });
});