import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileUpload from '../FileUpload';

// Mock the services
jest.mock('../../../services', () => ({
  documentService: {
    uploadDocument: jest.fn(),
    uploadBulkDocuments: jest.fn(),
  },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('FileUpload - Preview Functionality', () => {
  const mockProps = {
    folderId: 'test-folder-id',
    onUploadComplete: jest.fn(),
    onUploadError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show file previews when files are selected', async () => {
    render(<FileUpload {...mockProps} showPreviews={true} />);

    // Create a mock image file
    const imageFile = new File(['image content'], 'test-image.jpg', {
      type: 'image/jpeg',
    });

    const fileInput = screen.getByRole('button', { name: /file upload area/i });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Simulate file selection
    Object.defineProperty(hiddenInput, 'files', {
      value: [imageFile],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    // Wait for previews to be generated
    await waitFor(() => {
      expect(screen.getByText('Selected Files (1)')).toBeInTheDocument();
    });

    // Check if preview elements are present
    expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    expect(screen.getByAltText('test-image.jpg')).toBeInTheDocument();
    expect(screen.getByText(/image\/jpeg/)).toBeInTheDocument();
  });

  it('should show document icons for non-image files', async () => {
    render(<FileUpload {...mockProps} showPreviews={true} />);

    // Create a mock PDF file
    const pdfFile = new File(['pdf content'], 'test-document.pdf', {
      type: 'application/pdf',
    });

    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Simulate file selection
    Object.defineProperty(hiddenInput, 'files', {
      value: [pdfFile],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    // Wait for previews to be generated
    await waitFor(() => {
      expect(screen.getByText('Selected Files (1)')).toBeInTheDocument();
    });

    // Check if document preview elements are present
    expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    expect(screen.getByText(/application\/pdf/)).toBeInTheDocument();
    // Should show document icon instead of image
    expect(screen.queryByAltText('test-document.pdf')).not.toBeInTheDocument();
  });

  it('should allow removing individual previews', async () => {
    render(<FileUpload {...mockProps} showPreviews={true} />);

    const imageFile = new File(['image content'], 'test-image.jpg', {
      type: 'image/jpeg',
    });

    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(hiddenInput, 'files', {
      value: [imageFile],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(screen.getByText('Selected Files (1)')).toBeInTheDocument();
    });

    // Click remove button
    const removeButton = screen.getByRole('button', { name: /remove test-image.jpg/i });
    fireEvent.click(removeButton);

    // Preview should be removed
    await waitFor(() => {
      expect(screen.queryByText('Selected Files (1)')).not.toBeInTheDocument();
    });
  });

  it('should allow clearing all previews', async () => {
    render(<FileUpload {...mockProps} showPreviews={true} />);

    const files = [
      new File(['image1'], 'image1.jpg', { type: 'image/jpeg' }),
      new File(['image2'], 'image2.jpg', { type: 'image/jpeg' }),
    ];

    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(hiddenInput, 'files', {
      value: files,
      writable: false,
    });

    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(screen.getByText('Selected Files (2)')).toBeInTheDocument();
    });

    // Click clear all button
    const clearButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearButton);

    // All previews should be removed
    await waitFor(() => {
      expect(screen.queryByText('Selected Files (2)')).not.toBeInTheDocument();
    });
  });

  it('should not show previews when showPreviews is false', async () => {
    render(<FileUpload {...mockProps} showPreviews={false} />);

    const imageFile = new File(['image content'], 'test-image.jpg', {
      type: 'image/jpeg',
    });

    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(hiddenInput, 'files', {
      value: [imageFile],
      writable: false,
    });

    fireEvent.change(hiddenInput);

    // Should not show preview section
    await waitFor(() => {
      expect(screen.queryByText('Selected Files')).not.toBeInTheDocument();
    });
  });

  it('should clean up object URLs when component unmounts', () => {
    const { unmount } = render(<FileUpload {...mockProps} showPreviews={true} />);

    // Simulate having previews
    const component = screen.getByRole('button', { name: /file upload area/i });
    expect(component).toBeInTheDocument();

    unmount();

    // URL.revokeObjectURL should be called during cleanup
    // This is tested indirectly through the useEffect cleanup
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });
});