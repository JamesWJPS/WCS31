import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import LoadingSpinner from '../LoadingSpinner';

expect.extend(toHaveNoViolations);

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
    expect(spinner).toHaveClass('loading-spinner', 'loading-spinner-md', 'loading-spinner-primary');
  });

  it('renders with custom aria-label', () => {
    render(<LoadingSpinner aria-label="Processing data" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Processing data');
    expect(screen.getByText('Processing data')).toHaveClass('sr-only');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    expect(screen.getByRole('status')).toHaveClass('loading-spinner-sm');

    rerender(<LoadingSpinner size="lg" />);
    expect(screen.getByRole('status')).toHaveClass('loading-spinner-lg');
  });

  it('applies color classes correctly', () => {
    const { rerender } = render(<LoadingSpinner color="secondary" />);
    expect(screen.getByRole('status')).toHaveClass('loading-spinner-secondary');

    rerender(<LoadingSpinner color="white" />);
    expect(screen.getByRole('status')).toHaveClass('loading-spinner-white');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-spinner" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('loading-spinner', 'custom-spinner');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<LoadingSpinner aria-label="Loading content" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('provides screen reader text', () => {
    render(<LoadingSpinner aria-label="Loading data" />);
    
    const screenReaderText = screen.getByText('Loading data');
    expect(screenReaderText).toHaveClass('sr-only');
  });

  it('combines all props correctly', () => {
    render(
      <LoadingSpinner 
        size="lg"
        color="secondary"
        className="custom-class"
        aria-label="Custom loading"
      />
    );
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass(
      'loading-spinner',
      'loading-spinner-lg',
      'loading-spinner-secondary',
      'custom-class'
    );
    expect(spinner).toHaveAttribute('aria-label', 'Custom loading');
  });
});