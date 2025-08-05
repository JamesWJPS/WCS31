/**
 * Tests for TemplateService
 */

import { TemplateService } from '../../services/TemplateService';
import { TemplateRepository } from '../../models/TemplateRepository';
import { Template, TemplateField } from '../../models/interfaces';

// Mock the TemplateRepository
jest.mock('../../models/TemplateRepository');

describe('TemplateService', () => {
  let templateService: TemplateService;
  let mockTemplateRepository: jest.Mocked<TemplateRepository>;

  const createTestTemplate = (overrides: Partial<Template> = {}): Template => ({
    id: 'test-template-id',
    name: 'Test Template',
    description: 'Test template description',
    htmlStructure: `
      <!DOCTYPE html>
      <html lang="en">
      <head><title>Test</title></head>
      <body>
        <div class="skip-links">
          <a href="#main-content" class="skip-link">Skip to main content</a>
        </div>
        <main id="main-content">
          <h1 data-field="title">Default Title</h1>
          <div data-field="content">Default Content</div>
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
      {
        id: 'content',
        name: 'Content',
        type: 'rich-text',
        required: false,
        validation: {},
      },
    ],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockTemplateRepository = new TemplateRepository() as jest.Mocked<TemplateRepository>;
    templateService = new TemplateService();
    (templateService as any).templateRepository = mockTemplateRepository;
  });

  describe('createTemplate', () => {
    it('should create a valid template successfully', async () => {
      const templateData = createTestTemplate();
      delete (templateData as any).id;
      delete (templateData as any).createdAt;
      delete (templateData as any).updatedAt;

      const expectedTemplate = createTestTemplate();
      mockTemplateRepository.create.mockResolvedValue(expectedTemplate);

      const result = await templateService.createTemplate(templateData);

      expect(mockTemplateRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: templateData.name,
          description: templateData.description,
          htmlStructure: templateData.htmlStructure,
          cssStyles: templateData.cssStyles,
          accessibilityFeatures: templateData.accessibilityFeatures,
          contentFields: templateData.contentFields,
          isActive: templateData.isActive,
        })
      );
      expect(result).toEqual(expectedTemplate);
    });

    it('should reject template with invalid structure', async () => {
      const invalidTemplateData = {
        name: '', // Invalid: empty name
        description: 'Test description',
        htmlStructure: '<html></html>',
        cssStyles: '',
        accessibilityFeatures: {
          skipLinks: true,
          headingStructure: true,
          altTextRequired: true,
          colorContrastCompliant: true,
        },
        contentFields: [],
        isActive: true,
      };

      await expect(templateService.createTemplate(invalidTemplateData))
        .rejects.toThrow('Template validation failed');
    });

    it('should reject template with accessibility violations', async () => {
      const templateData = createTestTemplate({
        htmlStructure: '<div>No proper structure</div>', // Missing accessibility features
      });
      delete (templateData as any).id;
      delete (templateData as any).createdAt;
      delete (templateData as any).updatedAt;

      await expect(templateService.createTemplate(templateData))
        .rejects.toThrow('Template accessibility validation failed');
    });

    it('should log warnings for accessibility issues', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const templateData = createTestTemplate({
        contentFields: [
          {
            id: 'image',
            name: 'Image',
            type: 'image',
            required: false,
            validation: { altTextRequired: false }, // This will generate a warning
          },
        ],
      });
      delete (templateData as any).id;
      delete (templateData as any).createdAt;
      delete (templateData as any).updatedAt;

      const expectedTemplate = createTestTemplate();
      mockTemplateRepository.create.mockResolvedValue(expectedTemplate);

      await templateService.createTemplate(templateData);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Template warnings:',
        expect.arrayContaining([
          expect.stringContaining('should require alt text for accessibility')
        ])
      );

      consoleSpy.mockRestore();
    });
  });

  describe('updateTemplate', () => {
    it('should update an existing template successfully', async () => {
      const existingTemplate = createTestTemplate();
      const updateData = { name: 'Updated Template Name' };
      const updatedTemplate = createTestTemplate({ ...updateData, updatedAt: new Date() });

      mockTemplateRepository.findById.mockResolvedValue(existingTemplate);
      mockTemplateRepository.update.mockResolvedValue(updatedTemplate);

      const result = await templateService.updateTemplate('test-template-id', updateData);

      expect(mockTemplateRepository.findById).toHaveBeenCalledWith('test-template-id');
      expect(mockTemplateRepository.update).toHaveBeenCalledWith(
        'test-template-id',
        expect.objectContaining({
          ...existingTemplate,
          ...updateData,
          updatedAt: expect.any(Date),
        })
      );
      expect(result).toEqual(updatedTemplate);
    });

    it('should throw error when template not found', async () => {
      mockTemplateRepository.findById.mockResolvedValue(null);

      await expect(templateService.updateTemplate('nonexistent-id', { name: 'New Name' }))
        .rejects.toThrow('Template not found');
    });

    it('should reject update with invalid data', async () => {
      const existingTemplate = createTestTemplate();
      mockTemplateRepository.findById.mockResolvedValue(existingTemplate);

      await expect(templateService.updateTemplate('test-template-id', { name: '' }))
        .rejects.toThrow('Template update validation failed');
    });

    it('should reject update that violates accessibility', async () => {
      const existingTemplate = createTestTemplate();
      mockTemplateRepository.findById.mockResolvedValue(existingTemplate);

      await expect(templateService.updateTemplate('test-template-id', {
        htmlStructure: '<div>Invalid structure</div>'
      })).rejects.toThrow('Template accessibility validation failed');
    });
  });

  describe('getAllTemplates', () => {
    it('should return all templates', async () => {
      const templates = [createTestTemplate(), createTestTemplate({ id: 'template-2' })];
      mockTemplateRepository.findAll.mockResolvedValue(templates);

      const result = await templateService.getAllTemplates();

      expect(mockTemplateRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(templates);
    });
  });

  describe('getActiveTemplates', () => {
    it('should return only active templates', async () => {
      const activeTemplates = [createTestTemplate()];
      mockTemplateRepository.findActive.mockResolvedValue(activeTemplates);

      const result = await templateService.getActiveTemplates();

      expect(mockTemplateRepository.findActive).toHaveBeenCalled();
      expect(result).toEqual(activeTemplates);
    });
  });

  describe('getTemplateById', () => {
    it('should return template by ID', async () => {
      const template = createTestTemplate();
      mockTemplateRepository.findById.mockResolvedValue(template);

      const result = await templateService.getTemplateById('test-template-id');

      expect(mockTemplateRepository.findById).toHaveBeenCalledWith('test-template-id');
      expect(result).toEqual(template);
    });

    it('should return null when template not found', async () => {
      mockTemplateRepository.findById.mockResolvedValue(null);

      const result = await templateService.getTemplateById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('getTemplateByName', () => {
    it('should return template by name', async () => {
      const template = createTestTemplate();
      mockTemplateRepository.findByName.mockResolvedValue(template);

      const result = await templateService.getTemplateByName('Test Template');

      expect(mockTemplateRepository.findByName).toHaveBeenCalledWith('Test Template');
      expect(result).toEqual(template);
    });
  });

  describe('activateTemplate', () => {
    it('should activate an existing template', async () => {
      const template = createTestTemplate({ isActive: false });
      const activatedTemplate = createTestTemplate({ isActive: true });

      mockTemplateRepository.findById.mockResolvedValue(template);
      mockTemplateRepository.activate.mockResolvedValue(activatedTemplate);

      const result = await templateService.activateTemplate('test-template-id');

      expect(mockTemplateRepository.findById).toHaveBeenCalledWith('test-template-id');
      expect(mockTemplateRepository.activate).toHaveBeenCalledWith('test-template-id');
      expect(result).toEqual(activatedTemplate);
    });

    it('should throw error when template not found', async () => {
      mockTemplateRepository.findById.mockResolvedValue(null);

      await expect(templateService.activateTemplate('nonexistent-id'))
        .rejects.toThrow('Template not found');
    });
  });

  describe('deactivateTemplate', () => {
    it('should deactivate an existing template', async () => {
      const template = createTestTemplate({ isActive: true });
      const deactivatedTemplate = createTestTemplate({ isActive: false });

      mockTemplateRepository.findById.mockResolvedValue(template);
      mockTemplateRepository.deactivate.mockResolvedValue(deactivatedTemplate);

      const result = await templateService.deactivateTemplate('test-template-id');

      expect(mockTemplateRepository.findById).toHaveBeenCalledWith('test-template-id');
      expect(mockTemplateRepository.deactivate).toHaveBeenCalledWith('test-template-id');
      expect(result).toEqual(deactivatedTemplate);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete an existing template', async () => {
      const template = createTestTemplate();
      mockTemplateRepository.findById.mockResolvedValue(template);
      mockTemplateRepository.delete.mockResolvedValue(true);

      const result = await templateService.deleteTemplate('test-template-id');

      expect(mockTemplateRepository.findById).toHaveBeenCalledWith('test-template-id');
      expect(mockTemplateRepository.delete).toHaveBeenCalledWith('test-template-id');
      expect(result).toBe(true);
    });

    it('should throw error when template not found', async () => {
      mockTemplateRepository.findById.mockResolvedValue(null);

      await expect(templateService.deleteTemplate('nonexistent-id'))
        .rejects.toThrow('Template not found');
    });
  });

  describe('validateTemplateCompliance', () => {
    it('should validate template accessibility compliance', async () => {
      const template = createTestTemplate();
      mockTemplateRepository.findById.mockResolvedValue(template);

      const result = await templateService.validateTemplateCompliance('test-template-id');

      expect(mockTemplateRepository.findById).toHaveBeenCalledWith('test-template-id');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.wcagViolations).toHaveLength(0);
    });

    it('should throw error when template not found', async () => {
      mockTemplateRepository.findById.mockResolvedValue(null);

      await expect(templateService.validateTemplateCompliance('nonexistent-id'))
        .rejects.toThrow('Template not found');
    });
  });

  describe('renderTemplate', () => {
    it('should render template with content data', async () => {
      const template = createTestTemplate();
      const contentData = {
        id: 'content-id',
        title: 'Test Content',
        slug: 'test-content',
        body: 'Test body',
        templateId: 'test-template-id',
        authorId: 'author-id',
        status: 'published' as const,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
      };
      const fieldData = {
        title: 'Rendered Title',
        content: 'Rendered Content',
      };

      mockTemplateRepository.findById.mockResolvedValue(template);

      const result = await templateService.renderTemplate('test-template-id', contentData, fieldData);

      expect(mockTemplateRepository.findById).toHaveBeenCalledWith('test-template-id');
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Rendered Title');
      expect(result.html).toContain('Rendered Content');
    });

    it('should throw error when template not found', async () => {
      mockTemplateRepository.findById.mockResolvedValue(null);

      await expect(templateService.renderTemplate('nonexistent-id', {} as any))
        .rejects.toThrow('Template not found');
    });

    it('should throw error when template is not active', async () => {
      const template = createTestTemplate({ isActive: false });
      mockTemplateRepository.findById.mockResolvedValue(template);

      await expect(templateService.renderTemplate('test-template-id', {} as any))
        .rejects.toThrow('Template is not active');
    });
  });

  describe('validateFieldData', () => {
    it('should validate field data successfully', () => {
      const template = createTestTemplate();
      const fieldData = {
        title: 'Valid Title',
        content: 'Valid Content',
      };

      const result = templateService.validateFieldData(template, fieldData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const template = createTestTemplate();
      const fieldData = {
        // Missing required 'title' field
        content: 'Valid Content',
      };

      const result = templateService.validateFieldData(template, fieldData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field "Title" is required');
    });

    it('should validate field types', () => {
      const template = createTestTemplate();
      const fieldData = {
        title: 123, // Should be string
        content: 'Valid Content',
      };

      const result = templateService.validateFieldData(template, fieldData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field "Title" must be a string');
    });

    it('should validate image field structure', () => {
      const template = createTestTemplate({
        contentFields: [
          {
            id: 'image',
            name: 'Image',
            type: 'image',
            required: true,
            validation: { altTextRequired: true },
          },
        ],
      });
      const fieldData = {
        image: 'invalid-image-data', // Should be object with src
      };

      const result = templateService.validateFieldData(template, fieldData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Image field "Image" must have a src property');
    });

    it('should validate required alt text for images', () => {
      const template = createTestTemplate({
        contentFields: [
          {
            id: 'image',
            name: 'Image',
            type: 'image',
            required: true,
            validation: { altTextRequired: true },
          },
        ],
      });
      const fieldData = {
        image: {
          src: 'test.jpg',
          // Missing required alt text
        },
      };

      const result = templateService.validateFieldData(template, fieldData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Image field "Image" requires alt text');
    });

    it('should validate link field structure', () => {
      const template = createTestTemplate({
        contentFields: [
          {
            id: 'link',
            name: 'Link',
            type: 'link',
            required: true,
            validation: {},
          },
        ],
      });
      const fieldData = {
        link: 'invalid-link-data', // Should be object with href
      };

      const result = templateService.validateFieldData(template, fieldData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Link field "Link" must have an href property');
    });

    it('should apply custom validation rules', () => {
      const template = createTestTemplate({
        contentFields: [
          {
            id: 'title',
            name: 'Title',
            type: 'text',
            required: true,
            validation: {
              minLength: 10,
              maxLength: 50,
              pattern: '^[A-Z].*',
              allowedValues: ['Test Title', 'Another Title'],
            },
          },
        ],
      });

      // Test minLength
      let result = templateService.validateFieldData(template, { title: 'Short' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field "Title" must be at least 10 characters long');

      // Test maxLength
      result = templateService.validateFieldData(template, { 
        title: 'This is a very long title that exceeds the maximum length limit' 
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field "Title" must be no more than 50 characters long');

      // Test pattern
      result = templateService.validateFieldData(template, { title: 'lowercase title' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field "Title" does not match the required pattern');

      // Test allowedValues
      result = templateService.validateFieldData(template, { title: 'Invalid Title Value' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field "Title" must be one of: Test Title, Another Title');
    });
  });

  describe('createDefaultTemplate', () => {
    it('should create a default template successfully', async () => {
      const defaultTemplate = createTestTemplate({
        name: 'Basic Page Template',
        description: 'A basic WCAG 2.2 compliant page template for council websites',
      });
      mockTemplateRepository.create.mockResolvedValue(defaultTemplate);

      const result = await templateService.createDefaultTemplate();

      expect(mockTemplateRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Basic Page Template',
          description: 'A basic WCAG 2.2 compliant page template for council websites',
          isActive: true,
        })
      );
      expect(result).toEqual(defaultTemplate);
    });
  });
});