# Accessibility Testing Guide

This document provides comprehensive guidance on the accessibility testing system implemented for the Web Communication CMS frontend application.

## Overview

The accessibility testing system ensures that all components and features meet WCAG 2.2 AA standards and provide an excellent experience for users with disabilities. The system includes:

- **Automated accessibility testing** using axe-core
- **Keyboard navigation testing** for all interactive elements
- **Screen reader compatibility testing** with proper ARIA implementation
- **Color contrast validation** for WCAG compliance
- **Comprehensive test suites** for different component types
- **Automated reporting** with detailed results and recommendations

## Quick Start

### Running All Accessibility Tests

```bash
# Run the complete accessibility test suite
npm run test:accessibility

# Alternative shorthand
npm run test:a11y
```

### Running Individual Test Categories

```bash
# Run core accessibility utilities tests
npm test src/test/__tests__/accessibility.test.tsx

# Run color contrast tests
npm test src/utils/__tests__/colorContrast.test.ts

# Run keyboard navigation tests
npm test src/test/__tests__/keyboardNavigation.test.tsx

# Run screen reader compatibility tests
npm test src/test/__tests__/screenReader.test.tsx

# Run integration tests
npm test src/test/__tests__/accessibilityIntegration.test.tsx
```

## Test Categories

### 1. Core Accessibility Tests (`accessibility.test.tsx`)

Tests the fundamental accessibility utilities:

- **testAccessibility**: Runs axe-core validation
- **testKeyboardNavigation**: Validates focusable elements and tab order
- **testColorContrast**: Checks color contrast ratios
- **testScreenReaderCompatibility**: Validates ARIA implementation
- **runAccessibilityTestSuite**: Comprehensive test runner

### 2. Color Contrast Tests (`colorContrast.test.ts`)

Validates WCAG color contrast requirements:

- **Hex color conversion** and RGB calculations
- **Relative luminance** calculations
- **Contrast ratio** computations
- **WCAG AA/AAA compliance** checking
- **Template color validation** for design systems

### 3. Keyboard Navigation Tests (`keyboardNavigation.test.tsx`)

Ensures full keyboard accessibility:

- **Tab navigation** through focusable elements
- **Arrow key navigation** for complex widgets
- **Escape key handling** for modals and dropdowns
- **Enter/Space activation** for buttons and controls
- **Focus trap** functionality for modals

### 4. Screen Reader Tests (`screenReader.test.tsx`)

Validates screen reader compatibility:

- **ARIA labels and descriptions** validation
- **Landmark roles** and navigation structure
- **Heading hierarchy** and semantic structure
- **Live regions** for dynamic content
- **Form labels** and associations
- **Interactive element** accessibility

### 5. Integration Tests (`accessibilityIntegration.test.tsx`)

Real-world component testing scenarios:

- **Complete form components** with all accessibility features
- **Modal dialogs** with proper focus management
- **Data tables** with headers and navigation
- **Navigation components** with ARIA implementation
- **Custom widgets** with complex interactions

## Testing Utilities

### Core Testing Functions

#### `testComponentAccessibility(component, config, name)`

Runs comprehensive accessibility tests on a single component.

```typescript
const result = await testComponentAccessibility(
  <MyComponent />,
  {
    expectedFocusableElements: 3,
    expectAriaLabels: true,
    expectFormLabels: true,
    colorCombinations: [
      {
        foreground: '#000000',
        background: '#ffffff',
        element: 'Text content'
      }
    ]
  },
  'My Component'
);
```

#### `testMultipleComponents(components)`

Tests multiple components and generates a comprehensive report.

```typescript
const results = await testMultipleComponents([
  {
    component: <Button>Click me</Button>,
    name: 'Button Component',
    config: { expectedFocusableElements: 1 }
  },
  {
    component: <Form>...</Form>,
    name: 'Form Component',
    config: AccessibilityTestConfigs.form
  }
]);
```

### Pre-configured Test Configurations

The system includes pre-configured test settings for common component types:

```typescript
// Form components
AccessibilityTestConfigs.form

// Modal/Dialog components
AccessibilityTestConfigs.modal

// Navigation components
AccessibilityTestConfigs.navigation

// Data table components
AccessibilityTestConfigs.table

// Content editing components
AccessibilityTestConfigs.editor
```

## Writing Accessibility Tests

### Basic Component Test

```typescript
import { testComponentAccessibility } from '../test/accessibilityTestSuite';

describe('MyComponent Accessibility', () => {
  it('meets accessibility standards', async () => {
    const result = await testComponentAccessibility(
      <MyComponent />,
      {
        expectedFocusableElements: 2,
        expectAriaLabels: true
      },
      'MyComponent'
    );

    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

### Advanced Component Test with Custom Validation

```typescript
it('validates complex widget accessibility', async () => {
  const customTests = [
    // Custom ARIA validation
    (container: HTMLElement) => {
      const widget = container.querySelector('[role="tablist"]');
      expect(widget).toHaveAttribute('aria-label');
    },
    
    // Custom keyboard interaction
    (container: HTMLElement) => {
      const tabs = container.querySelectorAll('[role="tab"]');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    }
  ];

  const result = await testComponentAccessibility(
    <TabWidget />,
    {
      expectedFocusableElements: 3,
      expectArrowNavigation: true,
      customTests
    },
    'Tab Widget'
  );

  expect(result.passed).toBe(true);
});
```

### Color Contrast Testing

```typescript
import { validateTemplateColors } from '../utils/colorContrast';

it('validates color combinations', () => {
  const colors = [
    {
      foreground: '#000000',
      background: '#ffffff',
      element: 'Body text'
    },
    {
      foreground: '#ffffff',
      background: '#0066cc',
      element: 'Button'
    }
  ];

  const results = validateTemplateColors(colors);
  
  results.forEach(result => {
    expect(result.isValid).toBe(true);
    expect(result.meetsAA).toBe(true);
  });
});
```

## Accessibility Standards

### WCAG 2.2 AA Compliance

All components must meet WCAG 2.2 AA standards:

- **Perceivable**: Information must be presentable in ways users can perceive
- **Operable**: Interface components must be operable by all users
- **Understandable**: Information and UI operation must be understandable
- **Robust**: Content must be robust enough for various assistive technologies

### Color Contrast Requirements

- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **AAA standard**: 7:1 for normal text, 4.5:1 for large text

### Keyboard Navigation Requirements

- All interactive elements must be keyboard accessible
- Tab order must be logical and predictable
- Focus indicators must be clearly visible
- Keyboard shortcuts must not conflict with assistive technologies

### Screen Reader Requirements

- All content must have appropriate semantic markup
- Interactive elements must have accessible names
- Dynamic content changes must be announced
- Form controls must be properly labeled

## Continuous Integration

### Adding to CI/CD Pipeline

Add accessibility testing to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run Accessibility Tests
  run: npm run test:accessibility
  
- name: Upload Accessibility Report
  uses: actions/upload-artifact@v2
  with:
    name: accessibility-report
    path: accessibility-reports/
```

### Pre-commit Hooks

Add accessibility testing to pre-commit hooks:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:accessibility"
    }
  }
}
```

## Troubleshooting

### Common Issues

#### Axe Violations

```
Error: Expected no axe violations but received 1
```

**Solution**: Review the axe violation details and fix the accessibility issue. Common fixes include:
- Adding missing ARIA labels
- Fixing color contrast
- Correcting heading hierarchy
- Adding form labels

#### Keyboard Navigation Failures

```
Error: Expected 3 focusable elements but found 2
```

**Solution**: Ensure all interactive elements are properly focusable:
- Check `tabindex` attributes
- Verify elements aren't disabled
- Ensure proper semantic markup

#### Screen Reader Compatibility Issues

```
Error: Interactive element missing accessible name
```

**Solution**: Add proper accessible names:
- Use `aria-label` for custom elements
- Associate labels with form controls
- Provide text content for buttons

### Debugging Tips

1. **Use browser dev tools** to inspect ARIA attributes
2. **Test with actual screen readers** (NVDA, JAWS, VoiceOver)
3. **Use keyboard-only navigation** to test interactions
4. **Check color contrast** with browser extensions
5. **Review axe-core documentation** for specific rule details

## Resources

### Documentation

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)

### Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- [Color Contrast Analyzers](https://www.tpgi.com/color-contrast-checker/)
- [Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)

### Testing with Assistive Technologies

- **Windows**: NVDA (free), JAWS
- **macOS**: VoiceOver (built-in)
- **Linux**: Orca
- **Mobile**: TalkBack (Android), VoiceOver (iOS)

## Contributing

When adding new components or features:

1. **Write accessibility tests** alongside functional tests
2. **Use semantic HTML** elements when possible
3. **Follow ARIA patterns** for complex widgets
4. **Test with keyboard navigation** and screen readers
5. **Validate color contrast** for all color combinations
6. **Update this documentation** for new testing patterns

## Support

For questions about accessibility testing:

1. Review this documentation
2. Check existing test examples
3. Consult WCAG guidelines
4. Test with real assistive technologies
5. Ask for code review from accessibility-aware team members