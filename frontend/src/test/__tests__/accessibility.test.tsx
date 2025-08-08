import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { 
  testAccessibility, 
  testKeyboardNavigation, 
  testColorContrast,
  testScreenReaderCompatibility,
  testFocusManagement,
  testHeadingStructure,
  runAccessibilityTestSuite
} from '../accessibility';

describe('Accessibility Testing Utilities', () => {
  describe('testAccessibility', () => {
    it('passes for accessible component', async () => {
      const AccessibleComponent = () => (
        <div>
          <h1>Main Heading</h1>
          <button>Accessible Button</button>
          <label htmlFor="input1">Label</label>
          <input id="input1" type="text" />
        </div>
      );

      await expect(testAccessibility(<AccessibleComponent />)).resolves.not.toThrow();
    });

    it('fails for inaccessible component', async () => {
      const InaccessibleComponent = () => (
        <div>
          <button style={{ color: '#ccc', backgroundColor: '#ddd' }}>Low Contrast</button>
          <input type="text" /> {/* Missing label */}
        </div>
      );

      await expect(testAccessibility(<InaccessibleComponent />)).rejects.toThrow();
    });
  });

  describe('testKeyboardNavigation', () => {
    it('validates focusable elements count', async () => {
      const KeyboardComponent = () => (
        <div>
          <button>Button 1</button>
          <button>Button 2</button>
          <input type="text" />
        </div>
      );

      await expect(
        testKeyboardNavigation(<KeyboardComponent />, 3)
      ).resolves.not.toThrow();
    });

    it('fails when focusable elements count is wrong', async () => {
      const KeyboardComponent = () => (
        <div>
          <button>Button 1</button>
        </div>
      );

      await expect(
        testKeyboardNavigation(<KeyboardComponent />, 3)
      ).rejects.toThrow();
    });
  });

  describe('testColorContrast', () => {
    it('passes for good contrast', async () => {
      const GoodContrastComponent = () => (
        <div style={{ color: '#000', backgroundColor: '#fff' }}>
          Good contrast text
        </div>
      );

      await expect(testColorContrast(<GoodContrastComponent />)).resolves.not.toThrow();
    });
  });

  describe('testScreenReaderCompatibility', () => {
    it('validates screen reader features', () => {
      const { container } = render(
        <div>
          <h1>Main Heading</h1>
          <button aria-label="Close dialog">×</button>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" />
        </div>
      );

      expect(() => testScreenReaderCompatibility({ container })).not.toThrow();
    });

    it('fails for missing accessible names', () => {
      const { container } = render(
        <div>
          <button>×</button> {/* No accessible name */}
          <input type="text" /> {/* No label */}
        </div>
      );

      expect(() => testScreenReaderCompatibility({ container })).toThrow();
    });
  });

  describe('testFocusManagement', () => {
    it('validates focus indicators', () => {
      const { container } = render(
        <div>
          <button>Focusable Button</button>
          <input type="text" />
        </div>
      );

      expect(() => testFocusManagement({ container })).not.toThrow();
    });
  });

  describe('testHeadingStructure', () => {
    it('validates proper heading hierarchy', () => {
      const { container } = render(
        <div>
          <h1>Main Title</h1>
          <h2>Section</h2>
          <h3>Subsection</h3>
        </div>
      );

      expect(() => testHeadingStructure({ container })).not.toThrow();
    });

    it('fails for improper heading hierarchy', () => {
      const { container } = render(
        <div>
          <h1>Main Title</h1>
          <h3>Skipped h2</h3> {/* Skips h2 level */}
        </div>
      );

      expect(() => testHeadingStructure({ container })).toThrow();
    });
  });

  describe('runAccessibilityTestSuite', () => {
    it('runs comprehensive accessibility tests', async () => {
      const ComprehensiveComponent = () => (
        <div>
          <h1>Accessible Form</h1>
          <form>
            <fieldset>
              <legend>Personal Information</legend>
              <label htmlFor="name">Name</label>
              <input id="name" type="text" required />
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required />
            </fieldset>
            <button type="submit">Submit</button>
          </form>
        </div>
      );

      await expect(
        runAccessibilityTestSuite(<ComprehensiveComponent />, {
          expectedFocusableElements: 3,
          skipKeyboardTest: false,
          skipColorContrastTest: false
        })
      ).resolves.not.toThrow();
    });

    it('can skip specific tests', async () => {
      const ComponentWithColorIssues = () => (
        <div>
          <h1>Form with Color Issues</h1>
          <button style={{ color: '#ccc', backgroundColor: '#ddd' }}>
            Low Contrast Button
          </button>
        </div>
      );

      await expect(
        runAccessibilityTestSuite(<ComponentWithColorIssues />, {
          expectedFocusableElements: 1,
          skipColorContrastTest: true // Skip the failing test
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Real-world component examples', () => {
    it('tests a complex form component', async () => {
      const ComplexForm = () => (
        <form role="form" aria-labelledby="form-title">
          <h2 id="form-title">User Registration</h2>
          <div role="group" aria-labelledby="personal-info">
            <h3 id="personal-info">Personal Information</h3>
            <label htmlFor="firstName">First Name *</label>
            <input 
              id="firstName" 
              type="text" 
              required 
              aria-describedby="firstName-help"
            />
            <div id="firstName-help">Enter your legal first name</div>
            
            <label htmlFor="lastName">Last Name *</label>
            <input id="lastName" type="text" required />
          </div>
          
          <fieldset>
            <legend>Contact Preferences</legend>
            <label>
              <input type="radio" name="contact" value="email" />
              Email
            </label>
            <label>
              <input type="radio" name="contact" value="phone" />
              Phone
            </label>
          </fieldset>
          
          <div role="group" aria-labelledby="actions">
            <h3 id="actions" className="sr-only">Form Actions</h3>
            <button type="button">Cancel</button>
            <button type="submit">Register</button>
          </div>
        </form>
      );

      await runAccessibilityTestSuite(<ComplexForm />, {
        expectedFocusableElements: 6, // 4 inputs + 2 buttons
        skipColorContrastTest: false
      });
    });

    it('tests a data table component', async () => {
      const DataTable = () => (
        <div>
          <h2>User List</h2>
          <table role="table" aria-label="List of registered users">
            <caption>Registered users with their roles and status</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>John Doe</td>
                <td>john@example.com</td>
                <td>Admin</td>
                <td>Active</td>
                <td>
                  <button aria-label="Edit John Doe">Edit</button>
                  <button aria-label="Delete John Doe">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );

      await runAccessibilityTestSuite(<DataTable />, {
        expectedFocusableElements: 2, // 2 buttons
        skipColorContrastTest: false
      });
    });

    it('tests a navigation component', async () => {
      const Navigation = () => (
        <nav role="navigation" aria-label="Main navigation">
          <ul>
            <li><a href="/" aria-current="page">Home</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/services">Services</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
          <button 
            aria-expanded="false" 
            aria-controls="mobile-menu"
            aria-label="Toggle mobile menu"
          >
            Menu
          </button>
          <div id="mobile-menu" hidden>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </div>
        </nav>
      );

      await runAccessibilityTestSuite(<Navigation />, {
        expectedFocusableElements: 5, // 4 links + 1 button
        skipColorContrastTest: false
      });
    });
  });
});