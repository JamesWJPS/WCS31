import { TemplateRepository } from '../../models/TemplateRepository';
import { Template } from '../../models/interfaces';
import db from '../../config/database';

describe('TemplateRepository', () => {
  let templateRepository: TemplateRepository;
  let testTemplate: Template;

  beforeAll(async () => {
    await db.migrate.latest();
    templateRepository = new TemplateRepository();
  });

  beforeEach(async () => {
    // Clean up before each test
    await db('templates').del();

    testTemplate = {
      id: 'test-template-1',
      name: 'Test Template',
      description: 'A test template for articles',
      htmlStructure: '<article><h1>{{title}}</h1><div>{{content}}</div></article>',
      cssStyles: 'article { margin: 20px; padding: 10px; }',
      accessibilityFeatures: {
        skipLinks: true,
        headingStructure: true,
        altTextRequired: true,
        colorContrastCompliant: true,
      },
      contentFields: [
        {
          id: 'field-1',
          name: 'title',
          type: 'text',
          required: true,
          validation: { maxLength: 100 },
        },
        {
          id: 'field-2',
          name: 'content',
          type: 'rich-text',
          required: true,
          validation: {},
        },
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('create', () => {
    it('should create new template', async () => {
      const created = await templateRepository.create({
        id: testTemplate.id,
        name: testTemplate.name,
        description: testTemplate.description,
        html_structure: testTemplate.htmlStructure,
        css_styles: testTemplate.cssStyles,
        accessibility_features: JSON.stringify(testTemplate.accessibilityFeatures),
        content_fields: JSON.stringify(testTemplate.contentFields),
        is_active: testTemplate.isActive,
      });

      expect(created.id).toBe(testTemplate.id);
      expect(created.name).toBe(testTemplate.name);
      expect(created.description).toBe(testTemplate.description);
      expect(created.htmlStructure).toBe(testTemplate.htmlStructure);
      expect(created.cssStyles).toBe(testTemplate.cssStyles);
      expect(created.accessibilityFeatures).toEqual(testTemplate.accessibilityFeatures);
      expect(created.contentFields).toEqual(testTemplate.contentFields);
      expect(created.isActive).toBe(testTemplate.isActive);
    });
  });

  describe('findActive', () => {
    it('should find only active templates', async () => {
      // Create active template
      await templateRepository.create({
        id: testTemplate.id,
        name: testTemplate.name,
        description: testTemplate.description,
        html_structure: testTemplate.htmlStructure,
        css_styles: testTemplate.cssStyles,
        accessibility_features: JSON.stringify(testTemplate.accessibilityFeatures),
        content_fields: JSON.stringify(testTemplate.contentFields),
        is_active: true,
      });

      // Create inactive template
      await templateRepository.create({
        id: 'inactive-template-1',
        name: 'Inactive Template',
        description: 'An inactive template',
        html_structure: '<div>{{content}}</div>',
        css_styles: 'div { margin: 10px; }',
        accessibility_features: JSON.stringify({
          skipLinks: false,
          headingStructure: false,
          altTextRequired: false,
          colorContrastCompliant: false,
        }),
        content_fields: JSON.stringify([]),
        is_active: false,
      });

      const activeTemplates = await templateRepository.findActive();
      expect(activeTemplates).toHaveLength(1);
      expect(activeTemplates[0]?.isActive).toBe(true);
    });
  });

  describe('findByName', () => {
    it('should find template by name', async () => {
      await templateRepository.create({
        id: testTemplate.id,
        name: testTemplate.name,
        description: testTemplate.description,
        html_structure: testTemplate.htmlStructure,
        css_styles: testTemplate.cssStyles,
        accessibility_features: JSON.stringify(testTemplate.accessibilityFeatures),
        content_fields: JSON.stringify(testTemplate.contentFields),
        is_active: testTemplate.isActive,
      });

      const found = await templateRepository.findByName(testTemplate.name);
      expect(found).not.toBeNull();
      expect(found?.name).toBe(testTemplate.name);
    });

    it('should return null for non-existent template name', async () => {
      const found = await templateRepository.findByName('Non-existent Template');
      expect(found).toBeNull();
    });
  });

  describe('activate', () => {
    it('should activate template', async () => {
      await templateRepository.create({
        id: testTemplate.id,
        name: testTemplate.name,
        description: testTemplate.description,
        html_structure: testTemplate.htmlStructure,
        css_styles: testTemplate.cssStyles,
        accessibility_features: JSON.stringify(testTemplate.accessibilityFeatures),
        content_fields: JSON.stringify(testTemplate.contentFields),
        is_active: false,
      });

      const activated = await templateRepository.activate(testTemplate.id);
      expect(activated?.isActive).toBe(true);
    });
  });

  describe('deactivate', () => {
    it('should deactivate template', async () => {
      await templateRepository.create({
        id: testTemplate.id,
        name: testTemplate.name,
        description: testTemplate.description,
        html_structure: testTemplate.htmlStructure,
        css_styles: testTemplate.cssStyles,
        accessibility_features: JSON.stringify(testTemplate.accessibilityFeatures),
        content_fields: JSON.stringify(testTemplate.contentFields),
        is_active: true,
      });

      const deactivated = await templateRepository.deactivate(testTemplate.id);
      expect(deactivated?.isActive).toBe(false);
    });
  });

  describe('update', () => {
    it('should update template properties', async () => {
      await templateRepository.create({
        id: testTemplate.id,
        name: testTemplate.name,
        description: testTemplate.description,
        html_structure: testTemplate.htmlStructure,
        css_styles: testTemplate.cssStyles,
        accessibility_features: JSON.stringify(testTemplate.accessibilityFeatures),
        content_fields: JSON.stringify(testTemplate.contentFields),
        is_active: testTemplate.isActive,
      });

      const newAccessibilityFeatures = {
        skipLinks: false,
        headingStructure: true,
        altTextRequired: true,
        colorContrastCompliant: false,
      };

      const updated = await templateRepository.update(testTemplate.id, {
        name: 'Updated Template Name',
        description: 'Updated description',
        accessibility_features: JSON.stringify(newAccessibilityFeatures),
      });

      expect(updated?.name).toBe('Updated Template Name');
      expect(updated?.description).toBe('Updated description');
      expect(updated?.accessibilityFeatures).toEqual(newAccessibilityFeatures);
    });
  });

  describe('delete', () => {
    it('should delete template', async () => {
      await templateRepository.create({
        id: testTemplate.id,
        name: testTemplate.name,
        description: testTemplate.description,
        html_structure: testTemplate.htmlStructure,
        css_styles: testTemplate.cssStyles,
        accessibility_features: JSON.stringify(testTemplate.accessibilityFeatures),
        content_fields: JSON.stringify(testTemplate.contentFields),
        is_active: testTemplate.isActive,
      });

      const deleted = await templateRepository.delete(testTemplate.id);
      expect(deleted).toBe(true);

      const found = await templateRepository.findById(testTemplate.id);
      expect(found).toBeNull();
    });
  });
});