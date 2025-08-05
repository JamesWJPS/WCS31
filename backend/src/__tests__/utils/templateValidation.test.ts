/**
 * Tests for template validation utilities
 */

import {
  validateTemplateAccessibility,
  validateTemplateFields,
  validateTemplate,
} from '../../utils/templateValidation';
import { Template, TemplateField } from '../../models/interfaces';

describe('Template Validation', () => {
  describe('validateTemplateAccessibility', () => {
    const createTestTemplate = (htmlStructure: string, cssStyles: string = ''): Template => ({
      id: 'test-template',
      name: 'Test Template',
      description: 'Test template for validation',
      htmlStructure,
      cssStyles,
      accessibilityFeatures: {
        skipLinks: true,
        headingStructure: true,
        altTextRequired: true,
        colorContrastCompliant: true,
      },
      contentFields: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('should pass validation for a properly structured template', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <div class="skip-links">
            <a href="#main-content" class="skip-link">Skip to main content</a>
          </div>
          <header role="banner">
            <h1>Main Title</h1>
          </header>
          <main role="main" id="main-content">
            <h2>Section Title</h2>
            <p>Content goes here</p>
            <img src="test.jpg" alt="Test image" />
          </main>
        </body>
        </html>
      `);

      const result = validateTemplateAccessibility(template);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.wcagViolations).toHaveLength(0);
    });

    it('should detect missing skip links', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <main id="main-content">
            <h1>Title</h1>
          </main>
        </body>
        </html>
      `);

      const result = validateTemplateAccessibility(template);
      expect(result.isValid).toBe(false);
      expect(result.wcagViolations).toContainEqual(
        expect.objectContaining({
          rule: 'WCAG 2.4.1',
          level: 'A',
          description: 'Template should include skip links for keyboard navigation',
        })
      );
    });

    it('should detect improper heading structure', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <h3>This should be h1</h3>
          <h1>This comes after h3</h1>
        </body>
        </html>
      `);

      const result = validateTemplateAccessibility(template);
      expect(result.isValid).toBe(false);
      expect(result.wcagViolations).toContainEqual(
        expect.objectContaining({
          rule: 'WCAG 2.4.6',
          level: 'AA',
          description: 'Page should start with h1 heading',
        })
      );
    });

    it('should detect missing alt text on images', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <h1>Title</h1>
          <img src="test.jpg" />
        </body>
        </html>
      `);

      const result = validateTemplateAccessibility(template);
      expect(result.isValid).toBe(false);
      expect(result.wcagViolations).toContainEqual(
        expect.objectContaining({
          rule: 'WCAG 1.1.1',
          level: 'A',
          description: 'All images must have alt attributes',
        })
      );
    });

    it('should detect missing form labels', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <h1>Title</h1>
          <form>
            <input type="text" name="username" />
            <input type="email" name="email" />
          </form>
        </body>
        </html>
      `);

      const result = validateTemplateAccessibility(template);
      expect(result.isValid).toBe(false);
      expect(result.wcagViolations).toContainEqual(
        expect.objectContaining({
          rule: 'WCAG 3.3.2',
          level: 'A',
          description: 'Form inputs must have labels or aria-label attributes',
        })
      );
    });

    it('should detect improper list structure', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <h1>Title</h1>
          <ul>
            <li>Item 1</li>
            <div>This should not be here</div>
            <li>Item 2</li>
          </ul>
        </body>
        </html>
      `);

      const result = validateTemplateAccessibility(template);
      expect(result.isValid).toBe(false);
      expect(result.wcagViolations).toContainEqual(
        expect.objectContaining({
          rule: 'WCAG 1.3.1',
          level: 'A',
          description: 'Lists should only contain li elements as direct children',
        })
      );
    });

    it('should detect missing main landmark', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <h1>Title</h1>
          <div>Content without main element</div>
        </body>
        </html>
      `);

      const result = validateTemplateAccessibility(template);
      expect(result.isValid).toBe(false);
      expect(result.wcagViolations).toContainEqual(
        expect.objectContaining({
          rule: 'WCAG 1.3.1',
          level: 'A',
          description: 'Template should include a main landmark element',
        })
      );
    });

    it('should handle malformed HTML gracefully', () => {
      const template = createTestTemplate('<invalid><html><structure>');

      const result = validateTemplateAccessibility(template);
      expect(result.isValid).toBe(false);
      // JSDOM is forgiving with malformed HTML, so we expect WCAG violations instead
      expect(result.wcagViolations.length).toBeGreaterThan(0);
    });
  });

  describe('validateTemplateFields', () => {
    it('should pass validation for valid field definitions', () => {
      const fields: TemplateField[] = [
        {
          id: 'title',
          name: 'Title',
          type: 'text',
          required: true,
          validation: {},
        },
        {
          id: 'content',
          name: 'Content',
          type: 'rich-text',
          required: false,
          validation: {},
        },
      ];

      const result = validateTemplateFields(fields);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect duplicate field IDs', () => {
      const fields: TemplateField[] = [
        {
          id: 'title',
          name: 'Title',
          type: 'text',
          required: true,
          validation: {},
        },
        {
          id: 'title',
          name: 'Another Title',
          type: 'text',
          required: false,
          validation: {},
        },
      ];

      const result = validateTemplateFields(fields);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate field IDs found: title');
    });

    it('should detect duplicate field names', () => {
      const fields: TemplateField[] = [
        {
          id: 'title1',
          name: 'Title',
          type: 'text',
          required: true,
          validation: {},
        },
        {
          id: 'title2',
          name: 'Title',
          type: 'text',
          required: false,
          validation: {},
        },
      ];

      const result = validateTemplateFields(fields);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate field names found: Title');
    });

    it('should detect missing field IDs', () => {
      const fields: TemplateField[] = [
        {
          id: '',
          name: 'Title',
          type: 'text',
          required: true,
          validation: {},
        },
      ];

      const result = validateTemplateFields(fields);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field at index 0 must have a valid ID');
    });

    it('should detect missing field names', () => {
      const fields: TemplateField[] = [
        {
          id: 'title',
          name: '',
          type: 'text',
          required: true,
          validation: {},
        },
      ];

      const result = validateTemplateFields(fields);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field at index 0 must have a valid name');
    });

    it('should warn about accessibility issues in image fields', () => {
      const fields: TemplateField[] = [
        {
          id: 'image',
          name: 'Image',
          type: 'image',
          required: false,
          validation: { altTextRequired: false },
        },
      ];

      const result = validateTemplateFields(fields);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Image field "Image" should require alt text for accessibility'
      );
    });

    it('should warn about accessibility issues in link fields', () => {
      const fields: TemplateField[] = [
        {
          id: 'link',
          name: 'Link',
          type: 'link',
          required: false,
          validation: { titleRequired: false },
        },
      ];

      const result = validateTemplateFields(fields);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Link field "Link" should require title attribute for accessibility'
      );
    });

    it('should warn about heading structure in rich text fields', () => {
      const fields: TemplateField[] = [
        {
          id: 'content',
          name: 'Content',
          type: 'rich-text',
          required: false,
          validation: { headingStructure: false },
        },
      ];

      const result = validateTemplateFields(fields);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Rich text field "Content" should validate heading structure'
      );
    });
  });

  describe('validateTemplate', () => {
    it('should validate complete template with all components', () => {
      const template: Template = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Complete test template',
        htmlStructure: `
          <!DOCTYPE html>
          <html lang="en">
          <head><title>Test</title></head>
          <body>
            <div class="skip-links">
              <a href="#main-content" class="skip-link">Skip to main content</a>
            </div>
            <main id="main-content">
              <h1>Title</h1>
              <p>Content</p>
            </main>
          </body>
          </html>
        `,
        cssStyles: 'body { color: #000; background: #fff; }',
        accessibilityFeatures: {
          skipLinks: true,
          headingStructure: true,
          altTextRequired: true,
          colorContrastCompliant: true,
        },
        contentFields: [
          {
            id: 'title',
            name: 'Title',
            type: 'text',
            required: true,
            validation: {},
          },
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateTemplate(template);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.wcagViolations).toHaveLength(0);
    });

    it('should combine errors from both accessibility and field validation', () => {
      const template: Template = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Invalid test template',
        htmlStructure: '<div>No proper structure</div>',
        cssStyles: '',
        accessibilityFeatures: {
          skipLinks: true,
          headingStructure: true,
          altTextRequired: true,
          colorContrastCompliant: true,
        },
        contentFields: [
          {
            id: '',
            name: '',
            type: 'text',
            required: true,
            validation: {},
          },
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateTemplate(template);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.wcagViolations.length).toBeGreaterThan(0);
    });
  });
});