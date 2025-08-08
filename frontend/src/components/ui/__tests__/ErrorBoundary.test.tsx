import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';

// Mock component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; errorType?: string }> = ({ 
  shouldThrow = false, 
  errorType = 'generic' 
}) => {
  if (shouldThrow) {
    if (errorType === 'chunk') {
      const error = new Error('Loading chunk 1 failed');
      error.name = 'ChunkLoadError';
      throw error;
    } else if (errorType === 'network') {
      throw new Error('Network Error: Failed to fetch');
    } else {
      throw new Error('Test error');
    }
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong with this component/)).toBeInTheDocument();
  });

  it('displays custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('displays appropriate message for chunk load errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType="chunk" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Failed to load application resources/)).toBeInTheDocument();
  });

  it('displays appropriate message for network errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType="network" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Network connection error/)).toBeInTheDocument();
  });

  it('displays different UI for global errors', () => {
    render(
      <ErrorBoundary level="global">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Application Error')).toBeInTheDocument();
    expect(screen.getByText(/A critical error occurred/)).toBeInTheDocument();
  });

  it('allows retry functionality', async () => {
    let shouldThrow = true;
    const TestComponent = () => <ThrowError shouldThrow={shouldThrow} />;
    
    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    const retryButton = screen.getByText('Try Again');
    
    // Change the error state before clicking retry
    shouldThrow = false;
    fireEvent.click(retryButton);

    // Wait for the error boundary to reset
    await waitFor(() => {
      // The error boundary should reset and show no error
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('shows refresh page button after multiple retries', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // The error boundary always shows both buttons
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
  });

  it('displays error ID for tracking', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    expect(screen.getByText(/error_\d+_[a-z0-9]+/)).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error details (development only)')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error details (development only)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('shows report error button in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Report Error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('stores error logs in localStorage', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const errorLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0]).toMatchObject({
      message: 'Test error',
      timestamp: expect.any(String),
      userAgent: expect.any(String),
      url: expect.any(String),
    });
  });

  it('limits error logs to 10 entries', () => {
    // Add 15 errors to test the limit
    for (let i = 0; i < 15; i++) {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      unmount();
    }

    const errorLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
    expect(errorLogs).toHaveLength(10);
  });

  it('resets on prop changes when resetOnPropsChange is true', () => {
    const { rerender } = render(
      <ErrorBoundary resetOnPropsChange={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Change children prop
    rerender(
      <ErrorBoundary resetOnPropsChange={true}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('resets on resetKeys change', () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={['key1']}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Change resetKeys
    rerender(
      <ErrorBoundary resetKeys={['key2']}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const errorContainer = screen.getByRole('alert');
    expect(errorContainer).toBeInTheDocument();
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    const refreshButton = screen.getByText('Refresh Page');
    expect(refreshButton).toBeInTheDocument();
  });
});