/**
 * Template service for managing template operations
 */

import { v4 as uuidv4 } from 'uuid';
import { TemplateRepository } from '../models/TemplateRepository';
import { Template, TemplateField } from '../models/interfaces';
import { templateCreateSchema, templateUpdateSchema } from '../models/validation';
import { validateTemplate, AccessibilityValidationResult } from '../utils/templateValidation';
import { TemplateRenderer, RenderResult } from '../utils/templateRenderer';

export class TemplateService {
  private templateRepository: TemplateRepository;

  constructor() {
    this.templateRepository = new TemplateRepository();
  }

  /**
   * Creates a new template with validation
   */
  async createTemplate(templateData: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> {
    const template: Template = {
      ...templateData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate template data structure
    const { error } = templateCreateSchema.validate(template);
    if (error) {
      throw new Error(`Template validation failed: ${error.details.map(d => d.message).join(', ')}`);
    }

    // Validate WCAG 2.2 compliance
    const accessibilityResult = validateTemplate(template);
    if (!accessibilityResult.isValid) {
      throw new Error(`Template accessibility validation failed: ${accessibilityResult.errors.join(', ')}`);
    }

    // Log warnings if any
    if (accessibilityResult.warnings.length > 0) {
      console.warn('Template warnings:', accessibilityResult.warnings);
    }

    return await this.templateRepository.create(template);
  }

  /**
   * Updates an existing template
   */
  async updateTemplate(id: string, updateData: Partial<Template>): Promise<Template | null> {
    const existingTemplate = await this.templateRepository.findById(id);
    if (!existingTemplate) {
      throw new Error('Template not found');
    }

    // Validate update data
    const { error } = templateUpdateSchema.validate(updateData);
    if (error) {
      throw new Error(`Template update validation failed: ${error.details.map(d => d.message).join(', ')}`);
    }

    const updatedTemplate: Template = {
      ...existingTemplate,
      ...updateData,
      updatedAt: new Date(),
    };

    // Validate WCAG 2.2 compliance for the updated template
    const accessibilityResult = validateTemplate(updatedTemplate);
    if (!accessibilityResult.isValid) {
      throw new Error(`Template accessibility validation failed: ${accessibilityResult.errors.join(', ')}`);
    }

    return await this.templateRepository.update(id, updatedTemplate);
  }

  /**
   * Gets all templates
   */
  async getAllTemplates(): Promise<Template[]> {
    return await this.templateRepository.findAll();
  }

  /**
   * Gets active templates only
   */
  async getActiveTemplates(): Promise<Template[]> {
    return await this.templateRepository.findActive();
  }

  /**
   * Gets a template by ID
   */
  async getTemplateById(id: string): Promise<Template | null> {
    return await this.templateRepository.findById(id);
  }

  /**
   * Gets a template by name
   */
  async getTemplateByName(name: string): Promise<Template | null> {
    return await this.templateRepository.findByName(name);
  }

  /**
   * Activates a template
   */
  async activateTemplate(id: string): Promise<Template | null> {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    return await this.templateRepository.activate(id);
  }

  /**
   * Deactivates a template
   */
  async deactivateTemplate(id: string): Promise<Template | null> {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    return await this.templateRepository.deactivate(id);
  }

  /**
   * Deletes a template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    return await this.templateRepository.delete(id);
  }

  /**
   * Validates a template for WCAG 2.2 compliance
   */
  async validateTemplateCompliance(id: string): Promise<AccessibilityValidationResult> {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    return validateTemplate(template);
  }

  /**
   * Renders a template with content data
   */
  async renderTemplate(templateId: string, contentData: any, fieldData: Record<string, any> = {}): Promise<RenderResult> {
    const template = await this.templateRepository.findById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (!template.isActive) {
      throw new Error('Template is not active');
    }

    return TemplateRenderer.render(template, contentData, fieldData);
  }

  /**
   * Validates template field data against field definitions
   */
  validateFieldData(template: Template, fieldData: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    template.contentFields.forEach(field => {
      const value = fieldData[field.id];

      // Check required fields
      if (field.required && (!value || value === '')) {
        errors.push(`Field "${field.name}" is required`);
        return;
      }

      if (!value) {
        return; // Skip validation for empty optional fields
      }

      // Type-specific validation
      switch (field.type) {
        case 'text':
        case 'textarea':
          if (typeof value !== 'string') {
            errors.push(`Field "${field.name}" must be a string`);
          }
          break;
        case 'rich-text':
          if (typeof value !== 'string') {
            errors.push(`Field "${field.name}" must be a string`);
          }
          // Additional validation for rich text could include HTML validation
          break;
        case 'image':
          if (typeof value !== 'object' || !value.src) {
            errors.push(`Image field "${field.name}" must have a src property`);
          }
          if (field.validation?.altTextRequired && !value.alt) {
            errors.push(`Image field "${field.name}" requires alt text`);
          }
          break;
        case 'link':
          if (typeof value !== 'object' || !value.href) {
            errors.push(`Link field "${field.name}" must have an href property`);
          }
          break;
      }

      // Apply custom validation rules
      if (field.validation) {
        this.applyCustomValidation(field, value, errors);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Applies custom validation rules to field data
   */
  private applyCustomValidation(field: TemplateField, value: any, errors: string[]): void {
    const validation = field.validation;

    if (validation.minLength && typeof value === 'string' && value.length < validation.minLength) {
      errors.push(`Field "${field.name}" must be at least ${validation.minLength} characters long`);
    }

    if (validation.maxLength && typeof value === 'string' && value.length > validation.maxLength) {
      errors.push(`Field "${field.name}" must be no more than ${validation.maxLength} characters long`);
    }

    if (validation.pattern && typeof value === 'string' && !new RegExp(validation.pattern).test(value)) {
      errors.push(`Field "${field.name}" does not match the required pattern`);
    }

    if (validation.allowedValues && !validation.allowedValues.includes(value)) {
      errors.push(`Field "${field.name}" must be one of: ${validation.allowedValues.join(', ')}`);
    }
  }

  /**
   * Creates a default template for testing/demo purposes
   */
  async createDefaultTemplate(): Promise<Template> {
    const defaultTemplate = {
      name: 'Basic Page Template',
      description: 'A basic WCAG 2.2 compliant page template for council websites',
      htmlStructure: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Council Page</title>
        </head>
        <body>
          <header role="banner">
            <h1 data-field="page-title">Page Title</h1>
            <nav role="navigation">
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/services">Services</a></li>
                <li><a href="/contact">Contact</a></li>
              </ul>
            </nav>
          </header>
          <main role="main" id="main-content">
            <article>
              <h2 data-field="content-heading">Content Heading</h2>
              <div data-field="content-body">Content body goes here</div>
              <div data-field="featured-image"></div>
            </article>
          </main>
          <footer role="contentinfo">
            <p>&copy; 2024 Council. All rights reserved.</p>
          </footer>
        </body>
        </html>
      `,
      cssStyles: `
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #fff;
          margin: 0;
          padding: 0;
        }
        header {
          background-color: #2c3e50;
          color: #fff;
          padding: 1rem;
        }
        h1 {
          margin: 0 0 1rem 0;
          font-size: 2rem;
        }
        nav ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
        }
        nav li {
          margin-right: 1rem;
        }
        nav a {
          color: #fff;
          text-decoration: none;
          padding: 0.5rem;
        }
        nav a:hover, nav a:focus {
          background-color: #34495e;
          outline: 2px solid #fff;
        }
        main {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        h2 {
          color: #2c3e50;
          border-bottom: 2px solid #3498db;
          padding-bottom: 0.5rem;
        }
        footer {
          background-color: #34495e;
          color: #fff;
          text-align: center;
          padding: 1rem;
          margin-top: 2rem;
        }
        .skip-link {
          position: absolute;
          top: -40px;
          left: 6px;
          background: #000;
          color: #fff;
          padding: 8px;
          text-decoration: none;
          z-index: 1000;
        }
        .skip-link:focus {
          top: 6px;
        }
      `,
      accessibilityFeatures: {
        skipLinks: true,
        headingStructure: true,
        altTextRequired: true,
        colorContrastCompliant: true,
      },
      contentFields: [
        {
          id: 'page-title',
          name: 'Page Title',
          type: 'text' as const,
          required: true,
          validation: { maxLength: 100 },
        },
        {
          id: 'content-heading',
          name: 'Content Heading',
          type: 'text' as const,
          required: true,
          validation: { maxLength: 200 },
        },
        {
          id: 'content-body',
          name: 'Content Body',
          type: 'rich-text' as const,
          required: true,
          validation: { headingStructure: true },
        },
        {
          id: 'featured-image',
          name: 'Featured Image',
          type: 'image' as const,
          required: false,
          validation: { altTextRequired: true },
        },
      ],
      isActive: true,
    };

    return await this.createTemplate(defaultTemplate);
  }
}