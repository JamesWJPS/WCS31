import React from 'react';
import { render } from '@testing-library/react';
import { 
  testComponentAccessibility, 
  testMultipleComponents,
  generateAccessibilityReport,
  AccessibilityTestConfigs
} from '../accessibilityTestSuite';

describe('Accessibility Integration Tests', () => {
  describe('Individual Component Testing', () => {
    it('tests a fully accessible form component', async () => {
      const AccessibleForm = () => (
        <form role="form" aria-labelledby="form-title">
          <h2 id="form-title">Contact Form</h2>
          <p>Please fill out all required fields.</p>
          
          <fieldset>
            <legend>Personal Information</legend>
            <div>
              <label htmlFor="firstName">First Name *</label>
              <input 
                id="firstName" 
                type="text" 
                required 
                aria-describedby="firstName-help"
              />
              <div id="firstName-help">Enter your legal first name</div>
            </div>
            
            <div>
              <label htmlFor="email">Email Address *</label>
              <input 
                id="email" 
                type="email" 
                required 
                aria-describedby="email-help"
              />
              <div id="email-help">We'll never share your email</div>
            </div>
          </fieldset>
          
          <fieldset>
            <legend>Contact Preferences</legend>
            <div role="radiogroup" aria-labelledby="contact-pref-label">
              <div id="contact-pref-label">How would you like to be contacted?</div>
              <label>
                <input type="radio" name="contact" value="email" />
                Email
              </label>
              <label>
                <input type="radio" name="contact" value="phone" />
                Phone
              </label>
            </div>
          </fieldset>
          
          <div>
            <button type="button">Cancel</button>
            <button type="submit">Submit Form</button>
          </div>
          
          <div role="status" aria-live="polite" id="form-status">
            {/* Status messages will appear here */}
          </div>
        </form>
      );

      const result = await testComponentAccessibility(
        <AccessibleForm />,
        {
          ...AccessibilityTestConfigs.form,
          expectedFocusableElements: 6, // 4 inputs + 2 buttons
          expectLiveRegions: true
        },
        'Contact Form'
      );

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.testResults.axe).toBe(true);
      expect(result.testResults.keyboard).toBe(true);
      expect(result.testResults.screenReader).toBe(true);
    });

    it('tests an accessible modal component', async () => {
      const AccessibleModal = () => (
        <div>
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
          >
            <div>
              <h2 id="modal-title">Confirm Action</h2>
              <p id="modal-description">
                Are you sure you want to delete this item? This action cannot be undone.
              </p>
              
              <div>
                <button type="button" aria-label="Cancel and close dialog">
                  Cancel
                </button>
                <button type="button" aria-label="Confirm deletion">
                  Delete
                </button>
              </div>
            </div>
          </div>
          <div aria-hidden="true" style={{ opacity: 0.5 }}>
            {/* Background content that should be hidden */}
            <p>Background content</p>
          </div>
        </div>
      );

      const result = await testComponentAccessibility(
        <AccessibleModal />,
        {
          ...AccessibilityTestConfigs.modal,
          expectedFocusableElements: 2
        },
        'Confirmation Modal'
      );

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('tests an accessible data table', async () => {
      const AccessibleTable = () => (
        <div>
          <h2>User Management</h2>
          <table aria-label="List of system users">
            <caption>
              System users with their roles and status. 
              Use the action buttons to edit or delete users.
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <button aria-label="Sort by name">Name</button>
                </th>
                <th scope="col">
                  <button aria-label="Sort by email">Email</button>
                </th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>John Doe</td>
                <td>john@example.com</td>
                <td>Administrator</td>
                <td>
                  <span aria-label="Active user">✓ Active</span>
                </td>
                <td>
                  <button aria-label="Edit John Doe">Edit</button>
                  <button aria-label="Delete John Doe">Delete</button>
                </td>
              </tr>
              <tr>
                <td>Jane Smith</td>
                <td>jane@example.com</td>
                <td>Editor</td>
                <td>
                  <span aria-label="Inactive user">✗ Inactive</span>
                </td>
                <td>
                  <button aria-label="Edit Jane Smith">Edit</button>
                  <button aria-label="Delete Jane Smith">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );

      const result = await testComponentAccessibility(
        <AccessibleTable />,
        {
          ...AccessibilityTestConfigs.table,
          expectedFocusableElements: 6 // 2 sort buttons + 4 action buttons
        },
        'User Management Table'
      );

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Multiple Component Testing', () => {
    it('tests multiple components and generates a report', async () => {
      const SimpleButton = () => (
        <button aria-label="Simple action button">Click me</button>
      );

      const SimpleForm = () => (
        <form>
          <label htmlFor="simple-input">Name</label>
          <input id="simple-input" type="text" />
          <button type="submit">Submit</button>
        </form>
      );

      const SimpleNavigation = () => (
        <nav aria-label="Main navigation">
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>
      );

      const components = [
        {
          component: <SimpleButton />,
          name: 'Simple Button',
          config: { expectedFocusableElements: 1 }
        },
        {
          component: <SimpleForm />,
          name: 'Simple Form',
          config: AccessibilityTestConfigs.form
        },
        {
          component: <SimpleNavigation />,
          name: 'Simple Navigation',
          config: AccessibilityTestConfigs.navigation
        }
      ];

      const testResults = await testMultipleComponents(components);

      expect(testResults.overallPassed).toBe(true);
      expect(testResults.summary.totalComponents).toBe(3);
      expect(testResults.summary.passedComponents).toBe(3);
      expect(testResults.summary.failedComponents).toBe(0);

      // Generate and verify report
      const report = generateAccessibilityReport(testResults.results);
      expect(report).toContain('# Accessibility Test Report');
      expect(report).toContain('✅ **All components passed accessibility tests!**');
      expect(report).toContain('Simple Button');
      expect(report).toContain('Simple Form');
      expect(report).toContain('Simple Navigation');
    });

    it('handles components with accessibility issues', async () => {
      const InaccessibleButton = () => (
        <button></button> // No accessible name
      );

      const InaccessibleForm = () => (
        <form>
          <input type="text" /> {/* No label */}
          <button type="submit">Submit</button>
        </form>
      );

      const components = [
        {
          component: <InaccessibleButton />,
          name: 'Inaccessible Button',
          config: { expectedFocusableElements: 1 }
        },
        {
          component: <InaccessibleForm />,
          name: 'Inaccessible Form',
          config: AccessibilityTestConfigs.form
        }
      ];

      const testResults = await testMultipleComponents(components);

      expect(testResults.overallPassed).toBe(false);
      expect(testResults.summary.totalComponents).toBe(2);
      expect(testResults.summary.passedComponents).toBe(0);
      expect(testResults.summary.failedComponents).toBe(2);
      expect(testResults.summary.totalErrors).toBeGreaterThan(0);

      // Generate and verify report
      const report = generateAccessibilityReport(testResults.results);
      expect(report).toContain('❌ **2 component(s) failed accessibility tests**');
      expect(report).toContain('❌ Inaccessible Button');
      expect(report).toContain('❌ Inaccessible Form');
    });
  });

  describe('Color Contrast Testing', () => {
    it('tests components with color contrast validation', async () => {
      const ColoredComponent = () => (
        <div>
          <h1 style={{ color: '#000000', backgroundColor: '#ffffff' }}>
            High Contrast Heading
          </h1>
          <p style={{ color: '#333333', backgroundColor: '#ffffff' }}>
            Good contrast paragraph text
          </p>
          <button 
            style={{ color: '#ffffff', backgroundColor: '#0066cc' }}
            aria-label="High contrast button"
          >
            Click me
          </button>
        </div>
      );

      const result = await testComponentAccessibility(
        <ColoredComponent />,
        {
          expectedFocusableElements: 1,
          colorCombinations: [
            {
              foreground: '#000000',
              background: '#ffffff',
              element: 'Heading'
            },
            {
              foreground: '#333333',
              background: '#ffffff',
              element: 'Paragraph'
            },
            {
              foreground: '#ffffff',
              background: '#0066cc',
              element: 'Button'
            }
          ]
        },
        'Colored Component'
      );

      expect(result.passed).toBe(true);
      expect(result.testResults.colorContrast).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects color contrast issues', async () => {
      const PoorContrastComponent = () => (
        <div>
          <p style={{ color: '#cccccc', backgroundColor: '#ffffff' }}>
            Poor contrast text
          </p>
          <button 
            style={{ color: '#ffff00', backgroundColor: '#ffffff' }}
            aria-label="Poor contrast button"
          >
            Click me
          </button>
        </div>
      );

      const result = await testComponentAccessibility(
        <PoorContrastComponent />,
        {
          expectedFocusableElements: 1,
          colorCombinations: [
            {
              foreground: '#cccccc',
              background: '#ffffff',
              element: 'Paragraph'
            },
            {
              foreground: '#ffff00',
              background: '#ffffff',
              element: 'Button'
            }
          ]
        },
        'Poor Contrast Component'
      );

      expect(result.passed).toBe(false);
      expect(result.testResults.colorContrast).toBe(false);
      expect(result.errors.some(error => 
        error.includes('Color contrast failures')
      )).toBe(true);
    });
  });

  describe('Custom Accessibility Tests', () => {
    it('runs custom accessibility tests', async () => {
      const CustomComponent = () => (
        <div>
          <div role="tablist" aria-label="Settings tabs">
            <button role="tab" aria-selected="true" aria-controls="panel1">
              General
            </button>
            <button role="tab" aria-selected="false" aria-controls="panel2">
              Advanced
            </button>
          </div>
          <div id="panel1" role="tabpanel" aria-labelledby="tab1">
            <h3>General Settings</h3>
            <p>General settings content</p>
          </div>
          <div id="panel2" role="tabpanel" aria-labelledby="tab2" hidden>
            <h3>Advanced Settings</h3>
            <p>Advanced settings content</p>
          </div>
        </div>
      );

      const customTests = [
        // Test that tabs have proper ARIA attributes
        (container: HTMLElement) => {
          const tabs = container.querySelectorAll('[role="tab"]');
          tabs.forEach(tab => {
            expect(tab.getAttribute('aria-selected')).toBeTruthy();
            expect(tab.getAttribute('aria-controls')).toBeTruthy();
          });
        },
        
        // Test that tabpanels are properly associated
        (container: HTMLElement) => {
          const panels = container.querySelectorAll('[role="tabpanel"]');
          panels.forEach(panel => {
            expect(panel.getAttribute('aria-labelledby')).toBeTruthy();
          });
        }
      ];

      const result = await testComponentAccessibility(
        <CustomComponent />,
        {
          expectedFocusableElements: 2,
          expectArrowNavigation: true,
          customTests
        },
        'Custom Tab Component'
      );

      expect(result.passed).toBe(true);
      expect(result.testResults.custom).toEqual([true, true]);
      expect(result.errors).toHaveLength(0);
    });
  });
});