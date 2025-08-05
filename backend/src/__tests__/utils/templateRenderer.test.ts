/**
 * Tests for template rendering engine
 */

import { TemplateRenderer, renderTemplate } from '../../utils/templateRenderer';
import { Template, Content } from '../../models/interfaces';

describe('Template Renderer', () => {
  const createTestTemplate = (htmlStructure: string, cssStyles: string = ''): Template => ({
    id: 'test-template',
    name: 'Test Template',
    description: 'Test template for rendering',
    htmlStructure,
    cssStyles,
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
      {
        id: 'content',
        name: 'Content',
        type: 'rich-text',
        required: false,
        validation: {},
      },
      {
        id: 'image',
        name: 'Image',
        type: 'image',
        required: false,
        validation: { altTextRequired: true },
      },
      {
        id: 'link',
        name: 'Link',
        type: 'link',
        required: false,
        validation: { titleRequired: true },
      },
    ],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const createTestContent = (): Content => ({
    id: 'test-content',
    title: 'Test Page',
    slug: 'test-page',
    body: 'Test content body',
    templateId: 'test-template',
    authorId: 'test-author',
    status: 'published',
    metadata: {
      description: 'Test page description',
      keywords: 'test, page',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
  });

  const makeFieldsOptional = (template: Template): void => {
    template.contentFields.forEach(field => {
      field.required = false;
    });
  };

  describe('TemplateRenderer.render', () => {
    it('should render a basic template with text fields', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Test</title></head>
        <body>
          <h1 data-field="title">Default Title</h1>
          <div data-field="content">Default Content</div>
        </body>
        </html>
      `);

      const content = createTestContent();
      const data = {
        title: 'Rendered Title',
        content: 'Rendered Content',
      };

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Rendered Title');
      expect(result.html).toContain('Rendered Content');
      expect(result.html).toContain('<title>Test Page</title>');
    });

    it('should render textarea fields with line breaks', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html><body><div data-field="textarea-content"></div></body></html>
      `);
      // Add a textarea field and make fields optional for this test
      template.contentFields.push({
        id: 'textarea-content',
        name: 'Textarea Content',
        type: 'textarea',
        required: false,
        validation: {},
      });
      makeFieldsOptional(template);

      const content = createTestContent();
      const data = {
        'textarea-content': 'Line 1\nLine 2\nLine 3',
      };

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Line 1<br>Line 2<br>Line 3');
    });

    it('should render rich text fields with HTML', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html><body><div data-field="content"></div></body></html>
      `);
      // Make fields optional for this test
      makeFieldsOptional(template);

      const content = createTestContent();
      const data = {
        content: '<p>Rich <strong>text</strong> content</p>',
      };

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('<p>Rich <strong>text</strong> content</p>');
    });

    it('should render image fields correctly', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html><body><div data-field="image"></div></body></html>
      `);
      // Make fields optional for this test
      makeFieldsOptional(template);

      const content = createTestContent();
      const data = {
        image: {
          src: 'test-image.jpg',
          alt: 'Test image description',
          title: 'Test image title',
        },
      };

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('src="test-image.jpg"');
      expect(result.html).toContain('alt="Test image description"');
      expect(result.html).toContain('title="Test image title"');
    });

    it('should render image fields in existing img tags', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html><body><img data-field="image" src="default.jpg" alt="default" /></body></html>
      `);
      // Make fields optional for this test
      makeFieldsOptional(template);

      const content = createTestContent();
      const data = {
        image: {
          src: 'new-image.jpg',
          alt: 'New image description',
        },
      };

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('src="new-image.jpg"');
      expect(result.html).toContain('alt="New image description"');
    });

    it('should render link fields correctly', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html><body><div data-field="link"></div></body></html>
      `);
      // Make fields optional for this test
      makeFieldsOptional(template);

      const content = createTestContent();
      const data = {
        link: {
          href: 'https://example.com',
          text: 'Example Link',
          title: 'Link to example site',
          target: '_blank',
        },
      };

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('href="https://example.com"');
      expect(result.html).toContain('Example Link');
      expect(result.html).toContain('title="Link to example site"');
      expect(result.html).toContain('target="_blank"');
      expect(result.html).toContain('rel="noopener"');
    });

    it('should render link fields in existing anchor tags', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html><body><a data-field="link" href="#default">Default Link</a></body></html>
      `);
      // Make fields optional for this test
      makeFieldsOptional(template);

      const content = createTestContent();
      const data = {
        link: {
          href: 'https://example.com',
          text: 'Updated Link',
        },
      };

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('href="https://example.com"');
      expect(result.html).toContain('Updated Link');
    });

    it('should validate required fields and return errors', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html><body><h1 data-field="title"></h1></body></html>
      `);

      const content = createTestContent();
      const data = {}; // Missing required title field

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toContain(
        'Required field "Title" (title) is missing or empty'
      );
      expect(result.html).toBe('');
    });

    it('should validate image field structure', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html><body><div data-field="image"></div></body></html>
      `);

      const content = createTestContent();
      const data = {
        image: 'invalid-image-data', // Should be an object with src
      };

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toContain(
        'Image field "Image" must have a src property'
      );
    });

    it('should validate required alt text for images', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html><body><div data-field="image"></div></body></html>
      `);

      const content = createTestContent();
      const data = {
        image: {
          src: 'test.jpg',
          // Missing required alt text
        },
      };

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toContain(
        'Image field "Image" requires alt text'
      );
    });

    it('should validate link field structure', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html><body><div data-field="link"></div></body></html>
      `);

      const content = createTestContent();
      const data = {
        link: 'invalid-link-data', // Should be an object with href
      };

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toContain(
        'Link field "Link" must have an href property'
      );
    });

    it('should add skip links when enabled', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html>
        <body>
          <main id="main-content">
            <h1 data-field="title">Title</h1>
          </main>
        </body>
        </html>
      `);

      const content = createTestContent();
      const data = { title: 'Test Title' };

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Skip to main content');
      expect(result.html).toContain('href="#main-content"');
      expect(result.html).toContain('.skip-links');
    });

    it('should not add skip links if they already exist', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html>
        <body>
          <div class="skip-links">
            <a href="#main">Existing skip link</a>
          </div>
          <main id="main">
            <h1 data-field="title">Title</h1>
          </main>
        </body>
        </html>
      `);

      const content = createTestContent();
      const data = { title: 'Test Title' };

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Existing skip link');
      // Should not contain duplicate skip links
      expect((result.html.match(/skip-links/g) || []).length).toBe(1);
    });

    it('should fix heading structure when enabled', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html>
        <body>
          <h1>Title</h1>
          <h4>This should be h2</h4>
          <h3>This should be h3</h3>
        </body>
        </html>
      `);
      // Make fields optional for this test
      makeFieldsOptional(template);

      const content = createTestContent();
      const data = {};

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('<h1>Title</h1>');
      expect(result.html).toContain('<h2>This should be h2</h2>');
      expect(result.html).toContain('<h3>This should be h3</h3>');
    });

    it('should ensure all images have alt attributes', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html>
        <body>
          <img src="test1.jpg" />
          <img src="test2.jpg" alt="Existing alt" />
        </body>
        </html>
      `);
      // Make fields optional for this test
      makeFieldsOptional(template);

      const content = createTestContent();
      const data = {};

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('<img src="test1.jpg" alt="">');
      expect(result.html).toContain('<img src="test2.jpg" alt="Existing alt">');
    });

    it('should add ARIA landmarks', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html>
        <body>
          <header>Header</header>
          <nav>Navigation</nav>
          <main>Main content</main>
          <footer>Footer</footer>
        </body>
        </html>
      `);
      // Make fields optional for this test
      makeFieldsOptional(template);

      const content = createTestContent();
      const data = {};

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('<header role="banner">');
      expect(result.html).toContain('<nav role="navigation">');
      expect(result.html).toContain('role="main"');
      expect(result.html).toContain('<footer role="contentinfo">');
    });

    it('should set page metadata from content', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html>
        <head><title>Default Title</title></head>
        <body><h1>Content</h1></body>
        </html>
      `);
      // Make fields optional for this test
      makeFieldsOptional(template);

      const content = createTestContent();
      const data = {};

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('<title>Test Page</title>');
      expect(result.html).toContain('name="description" content="Test page description"');
      expect(result.html).toContain('name="keywords" content="test, page"');
    });

    it('should handle rendering errors gracefully', () => {
      const template = createTestTemplate('invalid html structure');
      const content = createTestContent();
      const data = {};

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.html).toBe('');
    });

    it('should apply CSS styles to the document', () => {
      const template = createTestTemplate(
        `<!DOCTYPE html><html><head></head><body><h1>Title</h1></body></html>`,
        'body { color: red; }'
      );
      // Make fields optional for this test
      makeFieldsOptional(template);

      const content = createTestContent();
      const data = {};

      const result = TemplateRenderer.render(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('<style>body { color: red; }</style>');
    });
  });

  describe('renderTemplate utility function', () => {
    it('should work as a convenience wrapper', () => {
      const template = createTestTemplate(`
        <!DOCTYPE html>
        <html><body><h1 data-field="title">Default</h1></body></html>
      `);

      const content = createTestContent();
      const data = { title: 'Rendered Title' };

      const result = renderTemplate(template, content, data);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Rendered Title');
    });
  });
});