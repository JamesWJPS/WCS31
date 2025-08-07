import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import LoadingOverlay from '../LoadingOverlay';

expect.extend(toHaveNoViolations);

describe('LoadingOverlay', () => {
  const defaultProps = {
    isLoading: false,
    children: <div>Content to overlay</div>
  };

  it('renders children when not loading', () => {
    render(<LoadingOverlay {...defaultProps} />);
    
    expect(screen.getByText('Content to overlay')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders children and overlay when loading', () => {
    render(<LoadingOverlay {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Content to overlay')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders custom loading message', () => {
    render(
      <LoadingOverlay 
        {...defaultProps} 
        isLoading={true} 
        message="Processing data..."
      />
    );
    
    expect(screen.getByText('Processing data...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Processing data...');
  });

  it('applies custom className', () => {
    const { container } = render(
      <LoadingOverlay {...defaultProps} className="custom-overlay" />
    );
    
    const overlayContainer = container.firstChild;
    expect(overlayContainer).toHaveClass('loading-overlay-container', 'custom-overlay');
  });

  it('has correct ARIA attributes when loading', () => {
    render(<LoadingOverlay {...defaultProps} isLoading={true} />);
    
    const overlay = screen.getByText('Loading...').closest('.loading-overlay');
    expect(overlay).toHaveAttribute('aria-live', 'polite');
  });

  it('has no accessibility violations when not loading', async () => {
    const { container } = render(<LoadingOverlay {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when loading', async () => {
    const { container } = render(
      <LoadingOverlay {...defaultProps} isLoading={true} message="Loading content" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('maintains proper overlay structure', () => {
    render(<LoadingOverlay {...defaultProps} isLoading={true} />);
    
    const container = screen.getByText('Content to overlay').closest('.loading-overlay-container');
    const overlay = container?.querySelector('.loading-overlay');
    const content = overlay?.querySelector('.loading-overlay-content');
    
    expect(container).toBeInTheDocument();
    expect(overlay).toBeInTheDocument();
    expect(content).toBeInTheDocument();
  });

  it('toggles loading state correctly', () => {
    const { rerender } = render(<LoadingOverlay {...defaultProps} isLoading={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    rerender(<LoadingOverlay {...defaultProps} isLoading={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<LoadingOverlay {...defaultProps} isLoading={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});