import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  testBasicKeyboardNavigation,
  getFocusableElements,
  testTabNavigation,
  testArrowKeyNavigation,
  testEscapeKeyHandling,
  testEnterKeyActivation,
  testSpaceKeyActivation,
  testFocusTrap,
  testSkipLinks,
  runKeyboardNavigationTests
} from '../keyboardNavigation';

// Mock vi for testing
const vi = {
  fn: jest.fn
};

describe('Keyboard Navigation Testing Utilities', () => {
  describe('getFocusableElements', () => {
    it('finds all focusable elements', () => {
      const { container } = render(
        <div>
          <button>Button</button>
          <input type="text" />
          <select><option>Option</option></select>
          <textarea></textarea>
          <a href="/link">Link</a>
          <div tabIndex={0}>Focusable div</div>
          <button disabled>Disabled button</button>
          <div tabIndex={-1}>Non-focusable div</div>
        </div>
      );

      const focusableElements = getFocusableElements(container);
      
      expect(focusableElements).toHaveLength(6); // Excludes disabled and tabindex="-1"
      expect(focusableElements[0].tagName).toBe('BUTTON');
      expect(focusableElements[1].tagName).toBe('INPUT');
      expect(focusableElements[2].tagName).toBe('SELECT');
      expect(focusableElements[3].tagName).toBe('TEXTAREA');
      expect(focusableElements[4].tagName).toBe('A');
      expect(focusableElements[5].getAttribute('tabindex')).toBe('0');
    });

    it('returns empty array when no focusable elements exist', () => {
      const { container } = render(
        <div>
          <p>Just text</p>
          <div>Non-focusable div</div>
        </div>
      );

      const focusableElements = getFocusableElements(container);
      expect(focusableElements).toHaveLength(0);
    });
  });

  describe('testTabNavigation', () => {
    it('tests forward and backward tab navigation', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div>
          <button>First</button>
          <button>Second</button>
          <button>Third</button>
        </div>
      );

      const focusableElements = getFocusableElements(container);
      
      await expect(
        testTabNavigation(user, focusableElements)
      ).resolves.not.toThrow();
    });

    it('handles single focusable element', async () => {
      const user = userEvent.setup();
      const { container } = render(<button>Only Button</button>);

      const focusableElements = getFocusableElements(container);
      
      await expect(
        testTabNavigation(user, focusableElements)
      ).resolves.not.toThrow();
    });

    it('handles no focusable elements', async () => {
      const user = userEvent.setup();
      const focusableElements: HTMLElement[] = [];
      
      await expect(
        testTabNavigation(user, focusableElements)
      ).resolves.not.toThrow();
    });
  });

  describe('testArrowKeyNavigation', () => {
    it('tests arrow key navigation between elements', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div role="tablist">
          <button role="tab">Tab 1</button>
          <button role="tab">Tab 2</button>
          <button role="tab">Tab 3</button>
        </div>
      );

      const focusableElements = getFocusableElements(container);
      
      await expect(
        testArrowKeyNavigation(user, focusableElements)
      ).resolves.not.toThrow();
    });

    it('handles insufficient elements for arrow navigation', async () => {
      const user = userEvent.setup();
      const { container } = render(<button>Single Button</button>);

      const focusableElements = getFocusableElements(container);
      
      await expect(
        testArrowKeyNavigation(user, focusableElements)
      ).resolves.not.toThrow();
    });
  });

  describe('testEscapeKeyHandling', () => {
    it('tests escape key event handling', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div>
          <button>Test Button</button>
        </div>
      );

      await expect(
        testEscapeKeyHandling(user, container)
      ).resolves.not.toThrow();
    });
  });

  describe('testEnterKeyActivation', () => {
    it('tests enter key activation on buttons', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div>
          <button>Regular Button</button>
          <div role="button" tabIndex={0}>Custom Button</div>
          <input type="text" />
        </div>
      );

      const focusableElements = getFocusableElements(container);
      
      await expect(
        testEnterKeyActivation(user, focusableElements)
      ).resolves.not.toThrow();
    });
  });

  describe('testSpaceKeyActivation', () => {
    it('tests space key activation on buttons', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div>
          <button>Regular Button</button>
          <div role="button" tabIndex={0}>Custom Button</div>
          <input type="text" />
        </div>
      );

      const focusableElements = getFocusableElements(container);
      
      await expect(
        testSpaceKeyActivation(user, focusableElements)
      ).resolves.not.toThrow();
    });
  });

  describe('testFocusTrap', () => {
    it('tests focus trap functionality', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div role="dialog">
          <button>First Button</button>
          <input type="text" />
          <button>Last Button</button>
        </div>
      );

      await expect(
        testFocusTrap(user, container)
      ).resolves.not.toThrow();
    });

    it('handles insufficient elements for focus trap', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div role="dialog">
          <button>Only Button</button>
        </div>
      );

      await expect(
        testFocusTrap(user, container)
      ).resolves.not.toThrow();
    });
  });

  describe('testSkipLinks', () => {
    it('tests skip link functionality', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div>
          <a href="#main-content" data-skip-link>Skip to main content</a>
          <nav>Navigation</nav>
          <main id="main-content">Main content</main>
        </div>
      );

      await expect(
        testSkipLinks(user, container)
      ).resolves.not.toThrow();
    });

    it('handles skip links without targets', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div>
          <a href="#nonexistent" data-skip-link>Skip to nowhere</a>
        </div>
      );

      await expect(
        testSkipLinks(user, container)
      ).resolves.not.toThrow();
    });
  });

  describe('testBasicKeyboardNavigation', () => {
    it('runs basic keyboard navigation tests', async () => {
      const { container } = render(
        <div>
          <button>Button 1</button>
          <button>Button 2</button>
          <input type="text" />
        </div>
      );

      await expect(
        testBasicKeyboardNavigation(container, {
          expectFocusable: true,
          expectEnterActivation: true,
          expectSpaceActivation: true
        })
      ).resolves.not.toThrow();
    });

    it('handles components with no focusable elements', async () => {
      const { container } = render(
        <div>
          <p>Just text content</p>
          <div>No interactive elements</div>
        </div>
      );

      await expect(
        testBasicKeyboardNavigation(container, {
          expectFocusable: false
        })
      ).resolves.not.toThrow();
    });

    it('tests arrow navigation when expected', async () => {
      const { container } = render(
        <div role="tablist">
          <button role="tab">Tab 1</button>
          <button role="tab">Tab 2</button>
        </div>
      );

      await expect(
        testBasicKeyboardNavigation(container, {
          expectArrowNavigation: true
        })
      ).resolves.not.toThrow();
    });
  });

  describe('runKeyboardNavigationTests', () => {
    it('runs comprehensive keyboard navigation tests', async () => {
      const { container } = render(
        <div>
          <a href="#main" data-skip-link>Skip to main</a>
          <nav>
            <button>Nav Button</button>
          </nav>
          <main id="main">
            <button>Main Button</button>
            <input type="text" />
          </main>
        </div>
      );

      await expect(
        runKeyboardNavigationTests(container, {
          expectFocusable: true,
          expectEnterActivation: true,
          expectSpaceActivation: true
        })
      ).resolves.not.toThrow();
    });

    it('tests modal focus trap', async () => {
      const { container } = render(
        <div role="dialog" className="modal">
          <button>Close</button>
          <input type="text" />
          <button>Submit</button>
        </div>
      );

      await expect(
        runKeyboardNavigationTests(container)
      ).resolves.not.toThrow();
    });
  });

  describe('Real-world component examples', () => {
    it('tests form keyboard navigation', async () => {
      const { container } = render(
        <form>
          <label htmlFor="name">Name</label>
          <input id="name" type="text" />
          
          <fieldset>
            <legend>Options</legend>
            <label>
              <input type="radio" name="option" value="1" />
              Option 1
            </label>
            <label>
              <input type="radio" name="option" value="2" />
              Option 2
            </label>
          </fieldset>
          
          <button type="submit">Submit</button>
          <button type="button">Cancel</button>
        </form>
      );

      await runKeyboardNavigationTests(container, {
        expectFocusable: true,
        expectEnterActivation: true,
        expectSpaceActivation: true
      });
    });

    it('tests navigation menu keyboard support', async () => {
      const { container } = render(
        <nav role="navigation">
          <ul role="menubar">
            <li role="none">
              <a href="/" role="menuitem">Home</a>
            </li>
            <li role="none">
              <button role="menuitem" aria-expanded="false">
                Services
              </button>
            </li>
            <li role="none">
              <a href="/contact" role="menuitem">Contact</a>
            </li>
          </ul>
        </nav>
      );

      await runKeyboardNavigationTests(container, {
        expectArrowNavigation: true,
        expectEnterActivation: true,
        expectSpaceActivation: true
      });
    });

    it('tests data table keyboard navigation', async () => {
      const { container } = render(
        <table>
          <caption>User Data</caption>
          <thead>
            <tr>
              <th>
                <button>Name (sortable)</button>
              </th>
              <th>
                <button>Email (sortable)</button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John Doe</td>
              <td>john@example.com</td>
              <td>
                <button>Edit</button>
                <button>Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      );

      await runKeyboardNavigationTests(container, {
        expectFocusable: true,
        expectEnterActivation: true,
        expectSpaceActivation: true
      });
    });
  });
});