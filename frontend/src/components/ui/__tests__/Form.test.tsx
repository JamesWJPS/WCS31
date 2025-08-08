import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import Form from '../Form';
import { runAccessibilityTestSuite } from '../../../test/accessibility';
import { runKeyboardNavigationTests } from '../../../test/keyboardNavigation';
import { testScreenReaderCompatibility } from '../../../test/screenReader';

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

  describe('Comprehensive Accessibility Tests', () => {
    it('passes complete accessibility test suite', async () => {
      const component = (
        <Form 
          title="Accessible Form"
          description="This form is accessible"
        >
          <label htmlFor="name">Name</label>
          <input id="name" type="text" required />
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required />
          <button type="submit">Submit</button>
        </Form>
      );

      await runAccessibilityTestSuite(component, {
        expectedFocusableElements: 3, // 2 inputs + 1 button
        skipColorContrastTest: false
      });
    });

    it('supports keyboard navigation', async () => {
      const { container } = render(
        <Form title="Keyboard Test Form">
          <label htmlFor="field1">Field 1</label>
          <input id="field1" type="text" />
          <label htmlFor="field2">Field 2</label>
          <input id="field2" type="text" />
          <button type="submit">Submit</button>
        </Form>
      );

      await runKeyboardNavigationTests(container, {
        expectFocusable: true,
        expectEnterActivation: true,
        expectSpaceActivation: true
      });
    });

    it('is compatible with screen readers', () => {
      const { container } = render(
        <Form 
          title="Screen Reader Test"
          description="Form for screen reader testing"
          error="Test error message"
        >
          <fieldset>
            <legend>Personal Information</legend>
            <label htmlFor="firstName">First Name</label>
            <input id="firstName" type="text" required aria-describedby="firstName-help" />
            <div id="firstName-help">Enter your first name</div>
            
            <label htmlFor="lastName">Last Name</label>
            <input id="lastName" type="text" required />
          </fieldset>
          <button type="submit">Submit Form</button>
        </Form>
      );

      testScreenReaderCompatibility(container, {
        expectAriaLabels: true,
        expectFormLabels: true,
        expectHeadingStructure: true,
        expectLiveRegions: true
      });
    });

    it('handles error states accessibly', async () => {
      const { container } = render(
        <Form 
          title="Error Form"
          error="Please fix the errors below"
        >
          <label htmlFor="errorField">Required Field</label>
          <input 
            id="errorField" 
            type="text" 
            aria-invalid="true"
            aria-describedby="errorField-error"
          />
          <div id="errorField-error" role="alert">This field is required</div>
          <button type="submit">Submit</button>
        </Form>
      );

      // Check that error message has alert role
      const errorMessage = screen.getByText('Please fix the errors below');
      expect(errorMessage).toHaveAttribute('role', 'alert');

      // Check field error association
      const fieldError = screen.getByText('This field is required');
      expect(fieldError).toHaveAttribute('role', 'alert');

      // Run accessibility tests
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports loading state accessibility', () => {
      const { container } = render(
        <Form 
          title="Loading Form"
          loading={true}
        >
          <label htmlFor="loadingField">Field</label>
          <input id="loadingField" type="text" />
          <button type="submit">Submit</button>
        </Form>
      );

      // Check for loading indicator
      const loadingIndicator = screen.getByRole('status', { hidden: true });
      expect(loadingIndicator).toBeInTheDocument();

      // Check that form is properly disabled
      const form = screen.getByRole('form');
      expect(form).toHaveClass('form-loading');

      testScreenReaderCompatibility(container, {
        expectLiveRegions: true
      });
    });
  });
});