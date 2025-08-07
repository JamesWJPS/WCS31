import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import Modal from '../Modal';

expect.extend(toHaveNoViolations);

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    children: <div>Modal content</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a div to act as modal root
    const modalRoot = document.createElement('div');
    modalRoot.setAttribute('id', 'modal-root');
    document.body.appendChild(modalRoot);
  });

  afterEach(() => {
    // Clean up modal root
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) {
      document.body.removeChild(modalRoot);
    }
    // Reset body overflow
    document.body.style.overflow = '';
  });

  it('renders modal content when open', () => {
    render(<Modal {...defaultProps} />);
    
    expect(screen.getByText('Modal content')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Modal {...defaultProps} title="Test Modal" />);
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('renders close button by default', () => {
    render(<Modal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close modal/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('hides close button when showCloseButton is false', () => {
    render(<Modal {...defaultProps} showCloseButton={false} />);
    
    expect(screen.queryByRole('button', { name: /close modal/i })).not.toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    const footer = <button>Footer Button</button>;
    render(<Modal {...defaultProps} footer={footer} />);
    
    expect(screen.getByText('Footer Button')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close modal/i });
    await user.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when escape key is pressed', () => {
    render(<Modal {...defaultProps} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when escape key is pressed and closeOnEscape is false', () => {
    render(<Modal {...defaultProps} closeOnEscape={false} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);
    
    const overlay = screen.getByRole('dialog');
    await user.click(overlay);
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when overlay is clicked and closeOnOverlayClick is false', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} closeOnOverlayClick={false} />);
    
    const overlay = screen.getByRole('dialog');
    await user.click(overlay);
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when modal content is clicked', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);
    
    const content = screen.getByText('Modal content');
    await user.click(content);
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<Modal {...defaultProps} size="sm" />);
    expect(document.querySelector('.modal-sm')).toBeInTheDocument();

    rerender(<Modal {...defaultProps} size="lg" />);
    expect(document.querySelector('.modal-lg')).toBeInTheDocument();
  });

  it('prevents body scroll when open', () => {
    render(<Modal {...defaultProps} />);
    
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when closed', () => {
    const { rerender } = render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
    
    rerender(<Modal {...defaultProps} isOpen={false} />);
    expect(document.body.style.overflow).toBe('');
  });

  it('traps focus within modal', async () => {
    const user = userEvent.setup();
    render(
      <Modal {...defaultProps}>
        <button>First Button</button>
        <button>Second Button</button>
      </Modal>
    );

    const firstButton = screen.getByText('First Button');
    const secondButton = screen.getByText('Second Button');
    const closeButton = screen.getByRole('button', { name: /close modal/i });

    // Focus should start on modal
    await waitFor(() => {
      expect(document.activeElement).toBe(document.querySelector('.modal-content'));
    });

    // Tab should move to first focusable element
    await user.tab();
    expect(document.activeElement).toBe(closeButton);

    // Tab should move to next focusable element
    await user.tab();
    expect(document.activeElement).toBe(firstButton);

    await user.tab();
    expect(document.activeElement).toBe(secondButton);

    // Tab from last element should wrap to first
    await user.tab();
    expect(document.activeElement).toBe(closeButton);

    // Shift+Tab should move backwards
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(secondButton);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Modal {...defaultProps} title="Accessible Modal" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct ARIA attributes', () => {
    render(<Modal {...defaultProps} title="Test Modal" />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });
});