import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentPreview from '../ContentPreview';
import { contentService } from '../../../services/contentService';

// Mock the content service
jest.mock('../../../services/contentService');
const mockContentService = contentService as jest.Mocked<typeof contentService>;

describe('ContentPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render preview header', () => {
    render(
      <ContentPreview
        title=""
        body=""
        templateId=""
      />
    );

    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh preview' })).toBeInTheDocument();
  });

  it('should show empty state when no content provided', () => {
    render(
      <ContentPreview
        title=""
        body=""
        templateId=""
      />
    );

    expect(screen.getByText('Fill in the title, select a template, and add content to see a preview.')).toBeInTheDocument();
  });

  it('should show loading state while generating preview', async () => {
    mockContentService.getContentPreview.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('<div>Preview</div>'), 100))
    );

    render(
      <ContentPreview
        contentId="1"
        title="Test Title"
        body="<p>Test body</p>"
        templateId="template-1"
      />
    );

    expect(screen.getByText('Generating preview...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // LoadingSpinner has role="status"
  });

  it('should generate preview for existing content', async () => {
    const mockPreviewHtml = '<div class="content"><h1>Test Title</h1><p>Test body</p></div>';
    mockContentService.getContentPreview.mockResolvedValue(mockPreviewHtml);

    render(
      <ContentPreview
        contentId="1"
        title="Test Title"
        body="<p>Test body</p>"
        templateId="template-1"
      />
    );

    await waitFor(() => {
      expect(mockContentService.getContentPreview).toHaveBeenCalledWith('1');
    });

    // Check that iframe is rendered with the preview content
    const iframe = screen.getByTitle('Content Preview');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('sandbox', 'allow-same-origin');
  });

  it('should generate simple preview for new content', async () => {
    render(
      <ContentPreview
        title="New Title"
        body="<p>New content</p>"
        templateId="template-1"
      />
    );

    await waitFor(() => {
      const iframe = screen.getByTitle('Content Preview');
      expect(iframe).toBeInTheDocument();
    });

    // Should not call the API for new content
    expect(mockContentService.getContentPreview).not.toHaveBeenCalled();
  });

  it('should show error state when preview generation fails', async () => {
    mockContentService.getContentPreview.mockRejectedValue(new Error('Preview failed'));

    render(
      <ContentPreview
        contentId="1"
        title="Test Title"
        body="<p>Test body</p>"
        templateId="template-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to generate preview: Failed to generate preview')).toBeInTheDocument();
    });
  });

  it('should handle refresh button click', async () => {
    const user = userEvent.setup();
    mockContentService.getContentPreview.mockResolvedValue('<div>Refreshed preview</div>');

    render(
      <ContentPreview
        contentId="1"
        title="Test Title"
        body="<p>Test body</p>"
        templateId="template-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByTitle('Content Preview')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: 'Refresh preview' });
    await user.click(refreshButton);

    // Should trigger a re-render and potentially call the service again
    expect(refreshButton).toBeInTheDocument();
  });

  it('should update preview when props change', async () => {
    const { rerender } = render(
      <ContentPreview
        title="Original Title"
        body="<p>Original body</p>"
        templateId="template-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByTitle('Content Preview')).toBeInTheDocument();
    });

    // Change props
    rerender(
      <ContentPreview
        title="Updated Title"
        body="<p>Updated body</p>"
        templateId="template-1"
      />
    );

    // Should still show preview (new content generates simple preview)
    await waitFor(() => {
      expect(screen.getByTitle('Content Preview')).toBeInTheDocument();
    });
  });

  it('should clear preview when required props are missing', async () => {
    const { rerender } = render(
      <ContentPreview
        title="Test Title"
        body="<p>Test body</p>"
        templateId="template-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByTitle('Content Preview')).toBeInTheDocument();
    });

    // Remove required props
    rerender(
      <ContentPreview
        title=""
        body=""
        templateId=""
      />
    );

    expect(screen.getByText('Fill in the title, select a template, and add content to see a preview.')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ContentPreview
        title=""
        body=""
        templateId=""
        className="custom-preview"
      />
    );

    expect(container.firstChild).toHaveClass('content-preview', 'custom-preview');
  });

  it('should generate proper iframe content structure', async () => {
    render(
      <ContentPreview
        title="Test Title"
        body="<p>Test content</p>"
        templateId="template-1"
      />
    );

    await waitFor(() => {
      const iframe = screen.getByTitle('Content Preview');
      expect(iframe).toBeInTheDocument();
      
      // Check iframe attributes
      expect(iframe).toHaveAttribute('sandbox', 'allow-same-origin');
      expect(iframe).toHaveClass('preview-iframe');
      
      // The srcDoc should contain proper HTML structure
      const srcDoc = iframe.getAttribute('srcDoc');
      expect(srcDoc).toContain('<!DOCTYPE html>');
      expect(srcDoc).toContain('<html lang="en">');
      expect(srcDoc).toContain('<meta charset="UTF-8">');
      expect(srcDoc).toContain('<meta name="viewport"');
      expect(srcDoc).toContain('Test Title');
    });
  });

  it('should handle missing template gracefully', async () => {
    render(
      <ContentPreview
        title="Test Title"
        body="<p>Test content</p>"
        templateId=""
      />
    );

    expect(screen.getByText('Fill in the title, select a template, and add content to see a preview.')).toBeInTheDocument();
  });

  it('should handle missing title gracefully', async () => {
    render(
      <ContentPreview
        title=""
        body="<p>Test content</p>"
        templateId="template-1"
      />
    );

    expect(screen.getByText('Fill in the title, select a template, and add content to see a preview.')).toBeInTheDocument();
  });

  it('should handle missing body gracefully', async () => {
    render(
      <ContentPreview
        title="Test Title"
        body=""
        templateId="template-1"
      />
    );

    expect(screen.getByText('Fill in the title, select a template, and add content to see a preview.')).toBeInTheDocument();
  });
});