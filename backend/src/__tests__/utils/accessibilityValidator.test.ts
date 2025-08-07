import { AccessibilityValidator, validateAccessibility } from '../../utils/accessibilityValidator';

describe('AccessibilityValidator', () => {
  describe('validate', () => {
    it('should validate compliant HTML successfully', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <header role="banner">
            <nav role="navigation">
              <a href="#main-content" class="skip-link">Skip to main content</a>
            </nav>
          </header>
          <main id="main-content" role="main">
            <h1>Main Heading</h1>
            <p>Content goes here</p>
            <img src="test.jpg" alt="Test image" />
            <a href="https://example.com">Descriptive link text</a>
          </main>
          <footer role="contentinfo">
            <p>Footer content</p>
          </footer>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      expect(result.isCompliant).toBe(true);
      expect(result.score).toBeGreaterThan(80);
      expect(result.issues.filter(issue => issue.level === 'error')).toHaveLength(0);
    });

    it('should detect missing alt text on images', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <main>
            <h1>Test</h1>
            <img src="test.jpg" />
          </main>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      expect(result.isCompliant).toBe(false);
      const imageErrors = result.issues.filter(issue => 
        issue.rule === 'WCAG_1.1.1' && issue.message.includes('missing alt attribute')
      );
      expect(imageErrors).toHaveLength(1);
    });

    it('should detect missing page title', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head></head>
        <body>
          <main>
            <h1>Test</h1>
          </main>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      expect(result.isCompliant).toBe(false);
      const titleErrors = result.issues.filter(issue => 
        issue.rule === 'WCAG_2.4.2' && issue.message.includes('missing title element')
      );
      expect(titleErrors).toHaveLength(1);
    });

    it('should detect missing language declaration', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title></head>
        <body>
          <main>
            <h1>Test</h1>
          </main>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      expect(result.isCompliant).toBe(false);
      const langErrors = result.issues.filter(issue => 
        issue.rule === 'WCAG_3.1.1' && issue.message.includes('missing language declaration')
      );
      expect(langErrors).toHaveLength(1);
    });

    it('should detect heading hierarchy issues', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <main>
            <h1>Main Heading</h1>
            <h3>Skipped h2</h3>
          </main>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      expect(result.isCompliant).toBe(false);
      const headingErrors = result.issues.filter(issue => 
        issue.rule === 'WCAG_1.3.1' && issue.message.includes('Heading level skipped')
      );
      expect(headingErrors).toHaveLength(1);
    });

    it('should detect multiple h1 headings', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <main>
            <h1>First Heading</h1>
            <h1>Second Heading</h1>
          </main>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      const h1Warnings = result.issues.filter(issue => 
        issue.rule === 'WCAG_2.4.6' && issue.message.includes('multiple h1 headings')
      );
      expect(h1Warnings).toHaveLength(1);
    });

    it('should detect empty headings', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <main>
            <h1></h1>
          </main>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      expect(result.isCompliant).toBe(false);
      const emptyHeadingErrors = result.issues.filter(issue => 
        issue.rule === 'WCAG_2.4.6' && issue.message.includes('Empty heading found')
      );
      expect(emptyHeadingErrors).toHaveLength(1);
    });

    it('should detect links without accessible text', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <main>
            <h1>Test</h1>
            <a href="https://example.com"></a>
          </main>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      expect(result.isCompliant).toBe(false);
      const linkErrors = result.issues.filter(issue => 
        issue.rule === 'WCAG_2.4.4' && issue.message.includes('no accessible text')
      );
      expect(linkErrors).toHaveLength(1);
    });

    it('should detect generic link text', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <main>
            <h1>Test</h1>
            <a href="https://example.com">click here</a>
          </main>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      const linkWarnings = result.issues.filter(issue => 
        issue.rule === 'WCAG_2.4.4' && issue.message.includes('not descriptive')
      );
      expect(linkWarnings).toHaveLength(1);
    });

    it('should detect external links missing rel="noopener"', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <main>
            <h1>Test</h1>
            <a href="https://example.com" target="_blank">External link</a>
          </main>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      const securityWarnings = result.issues.filter(issue => 
        issue.rule === 'SECURITY' && issue.message.includes('rel="noopener"')
      );
      expect(securityWarnings).toHaveLength(1);
    });

    it('should detect form controls without labels', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <main>
            <h1>Test</h1>
            <form>
              <input type="text" name="test" />
            </form>
          </main>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      expect(result.isCompliant).toBe(false);
      const formErrors = result.issues.filter(issue => 
        issue.rule === 'WCAG_1.3.1' && issue.message.includes('missing accessible label')
      );
      expect(formErrors).toHaveLength(1);
    });

    it('should detect missing main landmark', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <div>
            <h1>Test</h1>
          </div>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      expect(result.isCompliant).toBe(false);
      const landmarkErrors = result.issues.filter(issue => 
        issue.rule === 'WCAG_1.3.1' && issue.message.includes('missing main landmark')
      );
      expect(landmarkErrors).toHaveLength(1);
    });

    it('should detect multiple main landmarks', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <main>
            <h1>First Main</h1>
          </main>
          <main>
            <h1>Second Main</h1>
          </main>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      expect(result.isCompliant).toBe(false);
      const landmarkErrors = result.issues.filter(issue => 
        issue.rule === 'WCAG_1.3.1' && issue.message.includes('multiple main landmarks')
      );
      expect(landmarkErrors).toHaveLength(1);
    });

    it('should detect positive tabindex values', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <main>
            <h1>Test</h1>
            <button tabindex="1">Button</button>
          </main>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      const tabindexWarnings = result.issues.filter(issue => 
        issue.rule === 'WCAG_2.4.3' && issue.message.includes('Positive tabindex')
      );
      expect(tabindexWarnings).toHaveLength(1);
    });

    it('should handle malformed HTML gracefully', () => {
      const html = '<html><body><div><p>Unclosed tags';

      const result = AccessibilityValidator.validate(html);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.issues).toBeDefined();
    });

    it('should calculate score correctly', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head></head>
        <body>
          <div>
            <img src="test.jpg" />
            <a href="test"></a>
          </div>
        </body>
        </html>
      `;

      const result = AccessibilityValidator.validate(html);

      // Should have multiple errors, resulting in lower score
      expect(result.score).toBeLessThan(50);
      expect(result.isCompliant).toBe(false);
    });
  });

  describe('validateAccessibility', () => {
    it('should be a convenience function that calls AccessibilityValidator.validate', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <main>
            <h1>Test</h1>
          </main>
        </body>
        </html>
      `;

      const result = validateAccessibility(html);

      expect(result.isCompliant).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.score).toBeDefined();
    });
  });
});