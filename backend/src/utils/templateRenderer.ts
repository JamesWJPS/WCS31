/**
 * Template rendering engine for generating HTML content from templates and data
 */

import { JSDOM } from 'jsdom';
import { Template, TemplateField, Content } from '../models/interfaces';

export interface RenderContext {
  content: Content;
  template: Template;
  data: Record<string, any>;
}

export interface RenderResult {
  html: string;
  errors: string[];
  warnings: string[];
}

/**
 * Main template rendering class
 */
export class TemplateRenderer {
  /**
   * Renders a template with provided content data
   */
  static render(template: Template, content: Content, data: Record<string, any> = {}): RenderResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate that all required fields have data
      const validationResult = this.validateRenderData(template, data);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);

      if (errors.length > 0) {
        return { html: '', errors, warnings };
      }

      // Create DOM from template HTML structure
      const dom = new JSDOM(template.htmlStructure);
      const document = dom.window.document;

      // Apply CSS styles
      const styleElement = document.createElement('style');
      styleElement.textContent = template.cssStyles;
      document.head.appendChild(styleElement);

      // Render content fields into template
      this.renderContentFields(document, template.contentFields, data);

      // Apply accessibility enhancements
      this.applyAccessibilityEnhancements(document, template);

      // Set page metadata
      this.setPageMetadata(document, content);

      return {
        html: dom.serialize(),
        errors,
        warnings,
      };

    } catch (error) {
      errors.push(`Template rendering failed: ${error.message}`);
      return { html: '', errors, warnings };
    }
  }

  /**
   * Validates that required template fields have corresponding data
   */
  private static validateRenderData(template: Template, data: Record<string, any>): { errors: string[], warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    template.contentFields.forEach(field => {
      if (field.required && (!data[field.id] || data[field.id] === '')) {
        errors.push(`Required field "${field.name}" (${field.id}) is missing or empty`);
      }

      // Type-specific validation
      if (data[field.id]) {
        switch (field.type) {
          case 'image':
            if (typeof data[field.id] !== 'object' || !data[field.id].src) {
              errors.push(`Image field "${field.name}" must have a src property`);
            }
            if (field.validation?.altTextRequired && !data[field.id].alt) {
              errors.push(`Image field "${field.name}" requires alt text`);
            }
            break;
          case 'link':
            if (typeof data[field.id] !== 'object' || !data[field.id].href) {
              errors.push(`Link field "${field.name}" must have an href property`);
            }
            if (field.validation?.titleRequired && !data[field.id].title) {
              warnings.push(`Link field "${field.name}" should have a title for accessibility`);
            }
            break;
        }
      }
    });

    return { errors, warnings };
  }

  /**
   * Renders content fields into the template DOM
   */
  private static renderContentFields(document: Document, fields: TemplateField[], data: Record<string, any>): void {
    fields.forEach(field => {
      const placeholder = document.querySelector(`[data-field="${field.id}"]`);
      if (!placeholder) {
        return; // Field placeholder not found in template
      }

      const fieldData = data[field.id];
      if (!fieldData) {
        return; // No data for this field
      }

      switch (field.type) {
        case 'text':
          this.renderTextField(placeholder, fieldData);
          break;
        case 'textarea':
          this.renderTextareaField(placeholder, fieldData);
          break;
        case 'rich-text':
          this.renderRichTextField(placeholder, fieldData);
          break;
        case 'image':
          this.renderImageField(placeholder, fieldData);
          break;
        case 'link':
          this.renderLinkField(placeholder, fieldData);
          break;
      }
    });
  }

  /**
   * Renders a simple text field
   */
  private static renderTextField(element: Element, data: string): void {
    element.textContent = data;
  }

  /**
   * Renders a textarea field (preserving line breaks)
   */
  private static renderTextareaField(element: Element, data: string): void {
    // Convert line breaks to <br> tags for HTML display
    const htmlContent = data.replace(/\n/g, '<br>');
    element.innerHTML = htmlContent;
  }

  /**
   * Renders rich text content (HTML)
   */
  private static renderRichTextField(element: Element, data: string): void {
    // Sanitize HTML content to prevent XSS
    const sanitizedContent = this.sanitizeHtml(data);
    element.innerHTML = sanitizedContent;
  }

  /**
   * Renders an image field
   */
  private static renderImageField(element: Element, data: { src: string, alt?: string, title?: string }): void {
    if (element.tagName.toLowerCase() === 'img') {
      (element as HTMLImageElement).src = data.src;
      if (data.alt) {
        element.setAttribute('alt', data.alt);
      }
      if (data.title) {
        element.setAttribute('title', data.title);
      }
    } else {
      // Create img element if placeholder is not an img tag
      const img = element.ownerDocument.createElement('img');
      img.src = data.src;
      img.alt = data.alt || '';
      if (data.title) {
        img.title = data.title;
      }
      element.appendChild(img);
    }
  }

  /**
   * Renders a link field
   */
  private static renderLinkField(element: Element, data: { href: string, text?: string, title?: string, target?: string }): void {
    if (element.tagName.toLowerCase() === 'a') {
      (element as HTMLAnchorElement).href = data.href;
      if (data.text) {
        element.textContent = data.text;
      }
      if (data.title) {
        element.setAttribute('title', data.title);
      }
      if (data.target) {
        element.setAttribute('target', data.target);
        // Add rel="noopener" for security when target="_blank"
        if (data.target === '_blank') {
          element.setAttribute('rel', 'noopener');
        }
      }
    } else {
      // Create anchor element if placeholder is not an anchor tag
      const link = element.ownerDocument.createElement('a');
      link.href = data.href;
      link.textContent = data.text || data.href;
      if (data.title) {
        link.title = data.title;
      }
      if (data.target) {
        link.target = data.target;
        if (data.target === '_blank') {
          link.rel = 'noopener';
        }
      }
      element.appendChild(link);
    }
  }

  /**
   * Applies accessibility enhancements based on template settings
   */
  private static applyAccessibilityEnhancements(document: Document, template: Template): void {
    // Add skip links if enabled
    if (template.accessibilityFeatures.skipLinks) {
      this.addSkipLinks(document);
    }

    // Ensure proper heading structure
    if (template.accessibilityFeatures.headingStructure) {
      this.validateAndFixHeadingStructure(document);
    }

    // Add required alt text to images
    if (template.accessibilityFeatures.altTextRequired) {
      this.ensureImageAltText(document);
    }

    // Add ARIA landmarks if missing
    this.addAriaLandmarks(document);
  }

  /**
   * Adds skip links to the document if not present
   */
  private static addSkipLinks(document: Document): void {
    const existingSkipLinks = document.querySelector('.skip-links');
    if (existingSkipLinks) {
      return; // Skip links already exist
    }

    const main = document.querySelector('main');
    if (!main) {
      return; // No main element to skip to
    }

    // Ensure main has an ID
    if (!main.id) {
      main.id = 'main-content';
    }

    // Create skip links container
    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.innerHTML = `
      <a href="#${main.id}" class="skip-link">Skip to main content</a>
    `;

    // Add CSS for skip links
    const style = document.createElement('style');
    style.textContent = `
      .skip-links {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        z-index: 1000;
      }
      .skip-links:focus {
        top: 6px;
      }
    `;
    document.head.appendChild(style);

    // Insert skip links at the beginning of body
    document.body.insertBefore(skipLinks, document.body.firstChild);
  }

  /**
   * Validates and fixes heading structure
   */
  private static validateAndFixHeadingStructure(document: Document): void {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let expectedLevel = 1;

    headings.forEach(heading => {
      const currentLevel = parseInt(heading.tagName.charAt(1));
      
      if (currentLevel > expectedLevel + 1) {
        // Fix skipped heading levels by adjusting the heading
        const newHeading = document.createElement(`h${expectedLevel + 1}`);
        newHeading.innerHTML = heading.innerHTML;
        newHeading.className = heading.className;
        heading.parentNode?.replaceChild(newHeading, heading);
        expectedLevel = expectedLevel + 1;
      } else {
        expectedLevel = currentLevel;
      }
    });
  }

  /**
   * Ensures all images have alt text
   */
  private static ensureImageAltText(document: Document): void {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.hasAttribute('alt')) {
        img.setAttribute('alt', ''); // Empty alt for decorative images
      }
    });
  }

  /**
   * Adds ARIA landmarks if missing
   */
  private static addAriaLandmarks(document: Document): void {
    // Add main landmark if missing
    const main = document.querySelector('main');
    if (main && !main.getAttribute('role')) {
      main.setAttribute('role', 'main');
    }

    // Add navigation landmark
    const nav = document.querySelector('nav');
    if (nav && !nav.getAttribute('role')) {
      nav.setAttribute('role', 'navigation');
    }

    // Add banner landmark to header
    const header = document.querySelector('header');
    if (header && !header.getAttribute('role')) {
      header.setAttribute('role', 'banner');
    }

    // Add contentinfo landmark to footer
    const footer = document.querySelector('footer');
    if (footer && !footer.getAttribute('role')) {
      footer.setAttribute('role', 'contentinfo');
    }
  }

  /**
   * Sets page metadata from content
   */
  private static setPageMetadata(document: Document, content: Content): void {
    // Set page title
    let title = document.querySelector('title');
    if (!title) {
      title = document.createElement('title');
      document.head.appendChild(title);
    }
    title.textContent = content.title;

    // Add meta description if available
    if (content.metadata?.description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', content.metadata.description);
    }

    // Add meta keywords if available
    if (content.metadata?.keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', content.metadata.keywords);
    }
  }

  /**
   * Basic HTML sanitization to prevent XSS
   */
  private static sanitizeHtml(html: string): string {
    // This is a basic implementation - in production, use a proper HTML sanitization library
    const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a'];
    const allowedAttributes = ['href', 'title', 'alt', 'src'];

    // Remove script tags and event handlers
    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');

    return sanitized;
  }
}

/**
 * Utility function for quick template rendering
 */
export function renderTemplate(template: Template, content: Content, data: Record<string, any> = {}): RenderResult {
  return TemplateRenderer.render(template, content, data);
}