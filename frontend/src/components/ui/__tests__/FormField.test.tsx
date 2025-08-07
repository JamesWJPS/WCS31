import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import FormField from '../FormField';

expect.extend(toHaveNoViolations);

describe('FormField', () => {
  const defaultProps = {
    children: <input type="text" />
  };

  it('renders children', () => {
    render(<FormField {...defaultProps} />);
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<FormField {...defaultProps} label="Test Label" />);
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('shows required indicator when required is true', () => {
    render(<FormField {...defaultProps} label="Required Field" required />);
    
    const requiredIndicator = screen.getByText('*');
    expect(requiredIndicator).toBeInTheDocument();
    expect(requiredIndicator).toHaveAttribute('aria-label', 'required');
  });

  it('renders error message when provided', () => {
    render(<FormField {...defaultProps} error="This field is required" />);
    
    const errorElement = screen.getByText('This field is required');
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveAttribute('role', 'alert');
  });

  it('renders helper text when provided and no error', () => {
    render(<FormField {...defaultProps} helperText="This is helpful information" />);
    
    expect(screen.getByText('This is helpful information')).toBeInTheDocument();
  });

  it('does not render helper text when error is present', () => {
    render(
      <FormField 
        {...defaultProps} 
        error="Error message"
        helperText="Helper text"
      />
    );
    
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
  });

  it('applies error class when error is present', () => {
    const { container } = render(<FormField {...defaultProps} error="Error" />);
    
    const formField = container.firstChild;
    expect(formField).toHaveClass('form-field-error');
  });

  it('applies custom className', () => {
    const { container } = render(<FormField {...defaultProps} className="custom-field" />);
    
    const formField = container.firstChild;
    expect(formField).toHaveClass('form-field', 'custom-field');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <FormField 
        label="Accessible Field"
        helperText="This field is accessible"
        required
      >
        <input type="text" aria-describedby="helper-text" />
      </FormField>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with error', async () => {
    const { container } = render(
      <FormField 
        label="Field with Error"
        error="This field has an error"
      >
        <input type="text" aria-invalid="true" />
      </FormField>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('maintains proper structure', () => {
    const { container } = render(
      <FormField 
        label="Test Field"
        error="Error message"
        helperText="Helper text"
        required
      >
        <input type="text" />
      </FormField>
    );
    
    const formField = container.firstChild;
    expect(formField).toHaveClass('form-field');
    
    const label = screen.getByText('Test Field');
    const input = screen.getByRole('textbox');
    const error = screen.getByText('Error message');
    
    expect(label).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(error).toBeInTheDocument();
  });
});