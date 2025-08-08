import React from 'react';
import { render } from '@testing-library/react';
import {
  testScreenReaderCompatibility,
  testAriaLabelsAndDescriptions,
  testLandmarkRoles,
  testHeadingStructure,
  testLiveRegions,
  testFormLabels,
  testInteractiveElementAccessibility,
  testImageAccessibility,
  testTableAccessibility,
  getAccessibleName,
  getImplicitRole,
  getInputRole
} from '../screenReader';

describe('Screen Reader Testing Utilities', () => {
  describe('testAriaLabelsAndDescriptions', () => {
    it('validates aria-labelledby references', () => {
      const { container } = render(
        <div>
          <h2 id="section-title">Settings</h2>
          <div aria-labelledby="section-title">
            Settings content
          </div>
        </div>
      );

      expect(() => testAriaLabelsAndDescriptions(container)).not.toThrow();
    });

    it('validates aria-describedby references', () => {
      const { container } = render(
        <div>
          <input aria-describedby="help-text" />
          <div id="help-text">Enter your name</div>
        </div>
      );

      expect(() => testAriaLabelsAndDescriptions(container)).not.toThrow();
    });

    it('fails when referenced elements do not exist', () => {
      const { container } = render(
        <div>
          <input aria-labelledby="nonexistent-label" />
        </div>
      );

      expect(() => testAriaLabelsAndDescriptions(container)).toThrow();
    });
  });

  describe('testLandmarkRoles', () => {
    it('validates landmark elements', () => {
      const { container } = render(
        <div>
          <header>Site header</header>
          <nav aria-label="Main navigation">Navigation</nav>
          <main>Main content</main>
          <aside aria-label="Sidebar">Sidebar</aside>
          <footer>Site footer</footer>
        </div>
      );

      expect(() => testLandmarkRoles(container)).not.toThrow();
    });

    it('requires labels for multiple landmarks of same type', () => {
      const { container } = render(
        <div>
          <nav aria-label="Main navigation">Main nav</nav>
          <nav aria-label="Footer navigation">Footer nav</nav>
        </div>
      );

      expect(() => testLandmarkRoles(container)).not.toThrow();
    });

    it('fails when multiple landmarks lack distinguishing labels', () => {
      const { container } = render(
        <div>
          <nav>First nav</nav>
          <nav>Second nav</nav> {/* Missing aria-label */}
        </div>
      );

      expect(() => testLandmarkRoles(container)).toThrow();
    });
  });

  describe('testHeadingStructure', () => {
    it('validates proper heading hierarchy', () => {
      const { container } = render(
        <div>
          <h1>Main Title</h1>
          <h2>Section</h2>
          <h3>Subsection</h3>
          <h2>Another Section</h2>
        </div>
      );

      expect(() => testHeadingStructure(container)).not.toThrow();
    });

    it('validates ARIA headings', () => {
      const { container } = render(
        <div>
          <div role="heading" aria-level="1">Custom H1</div>
          <div role="heading" aria-level="2">Custom H2</div>
        </div>
      );

      expect(() => testHeadingStructure(container)).not.toThrow();
    });

    it('fails for skipped heading levels', () => {
      const { container } = render(
        <div>
          <h1>Main Title</h1>
          <h3>Skipped H2</h3> {/* Skips h2 level */}
        </div>
      );

      expect(() => testHeadingStructure(container)).toThrow();
    });

    it('fails for headings without text content', () => {
      const { container } = render(
        <div>
          <h1></h1> {/* Empty heading */}
        </div>
      );

      expect(() => testHeadingStructure(container)).toThrow();
    });

    it('requires at least one h1 when headings exist', () => {
      const { container } = render(
        <div>
          <h2>Section without H1</h2>
        </div>
      );

      expect(() => testHeadingStructure(container)).toThrow();
    });
  });

  describe('testLiveRegions', () => {
    it('validates aria-live attributes', () => {
      const { container } = render(
        <div>
          <div aria-live="polite">Status updates</div>
          <div aria-live="assertive">Error messages</div>
          <div aria-live="off">No announcements</div>
        </div>
      );

      expect(() => testLiveRegions(container)).not.toThrow();
    });

    it('validates status and alert roles', () => {
      const { container } = render(
        <div>
          <div role="status">Loading...</div>
          <div role="alert">Error occurred!</div>
        </div>
      );

      expect(() => testLiveRegions(container)).not.toThrow();
    });

    it('validates aria-atomic attribute', () => {
      const { container } = render(
        <div>
          <div aria-live="polite" aria-atomic="true">
            Complete message
          </div>
          <div aria-live="polite" aria-atomic="false">
            Partial updates
          </div>
        </div>
      );

      expect(() => testLiveRegions(container)).not.toThrow();
    });

    it('fails for invalid aria-live values', () => {
      const { container } = render(
        <div>
          <div aria-live="invalid">Bad value</div>
        </div>
      );

      expect(() => testLiveRegions(container)).toThrow();
    });
  });

  describe('testFormLabels', () => {
    it('validates form controls with labels', () => {
      const { container } = render(
        <form>
          <label htmlFor="name">Name</label>
          <input id="name" type="text" />
          
          <label htmlFor="email">Email</label>
          <input id="email" type="email" />
          
          <label htmlFor="message">Message</label>
          <textarea id="message"></textarea>
          
          <label htmlFor="country">Country</label>
          <select id="country">
            <option>USA</option>
          </select>
        </form>
      );

      expect(() => testFormLabels(container)).not.toThrow();
    });

    it('validates form controls with aria-label', () => {
      const { container } = render(
        <form>
          <input type="text" aria-label="Search query" />
          <textarea aria-label="Comments"></textarea>
        </form>
      );

      expect(() => testFormLabels(container)).not.toThrow();
    });

    it('validates form controls with aria-labelledby', () => {
      const { container } = render(
        <form>
          <h3 id="contact-info">Contact Information</h3>
          <input type="text" aria-labelledby="contact-info" />
        </form>
      );

      expect(() => testFormLabels(container)).not.toThrow();
    });

    it('accepts placeholder as fallback label', () => {
      const { container } = render(
        <form>
          <input type="text" placeholder="Enter your name" />
        </form>
      );

      expect(() => testFormLabels(container)).not.toThrow();
    });

    it('validates fieldsets with legends', () => {
      const { container } = render(
        <form>
          <fieldset>
            <legend>Personal Information</legend>
            <input type="text" placeholder="Name" />
          </fieldset>
        </form>
      );

      expect(() => testFormLabels(container)).not.toThrow();
    });

    it('fails for form controls without labels', () => {
      const { container } = render(
        <form>
          <input type="text" /> {/* No label */}
        </form>
      );

      expect(() => testFormLabels(container)).toThrow();
    });

    it('fails for fieldsets without legends', () => {
      const { container } = render(
        <form>
          <fieldset>
            <input type="text" placeholder="Name" />
          </fieldset>
        </form>
      );

      expect(() => testFormLabels(container)).toThrow();
    });
  });

  describe('testInteractiveElementAccessibility', () => {
    it('validates interactive elements with accessible names', () => {
      const { container } = render(
        <div>
          <button>Click me</button>
          <a href="/link">Link text</a>
          <input type="text" aria-label="Search" />
          <div role="button" aria-label="Custom button" tabIndex={0}>
            Custom
          </div>
        </div>
      );

      expect(() => testInteractiveElementAccessibility(container)).not.toThrow();
    });

    it('fails for interactive elements without accessible names', () => {
      const { container } = render(
        <div>
          <button></button> {/* No accessible name */}
        </div>
      );

      expect(() => testInteractiveElementAccessibility(container)).toThrow();
    });
  });

  describe('testImageAccessibility', () => {
    it('validates informative images with alt text', () => {
      const { container } = render(
        <div>
          <img src="photo.jpg" alt="Team photo" />
          <img src="chart.png" aria-label="Sales chart" />
        </div>
      );

      expect(() => testImageAccessibility(container)).not.toThrow();
    });

    it('validates decorative images', () => {
      const { container } = render(
        <div>
          <img src="decoration.png" role="presentation" />
          <img src="spacer.gif" alt="" />
        </div>
      );

      expect(() => testImageAccessibility(container)).not.toThrow();
    });

    it('fails for informative images without alt text', () => {
      const { container } = render(
        <div>
          <img src="important.jpg" /> {/* Missing alt */}
        </div>
      );

      expect(() => testImageAccessibility(container)).toThrow();
    });
  });

  describe('testTableAccessibility', () => {
    it('validates accessible tables', () => {
      const { container } = render(
        <table>
          <caption>User Data</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John</td>
              <td>john@example.com</td>
            </tr>
          </tbody>
        </table>
      );

      expect(() => testTableAccessibility(container)).not.toThrow();
    });

    it('validates tables with aria-label', () => {
      const { container } = render(
        <table aria-label="Employee roster">
          <thead>
            <tr>
              <th>Name</th>
              <th>Department</th>
            </tr>
          </thead>
        </table>
      );

      expect(() => testTableAccessibility(container)).not.toThrow();
    });

    it('fails for tables without accessible names', () => {
      const { container } = render(
        <table>
          <thead>
            <tr>
              <th>Column 1</th>
            </tr>
          </thead>
        </table>
      );

      expect(() => testTableAccessibility(container)).toThrow();
    });
  });

  describe('getAccessibleName', () => {
    it('returns aria-label when present', () => {
      const element = document.createElement('button');
      element.setAttribute('aria-label', 'Close dialog');
      expect(getAccessibleName(element)).toBe('Close dialog');
    });

    it('returns aria-labelledby content', () => {
      document.body.innerHTML = `
        <div id="label1">First</div>
        <div id="label2">Second</div>
        <button aria-labelledby="label1 label2">Button</button>
      `;
      
      const button = document.querySelector('button') as HTMLElement;
      expect(getAccessibleName(button)).toBe('First Second');
    });

    it('returns associated label text', () => {
      document.body.innerHTML = `
        <label for="input1">Input Label</label>
        <input id="input1" type="text">
      `;
      
      const input = document.querySelector('input') as HTMLElement;
      expect(getAccessibleName(input)).toBe('Input Label');
    });

    it('returns text content', () => {
      const button = document.createElement('button');
      button.textContent = 'Button Text';
      expect(getAccessibleName(button)).toBe('Button Text');
    });

    it('returns placeholder', () => {
      const input = document.createElement('input');
      input.setAttribute('placeholder', 'Enter text');
      expect(getAccessibleName(input)).toBe('Enter text');
    });

    it('returns title attribute', () => {
      const element = document.createElement('div');
      element.setAttribute('title', 'Tooltip text');
      expect(getAccessibleName(element)).toBe('Tooltip text');
    });

    it('returns empty string when no accessible name found', () => {
      const div = document.createElement('div');
      expect(getAccessibleName(div)).toBe('');
    });
  });

  describe('getImplicitRole', () => {
    it('returns correct roles for semantic elements', () => {
      expect(getImplicitRole(document.createElement('button'))).toBe('button');
      expect(getImplicitRole(document.createElement('nav'))).toBe('navigation');
      expect(getImplicitRole(document.createElement('main'))).toBe('main');
      expect(getImplicitRole(document.createElement('header'))).toBe('banner');
      expect(getImplicitRole(document.createElement('footer'))).toBe('contentinfo');
    });

    it('returns correct role for links', () => {
      const link = document.createElement('a');
      link.setAttribute('href', '/path');
      expect(getImplicitRole(link)).toBe('link');
      
      const linkWithoutHref = document.createElement('a');
      expect(getImplicitRole(linkWithoutHref)).toBe('');
    });

    it('returns empty string for elements without implicit roles', () => {
      expect(getImplicitRole(document.createElement('div'))).toBe('');
      expect(getImplicitRole(document.createElement('span'))).toBe('');
    });
  });

  describe('getInputRole', () => {
    it('returns correct roles for input types', () => {
      const createInput = (type: string) => {
        const input = document.createElement('input') as HTMLInputElement;
        input.type = type;
        return input;
      };

      expect(getInputRole(createInput('button'))).toBe('button');
      expect(getInputRole(createInput('checkbox'))).toBe('checkbox');
      expect(getInputRole(createInput('radio'))).toBe('radio');
      expect(getInputRole(createInput('range'))).toBe('slider');
      expect(getInputRole(createInput('text'))).toBe('textbox');
      expect(getInputRole(createInput('email'))).toBe('textbox');
      expect(getInputRole(createInput('search'))).toBe('searchbox');
    });

    it('returns textbox for unknown input types', () => {
      const input = document.createElement('input') as HTMLInputElement;
      input.type = 'unknown-type';
      expect(getInputRole(input)).toBe('textbox');
    });
  });

  describe('testScreenReaderCompatibility', () => {
    it('runs comprehensive screen reader tests', () => {
      const { container } = render(
        <div>
          <header>
            <h1>Site Title</h1>
            <nav aria-label="Main navigation">
              <a href="/">Home</a>
              <a href="/about">About</a>
            </nav>
          </header>
          
          <main>
            <h2>Page Content</h2>
            <form>
              <fieldset>
                <legend>Contact Form</legend>
                <label htmlFor="name">Name</label>
                <input id="name" type="text" required />
                <label htmlFor="email">Email</label>
                <input id="email" type="email" required />
              </fieldset>
              <button type="submit">Submit</button>
            </form>
            
            <div role="status" aria-live="polite">
              Form status updates
            </div>
          </main>
          
          <aside aria-label="Related links">
            <h3>Related</h3>
            <ul>
              <li><a href="/related1">Related 1</a></li>
            </ul>
          </aside>
        </div>
      );

      expect(() => testScreenReaderCompatibility(container, {
        expectAriaLabels: true,
        expectLandmarks: true,
        expectHeadingStructure: true,
        expectLiveRegions: true,
        expectFormLabels: true
      })).not.toThrow();
    });
  });
});