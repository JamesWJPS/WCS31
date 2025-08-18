import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PageMenuSidebar from '../PageMenuSidebar';
import { ContentItem, ErrorState, LoadingState } from '../../../types';

// Mock content data
const mockContents: ContentItem[] = [
  {
    id: '1',
    title: 'Home',
    status: 'published',
    show_in_menu: true,
    menu_order: 1
  },
  {
    id: '2',
    title: 'About',
    status: 'published',
    show_in_menu: true,
    menu_order: 2
  }
];

const mockErrorState: ErrorState = {
  code: 'NETWORK_ERROR',
  message: 'Failed to connect to server',
  timestamp: new Date(),
  retryable: true,
  details: {
    retryCount: 1,
    operation: 'refresh-contents'
  }
};

const mockLoadingState: LoadingState = {
  isLoading: true,
  operation: 'refresh-contents',
  progress: 50
};

describe('PageMenuSidebar Error Handling', () => {
  const defaultProps = {
    isAdminMode: true,
    onPageSelect: vi.fn(),
    showAdminControls: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading States', () => {
    it('shows loading indicator with default message', () => {
      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={true}
          contents={[]}
        />
      );

      expect(screen.getAllByText('Loading pages...')).toHaveLength(2); // One in visually-hidden span, one in loading-text div
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows loading indicator with specific operation message', () => {
      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          loadingState={mockLoadingState}
          contents={[]}
        />
      );

      expect(screen.getAllByText('Refreshing content...')).toHaveLength(2); // One in visually-hidden span, one in loading-text div
    });

    it('shows progress bar when progress is provided', () => {
      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          loadingState={mockLoadingState}
          contents={[]}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveStyle('width: 50%');
    });

    it('shows retry operation loading state', () => {
      const retryLoadingState: LoadingState = {
        isLoading: true,
        operation: 'retry-operation'
      };

      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          loadingState={retryLoadingState}
          contents={[]}
        />
      );

      expect(screen.getAllByText('Retrying...')).toHaveLength(2); // One in visually-hidden span, one in loading-text div
    });
  });

  describe('Error States', () => {
    it('shows error state when there is an error and no content', () => {
      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          error="Failed to load content"
          errorState={mockErrorState}
          contents={[]}
        />
      );

      expect(screen.getByText('Failed to Load Pages')).toBeInTheDocument();
      expect(screen.getByText('Failed to load content')).toBeInTheDocument();
      expect(screen.getByText('Retry attempt 1 of 3')).toBeInTheDocument();
    });

    it('shows retry button for retryable errors', () => {
      const mockOnRetry = vi.fn();

      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          error="Network error"
          errorState={mockErrorState}
          contents={[]}
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).not.toBeDisabled();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const mockOnRetry = vi.fn().mockResolvedValue(undefined);

      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          error="Network error"
          errorState={mockErrorState}
          contents={[]}
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('shows refresh button', () => {
      const mockOnRefresh = vi.fn();

      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          error="Network error"
          errorState={mockErrorState}
          contents={[]}
          onRefresh={mockOnRefresh}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('calls onRefresh when refresh button is clicked', async () => {
      const mockOnRefresh = vi.fn().mockResolvedValue(undefined);

      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          error="Network error"
          errorState={mockErrorState}
          contents={[]}
          onRefresh={mockOnRefresh}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('disables retry button during retry operation', async () => {
      const mockOnRetry = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          error="Network error"
          errorState={mockErrorState}
          contents={[]}
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      
      // Click the retry button
      fireEvent.click(retryButton);

      // Button should be disabled immediately after click
      expect(retryButton).toBeDisabled();
      expect(screen.getAllByText('Retrying...')).toHaveLength(2); // In button text and spinner

      // Wait for retry to complete
      await waitFor(() => {
        expect(retryButton).not.toBeDisabled();
      }, { timeout: 200 });
    });

    it('does not show retry button for non-retryable errors', () => {
      const nonRetryableError: ErrorState = {
        ...mockErrorState,
        retryable: false
      };

      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          error="Authentication failed"
          errorState={nonRetryableError}
          contents={[]}
          onRetry={vi.fn()}
        />
      );

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });

  describe('Error Indicators in Header', () => {
    it('shows error indicator in header when there is an error but content is available', () => {
      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          error="Connection issues"
          errorState={mockErrorState}
          contents={mockContents}
        />
      );

      expect(screen.getByTitle('Error: Connection issues')).toBeInTheDocument();
    });

    it('shows unhealthy real-time indicator', () => {
      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          error="Connection issues"
          contents={mockContents}
          isRealTimeEnabled={true}
          isHealthy={false}
        />
      );

      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByTitle('Live updates experiencing issues')).toBeInTheDocument();
    });

    it('shows healthy real-time indicator', () => {
      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          contents={mockContents}
          isRealTimeEnabled={true}
          isHealthy={true}
          lastUpdate={new Date()}
        />
      );

      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('shows error banner with retry button in admin mode', () => {
      const mockOnRetry = vi.fn();

      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          error="Connection issues"
          errorState={mockErrorState}
          contents={mockContents}
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('Connection issues')).toBeInTheDocument();
      
      const retryButton = screen.getByTitle('Retry failed operation');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Clearing', () => {
    it('calls onClearError when retry is successful', async () => {
      const mockOnRetry = vi.fn().mockResolvedValue(undefined);
      const mockOnClearError = vi.fn();

      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          error="Network error"
          errorState={mockErrorState}
          contents={[]}
          onRetry={mockOnRetry}
          onClearError={mockOnClearError}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockOnClearError).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onClearError when refresh is successful', async () => {
      const mockOnRefresh = vi.fn().mockResolvedValue(undefined);
      const mockOnClearError = vi.fn();

      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          error="Network error"
          errorState={mockErrorState}
          contents={[]}
          onRefresh={mockOnRefresh}
          onClearError={mockOnClearError}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockOnClearError).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for error states', () => {
      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          error="Failed to load content"
          errorState={mockErrorState}
          contents={[]}
          onRetry={vi.fn()}
          onRefresh={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('provides proper loading state announcements', () => {
      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={true}
          contents={[]}
        />
      );

      const loadingStatus = screen.getByRole('status');
      expect(loadingStatus).toHaveTextContent('Loading pages...');
    });

    it('provides proper progress bar attributes', () => {
      render(
        <PageMenuSidebar
          {...defaultProps}
          loading={false}
          loadingState={mockLoadingState}
          contents={[]}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });
});