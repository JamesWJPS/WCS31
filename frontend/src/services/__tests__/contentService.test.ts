import { describe, it, expect, beforeEach, vi } from 'vitest';
import { contentService, ContentService } from '../contentService';
import { apiService } from '../api';
import { ContentFormData, ContentListItem, Content, Template } from '../../types';

// Mock the API service
vi.mock('../api');
const mockApiService = apiService as any;

describe('ContentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getContentList', () => {
    it('should fetch content list without filters', async () => {
      const mockContentList: ContentListItem[] = [
        {
          id: '1',
          title: 'Test Content',
          slug: 'test-content',
          status: 'published',
          templateName: 'Basic Template',
          authorName: 'John Doe',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          publishedAt: '2023-01-01T00:00:00Z',
        },
      ];

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockContentList,
      });

      const result = await contentService.getContentList();

      expect(mockApiService.get).toHaveBeenCalledWith('/content');
      expect(result).toEqual(mockContentList);
    });

    it('should fetch content list with filters', async () => {
      const filter = {
        status: 'draft' as const,
        search: 'test',
        templateId: 'template-1',
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: [],
      });

      await contentService.getContentList(filter);

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/content?status=draft&templateId=template-1&search=test'
      );
    });

    it('should return empty array when no data', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await contentService.getContentList();

      expect(result).toEqual([]);
    });
  });

  describe('getContent', () => {
    it('should fetch single content item', async () => {
      const mockContent: Content = {
        id: '1',
        title: 'Test Content',
        slug: 'test-content',
        body: '<p>Test body</p>',
        templateId: 'template-1',
        authorId: 'user-1',
        status: 'published',
        metadata: {},
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        publishedAt: '2023-01-01T00:00:00Z',
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockContent,
      });

      const result = await contentService.getContent('1');

      expect(mockApiService.get).toHaveBeenCalledWith('/content/1');
      expect(result).toEqual(mockContent);
    });

    it('should throw error when content not found', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(contentService.getContent('1')).rejects.toThrow('Content not found');
    });
  });

  describe('createContent', () => {
    it('should create new content', async () => {
      const contentData: ContentFormData = {
        title: 'New Content',
        slug: 'new-content',
        body: '<p>New content body</p>',
        templateId: 'template-1',
        status: 'draft',
        metadata: {},
      };

      const mockCreatedContent: Content = {
        id: '1',
        ...contentData,
        authorId: 'user-1',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        publishedAt: null,
      };

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockCreatedContent,
      });

      const result = await contentService.createContent(contentData);

      expect(mockApiService.post).toHaveBeenCalledWith('/content', contentData);
      expect(result).toEqual(mockCreatedContent);
    });

    it('should throw error when creation fails', async () => {
      const contentData: ContentFormData = {
        title: 'New Content',
        slug: 'new-content',
        body: '<p>New content body</p>',
        templateId: 'template-1',
        status: 'draft',
        metadata: {},
      };

      mockApiService.post.mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(contentService.createContent(contentData)).rejects.toThrow(
        'Failed to create content'
      );
    });
  });

  describe('updateContent', () => {
    it('should update existing content', async () => {
      const updateData = { title: 'Updated Title' };
      const mockUpdatedContent: Content = {
        id: '1',
        title: 'Updated Title',
        slug: 'test-content',
        body: '<p>Test body</p>',
        templateId: 'template-1',
        authorId: 'user-1',
        status: 'published',
        metadata: {},
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
        publishedAt: '2023-01-01T00:00:00Z',
      };

      mockApiService.put.mockResolvedValue({
        success: true,
        data: mockUpdatedContent,
      });

      const result = await contentService.updateContent('1', updateData);

      expect(mockApiService.put).toHaveBeenCalledWith('/content/1', updateData);
      expect(result).toEqual(mockUpdatedContent);
    });
  });

  describe('deleteContent', () => {
    it('should delete content', async () => {
      mockApiService.delete.mockResolvedValue({
        success: true,
      });

      await contentService.deleteContent('1');

      expect(mockApiService.delete).toHaveBeenCalledWith('/content/1');
    });
  });

  describe('getContentPreview', () => {
    it('should fetch content preview', async () => {
      const mockPreviewHtml = '<div>Preview HTML</div>';

      mockApiService.get.mockResolvedValue({
        success: true,
        data: { html: mockPreviewHtml },
      });

      const result = await contentService.getContentPreview('1');

      expect(mockApiService.get).toHaveBeenCalledWith('/content/1/preview');
      expect(result).toBe(mockPreviewHtml);
    });

    it('should return empty string when no preview data', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await contentService.getContentPreview('1');

      expect(result).toBe('');
    });
  });

  describe('getTemplates', () => {
    it('should fetch templates', async () => {
      const mockTemplates: Template[] = [
        {
          id: '1',
          name: 'Basic Template',
          description: 'A basic template',
          htmlStructure: '<div>{{content}}</div>',
          cssStyles: 'body { margin: 0; }',
          accessibilityFeatures: {
            skipLinks: true,
            headingStructure: true,
            altTextRequired: true,
            colorContrastCompliant: true,
          },
          contentFields: [],
          isActive: true,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ];

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockTemplates,
      });

      const result = await contentService.getTemplates();

      expect(mockApiService.get).toHaveBeenCalledWith('/templates');
      expect(result).toEqual(mockTemplates);
    });
  });

  describe('generateSlug', () => {
    it('should generate slug from title', () => {
      expect(contentService.generateSlug('Hello World')).toBe('hello-world');
      expect(contentService.generateSlug('Test Title With Spaces')).toBe('test-title-with-spaces');
      expect(contentService.generateSlug('Special!@#$%Characters')).toBe('specialcharacters');
      expect(contentService.generateSlug('Multiple---Hyphens')).toBe('multiple-hyphens');
      expect(contentService.generateSlug('  Trimmed  ')).toBe('trimmed');
    });
  });

  describe('validateContent', () => {
    it('should validate valid content', () => {
      const validContent: ContentFormData = {
        title: 'Valid Title',
        slug: 'valid-slug',
        body: '<p>Valid body</p>',
        templateId: 'template-1',
        status: 'draft',
        metadata: {},
      };

      const result = contentService.validateContent(validContent);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should validate invalid content', () => {
      const invalidContent: ContentFormData = {
        title: '',
        slug: 'Invalid Slug!',
        body: '',
        templateId: '',
        status: 'draft',
        metadata: {},
      };

      const result = contentService.validateContent(invalidContent);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual({
        title: 'Title is required',
        slug: 'Slug can only contain lowercase letters, numbers, and hyphens',
        body: 'Content body is required',
        templateId: 'Template selection is required',
      });
    });

    it('should validate missing slug', () => {
      const contentWithoutSlug: ContentFormData = {
        title: 'Valid Title',
        slug: '',
        body: '<p>Valid body</p>',
        templateId: 'template-1',
        status: 'draft',
        metadata: {},
      };

      const result = contentService.validateContent(contentWithoutSlug);

      expect(result.isValid).toBe(false);
      expect(result.errors.slug).toBe('Slug is required');
    });
  });
});