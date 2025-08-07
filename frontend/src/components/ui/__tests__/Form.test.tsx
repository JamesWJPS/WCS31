import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import Form from '../Form';

expect.extend(toHaveNoViolations);

describe('Form', () => {
  const defaultProps = {
    children: <input type="text" placeholder="Test input" />
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form with children', () => {
    render(<Form {...defaultProps} />);
    
    expect(screen.getByRole('form')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Form {...defaultProps} title="Test Form" />);
    
    expect(screen.getByText('Test Form')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <Form 
        {...defaultProps} 
        title="Test Form" 
        description="This is a test form description" 
      />
    );
    
    expect(screen.getByText('This is a test form description')).toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(<Form {...defaultProps} error="Form submission failed" />);
    
    const errorElement = screen.getByText('Form submission failed');
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveAttribute('role', 'alert');
  });

  it('applies loading state correctly', () => {
    render(<Form {...defaultProps} loading={true} />);
    
    const form = screen.getByRole('form');
    expect(form).toHaveClass('form-loading');
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', async () => {
    const handleSubmit = jest.fn((e) => e.preventDefault());
    const user = userEvent.setup();
    
    render(
      <Form onSubmit={handleSubmit}>
        <input type="text" />
        <button type="submit">Submit</button>
      </Form>
    );
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);
    
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('prevents interaction when loading', () => {
    render(
      <Form {...defaultProps} loading={true}>
        <input type="text" />
        <button type="submit">Submit</button>
      </Form>
    );
    
    const form = screen.getByRole('form');
    expect(form).toHaveStyle('pointer-events: none');
  });

  it('applies custom className', () => {
    render(<Form {...defaultProps} className="custom-form" />);
    
    const form = screen.getByRole('form');
    expect(form).toHaveClass('form', 'custom-form');
  });

  it('forwards form attributes correctly', () => {
    render(
      <Form 
        {...defaultProps} 
        method="post" 
        action="/submit"
        noValidate
      />
    );
    
    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('action', '/submit');
    expect(form).toHaveAttribute('noValidate');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Form 
        title="Accessible Form"
        description="This form is accessible"
        error="Test error message"
      >
        <label htmlFor="test-input">Test Input</label>
        <input id="test-input" type="text" />
        <button type="submit">Submit</button>
      </Form>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('maintains proper heading hierarchy', () => {
    render(
      <Form title="Main Form">
        <h3>Subsection</h3>
        <input type="text" />
      </Form>
    );
    
    const mainHeading = screen.getByRole('heading', { level: 2 });
    const subHeading = screen.getByRole('heading', { level: 3 });
    
    expect(mainHeading).toHaveTextContent('Main Form');
    expect(subHeading).toHaveTextContent('Subsection');
  });
});