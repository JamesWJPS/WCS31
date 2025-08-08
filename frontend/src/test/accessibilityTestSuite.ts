/**
 * Comprehensive accessibility test suite for the Web Communication CMS
 * This file provides utilities to run accessibility tests across the entire application
 */

import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { runAccessibilityTestSuite } from './accessibility';
import { runKeyboardNavigationTests } from './keyboardNavigation';
import { testScreenReaderCompatibility } from './screenReader';
import { validateTemplateColors, ColorCombination } from '../utils/colorContrast';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

export interface AccessibilityTestConfig {
  // Component testing options
  skipAxeTest?: boolean;
  skipKeyboardTest?: boolean;
  skipScreenReaderTest?: boolean;
  skipColorContrastTest?: boolean;
  
  // Keyboard navigation options
  expectedFocusableElements?: number;
  expectArrowNavigation?: boolean;
  expectEscapeHandling?: boolean;
  expectEnterActivation?: boolean;
  expectSpaceActivation?: boolean;
  
  // Screen reader options
  expectAriaLabels?: boolean;
  expectLandmarks?: boolean;
  expectHeadingStructure?: boolean;
  expectLiveRegions?: boolean;
  expectFormLabels?: boolean;
  
  // Color contrast options
  colorCombinations?: ColorCombination[];
  
  // Custom test functions
  customTests?: Array<(container: HTMLElement) => Promise<void> | void>;
}

export interface AccessibilityTestResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  componentName: string;
  testResults: {
    axe?: boolean;
    keyboard?: boolean;
    screenReader?: boolean;
    colorContrast?: boolean;
    custom?: boolean[];
  };
}

/**
 * Run comprehensive accessibility tests on a component
 */
export const testComponentAccessibility = async (
  component: ReactElement,
  config: AccessibilityTestConfig = {},
  componentName = 'Unknown Component'
): Promise<AccessibilityTestResult> => {
  const result: AccessibilityTestResult = {
    passed: true,
    errors: [],
    warnings: [],
    componentName,
    testResults: {}
  };

  const { container } = render(component);

  try {
    // Run axe accessibility tests
    if (!config.skipAxeTest) {
      try {
        const axeResults = await axe(container);
        expect(axeResults).toHaveNoViolations();
        result.testResults.axe = true;
      } catch (error) {
        result.passed = false;
        result.errors.push(`Axe accessibility violations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.testResults.axe = false;
      }
    }

    // Run keyboard navigation tests
    if (!config.skipKeyboardTest) {
      try {
        await runKeyboardNavigationTests(container, {
          expectFocusable: config.expectedFocusableElements !== undefined,
          expectArrowNavigation: config.expectArrowNavigation,
          expectEscapeHandling: config.expectEscapeHandling,
          expectEnterActivation: config.expectEnterActivation,
          expectSpaceActivation: config.expectSpaceActivation
        });
        result.testResults.keyboard = true;
      } catch (error) {
        result.passed = false;
        result.errors.push(`Keyboard navigation issues: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.testResults.keyboard = false;
      }
    }

    // Run screen reader compatibility tests
    if (!config.skipScreenReaderTest) {
      try {
        testScreenReaderCompatibility(container, {
          expectAriaLabels: config.expectAriaLabels,
          expectLandmarks: config.expectLandmarks,
          expectHeadingStructure: config.expectHeadingStructure,
          expectLiveRegions: config.expectLiveRegions,
          expectFormLabels: config.expectFormLabels
        });
        result.testResults.screenReader = true;
      } catch (error) {
        result.passed = false;
        result.errors.push(`Screen reader compatibility issues: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.testResults.screenReader = false;
      }
    }

    // Run color contrast tests
    if (!config.skipColorContrastTest && config.colorCombinations) {
      try {
        const colorResults = validateTemplateColors(config.colorCombinations);
        const failedColors = colorResults.filter(r => !r.isValid);
        
        if (failedColors.length > 0) {
          result.passed = false;
          result.errors.push(`Color contrast failures: ${failedColors.map(f => f.element).join(', ')}`);
          result.testResults.colorContrast = false;
        } else {
          result.testResults.colorContrast = true;
        }

        // Add warnings for colors that meet AA but not AAA
        const aaOnlyColors = colorResults.filter(r => r.meetsAA && !r.meetsAAA);
        if (aaOnlyColors.length > 0) {
          result.warnings.push(`Colors meet WCAG AA but not AAA: ${aaOnlyColors.map(c => c.element).join(', ')}`);
        }
      } catch (error) {
        result.passed = false;
        result.errors.push(`Color contrast test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.testResults.colorContrast = false;
      }
    }

    // Run custom tests
    if (config.customTests && config.customTests.length > 0) {
      result.testResults.custom = [];
      
      for (let i = 0; i < config.customTests.length; i++) {
        try {
          await config.customTests[i](container);
          result.testResults.custom[i] = true;
        } catch (error) {
          result.passed = false;
          result.errors.push(`Custom test ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.testResults.custom[i] = false;
        }
      }
    }

  } catch (error) {
    result.passed = false;
    result.errors.push(`Unexpected error during accessibility testing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
};

/**
 * Test multiple components and generate a comprehensive report
 */
export const testMultipleComponents = async (
  components: Array<{
    component: ReactElement;
    name: string;
    config?: AccessibilityTestConfig;
  }>
): Promise<{
  overallPassed: boolean;
  results: AccessibilityTestResult[];
  summary: {
    totalComponents: number;
    passedComponents: number;
    failedComponents: number;
    totalErrors: number;
    totalWarnings: number;
  };
}> => {
  const results: AccessibilityTestResult[] = [];

  for (const { component, name, config } of components) {
    const result = await testComponentAccessibility(component, config, name);
    results.push(result);
  }

  const summary = {
    totalComponents: results.length,
    passedComponents: results.filter(r => r.passed).length,
    failedComponents: results.filter(r => !r.passed).length,
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0)
  };

  return {
    overallPassed: summary.failedComponents === 0,
    results,
    summary
  };
};

/**
 * Generate a detailed accessibility report
 */
export const generateAccessibilityReport = (
  results: AccessibilityTestResult[]
): string => {
  const report = ['# Accessibility Test Report', ''];

  // Summary
  const totalComponents = results.length;
  const passedComponents = results.filter(r => r.passed).length;
  const failedComponents = totalComponents - passedComponents;
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  report.push('## Summary');
  report.push(`- Total Components Tested: ${totalComponents}`);
  report.push(`- Passed: ${passedComponents}`);
  report.push(`- Failed: ${failedComponents}`);
  report.push(`- Total Errors: ${totalErrors}`);
  report.push(`- Total Warnings: ${totalWarnings}`);
  report.push('');

  // Overall status
  if (failedComponents === 0) {
    report.push('✅ **All components passed accessibility tests!**');
  } else {
    report.push(`❌ **${failedComponents} component(s) failed accessibility tests**`);
  }
  report.push('');

  // Detailed results
  report.push('## Detailed Results');
  report.push('');

  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    report.push(`### ${index + 1}. ${status} ${result.componentName}`);
    
    // Test results breakdown
    const testTypes = Object.entries(result.testResults);
    if (testTypes.length > 0) {
      report.push('**Test Results:**');
      testTypes.forEach(([testType, passed]) => {
        if (Array.isArray(passed)) {
          // Custom tests
          passed.forEach((p, i) => {
            const customStatus = p ? '✅' : '❌';
            report.push(`- ${customStatus} Custom Test ${i + 1}`);
          });
        } else if (passed !== undefined) {
          const testStatus = passed ? '✅' : '❌';
          const testName = testType.charAt(0).toUpperCase() + testType.slice(1);
          report.push(`- ${testStatus} ${testName}`);
        }
      });
      report.push('');
    }

    // Errors
    if (result.errors.length > 0) {
      report.push('**Errors:**');
      result.errors.forEach(error => {
        report.push(`- ❌ ${error}`);
      });
      report.push('');
    }

    // Warnings
    if (result.warnings.length > 0) {
      report.push('**Warnings:**');
      result.warnings.forEach(warning => {
        report.push(`- ⚠️ ${warning}`);
      });
      report.push('');
    }

    report.push('---');
    report.push('');
  });

  return report.join('\n');
};

/**
 * Common accessibility test configurations for different component types
 */
export const AccessibilityTestConfigs = {
  // Form components
  form: {
    expectFormLabels: true,
    expectHeadingStructure: true,
    expectEnterActivation: true,
    expectSpaceActivation: true
  } as AccessibilityTestConfig,

  // Modal/Dialog components
  modal: {
    expectAriaLabels: true,
    expectEscapeHandling: true,
    expectEnterActivation: true,
    expectSpaceActivation: true,
    customTests: [
      (container: HTMLElement) => {
        // Check for modal role and aria-modal
        const dialog = container.querySelector('[role="dialog"]');
        if (!dialog) {
          throw new Error('Modal must have role="dialog"');
        }
        if (dialog.getAttribute('aria-modal') !== 'true') {
          throw new Error('Modal must have aria-modal="true"');
        }
      }
    ]
  } as AccessibilityTestConfig,

  // Navigation components
  navigation: {
    expectLandmarks: true,
    expectArrowNavigation: true,
    expectEnterActivation: true,
    expectSpaceActivation: true
  } as AccessibilityTestConfig,

  // Data table components
  table: {
    expectHeadingStructure: true,
    customTests: [
      (container: HTMLElement) => {
        // Check for table caption or aria-label
        const table = container.querySelector('table');
        if (table) {
          const hasCaption = table.querySelector('caption');
          const hasAriaLabel = table.getAttribute('aria-label');
          const hasAriaLabelledBy = table.getAttribute('aria-labelledby');
          
          if (!hasCaption && !hasAriaLabel && !hasAriaLabelledBy) {
            throw new Error('Table must have a caption, aria-label, or aria-labelledby');
          }
        }
      }
    ]
  } as AccessibilityTestConfig,

  // Content editing components
  editor: {
    expectAriaLabels: true,
    expectFormLabels: true,
    expectLiveRegions: true,
    expectEnterActivation: true,
    expectSpaceActivation: true
  } as AccessibilityTestConfig
};