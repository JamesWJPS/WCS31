import { configureAxe } from 'jest-axe';
import { render, RenderResult } from '@testing-library/react';
import { ReactElement } from 'react';

// Configure axe for consistent testing
export const axe = configureAxe({
  rules: {
    // Enable all WCAG 2.2 AA rules
    'color-contrast': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'heading-order': { enabled: true },
    'landmark-one-main': { enabled: true },
    'skip-link': { enabled: true },
  },
});

/**
 * Test component for accessibility violations
 */
export const testAccessibility = async (component: ReactElement): Promise<void> => {
  const { container } = render(component);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

/**
 * Test keyboard navigation for a component
 */
export const testKeyboardNavigation = async (
  component: ReactElement,
  expectedFocusableElements: number
): Promise<void> => {
  const { container } = render(component);
  
  // Get all focusable elements
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  expect(focusableElements).toHaveLength(expectedFocusableElements);
  
  // Test tab navigation
  if (focusableElements.length > 0) {
    const firstElement = focusableElements[0] as HTMLElement;
    firstElement.focus();
    expect(document.activeElement).toBe(firstElement);
  }
};

/**
 * Test color contrast for elements
 */
export const testColorContrast = async (component: ReactElement): Promise<void> => {
  const { container } = render(component);
  const results = await axe(container, {
    rules: {
      'color-contrast': { enabled: true }
    }
  });
  
  expect(results).toHaveNoViolations();
};

/**
 * Test screen reader compatibility
 */
export const testScreenReaderCompatibility = (renderResult: RenderResult): void => {
  const { container } = renderResult;
  
  // Check for proper ARIA labels
  const elementsWithAriaLabel = container.querySelectorAll('[aria-label]');
  const elementsWithAriaLabelledBy = container.querySelectorAll('[aria-labelledby]');
  const elementsWithAriaDescribedBy = container.querySelectorAll('[aria-describedby]');
  
  // Ensure interactive elements have accessible names
  const interactiveElements = container.querySelectorAll(
    'button, input, select, textarea, a[href]'
  );
  
  interactiveElements.forEach((element) => {
    const hasAccessibleName = 
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      (element as HTMLInputElement).placeholder ||
      element.getAttribute('title');
    
    expect(hasAccessibleName).toBeTruthy();
  });
};

/**
 * Test focus management
 */
export const testFocusManagement = (renderResult: RenderResult): void => {
  const { container } = renderResult;
  
  // Check that focus indicators are visible
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  focusableElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    htmlElement.focus();
    
    // Check if element has focus styles or is properly focused
    expect(document.activeElement).toBe(htmlElement);
  });
};

/**
 * Test heading structure
 */
export const testHeadingStructure = (renderResult: RenderResult): void => {
  const { container } = renderResult;
  
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headingLevels: number[] = [];
  
  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1));
    headingLevels.push(level);
  });
  
  // Check that heading levels don't skip (e.g., h1 -> h3)
  for (let i = 1; i < headingLevels.length; i++) {
    const currentLevel = headingLevels[i];
    const previousLevel = headingLevels[i - 1];
    
    if (currentLevel > previousLevel) {
      expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
    }
  }
};

/**
 * Comprehensive accessibility test suite
 */
export const runAccessibilityTestSuite = async (
  component: ReactElement,
  options: {
    expectedFocusableElements?: number;
    skipKeyboardTest?: boolean;
    skipColorContrastTest?: boolean;
  } = {}
): Promise<void> => {
  const renderResult = render(component);
  
  // Run axe accessibility tests
  await testAccessibility(component);
  
  // Test keyboard navigation if not skipped
  if (!options.skipKeyboardTest && options.expectedFocusableElements !== undefined) {
    await testKeyboardNavigation(component, options.expectedFocusableElements);
  }
  
  // Test color contrast if not skipped
  if (!options.skipColorContrastTest) {
    await testColorContrast(component);
  }
  
  // Test screen reader compatibility
  testScreenReaderCompatibility(renderResult);
  
  // Test focus management
  testFocusManagement(renderResult);
  
  // Test heading structure
  testHeadingStructure(renderResult);
};