import { ContentService, CreateContentData, UpdateContentData } from '../../services/ContentService';
import { ContentRepository } from '../../models/ContentRepository';
import { TemplateRepository } from '../../models/TemplateRepository';
import { Content, Template } from '../../models/interfaces';

// Mock the repositories
jest.mock('../../models/ContentRepository');
jest.mock('../../models/TemplateRepository');

const MockedContentRepository = ContentRepository as jest.MockedClass<typeof ContentRepository>;
const MockedTemplateRepository = TemplateRepository as jest.MockedClass<typeof TemplateRepository>;

describe('ContentService', () => {
  let contentService: ContentService;
  let mockContentRepository: jest.Mocked<ContentRepository>;
  let mockTemplateRepository: jest.Mocked<TemplateRepository>;

  const mockTemplate: Template = {
    id: 'template-1',
    name: 'Test Template',
    description: 'A test template',
    htmlStructure: '<div>{{content}}</div>',
    cssStyles: 'div { color: black; }',
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
  };

  const mockContent: Content = {
    id: 'content-1',
    title: 'Test Content',
    slug: 'test-content',
    body: 'This is test content',
    templateId: 'template-1',
    authorId: 'user-1',
    status: 'draft',
    metadata: { tags: ['test'] },
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockContentRepository = new MockedContentRepository() as jest.Mocked<ContentRepository>;
    mockTemplateRepository = new MockedTemplateRepository() as jest.Mocked<TemplateRepository>;
    
    contentService = new ContentService();
    (contentService as any).contentRepository = mockContentRepository;
    (contentService as any).templateRepository = mockTemplateRepository;
  });

  describe('getContent', () => {
    it('should return paginated content list for admin', async () => {
      const mockSearchResult = {
        content: [mockContent],
        total: 1,
      };

      mockContentRepository.search.mockResolvedValue(mockSearchResult);

      const result = await contentService.getContent(
        { page: 1, limit: 10 },
        'administrator',
        'admin-user'
      );

      expect(result.success).toBe(true);
      expect(result.data?.content).toEqual([mockContent]);
      expect(result.data?.pagination.total).toBe(1);
      expect(mockContentRepository.search).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
    });

    it('should filter content for non-admin users', async () => {
      const publishedContent = { ...mockContent, status: 'published' as const };
      const draftContent = { ...mockContent, id: 'content-2', authorId: 'other-user', status: 'draft' as const };
      
      const mockSearchResult = {
        content: [publishedContent, draftContent],
        total: 2,
      };

      mockContentRepository.search.mockResolvedValue(mockSearchResult);

      const result = await contentService.getContent(
        { page: 1, limit: 10 },
        'editor',
        'user-1'
      );

      expect(result.success).toBe(true);
      expect(result.data?.content).toHaveLength(1);
      expect(result.data?.content[0]?.status).toBe('published');
    });

    it('should handle search errors', async () => {
      mockContentRepository.search.mockRejectedValue(new Error('Database error'));

      const result = await contentService.getContent(
        { page: 1, limit: 10 },
        'administrator',
        'admin-user'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONTENT_FETCH_ERROR');
    });
  });

  describe('getContentById', () => {
    it('should return content for admin', async () => {
      mockContentRepository.findById.mockResolvedValue(mockContent);

      const result = await contentService.getContentById('content-1', 'administrator', 'admin-user');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockContent);
    });

    it('should return content for author', async () => {
      mockContentRepository.findById.mockResolvedValue(mockContent);

      const result = await contentService.getContentById('content-1', 'editor', 'user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockContent);
    });

    it('should deny access to other users draft content', async () => {
      mockContentRepository.findById.mockResolvedValue(mockContent);

      const result = await contentService.getContentById('content-1', 'editor', 'other-user');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ACCESS_DENIED');
    });

    it('should allow access to published content', async () => {
      const publishedContent = { ...mockContent, status: 'published' as const };
      mockContentRepository.findById.mockResolvedValue(publishedContent);

      const result = await contentService.getContentById('content-1', 'editor', 'other-user');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(publishedContent);
    });

    it('should return not found for non-existent content', async () => {
      mockContentRepository.findById.mockResolvedValue(null);

      const result = await contentService.getContentById('non-existent', 'administrator', 'admin-user');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONTENT_NOT_FOUND');
    });
  });

  describe('getContentBySlug', () => {
    it('should return published content by slug', async () => {
      const publishedContent = { ...mockContent, status: 'published' as const };
      mockContentRepository.findBySlug.mockResolvedValue(publishedContent);

      const result = await contentService.getContentBySlug('test-content');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(publishedContent);
    });

    it('should not return draft content by slug', async () => {
      mockContentRepository.findBySlug.mockResolvedValue(mockContent);

      const result = await contentService.getContentBySlug('test-content');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONTENT_NOT_FOUND');
    });

    it('should return not found for non-existent slug', async () => {
      mockContentRepository.findBySlug.mockResolvedValue(null);

      const result = await contentService.getContentBySlug('non-existent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONTENT_NOT_FOUND');
    });
  });

  describe('createContent', () => {
    const createData: CreateContentData = {
      title: 'New Content',
      body: 'New content body',
      templateId: 'template-1',
      metadata: { tags: ['new'] },
      status: 'draft',
    };

    it('should create content successfully', async () => {
      mockTemplateRepository.findById.mockResolvedValue(mockTemplate);
      mockContentRepository.findBySlug.mockResolvedValue(null);
      mockContentRepository.create.mockResolvedValue(mockContent);

      const result = await contentService.createContent(createData, 'user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockContent);
      expect(mockContentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: createData.title,
          body: createData.body,
          template_id: createData.templateId,
          author_id: 'user-1',
          status: 'draft',
          slug: 'new-content',
        })
      );
    });

    it('should validate required fields', async () => {
      const invalidData = { title: '', body: '', templateId: '' };

      const result = await contentService.createContent(invalidData, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_FIELDS');
    });

    it('should validate template exists and is active', async () => {
      mockTemplateRepository.findById.mockResolvedValue(null);

      const result = await contentService.createContent(createData, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TEMPLATE');
    });

    it('should validate template is active', async () => {
      const inactiveTemplate = { ...mockTemplate, isActive: false };
      mockTemplateRepository.findById.mockResolvedValue(inactiveTemplate);

      const result = await contentService.createContent(createData, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TEMPLATE');
    });

    it('should prevent duplicate slugs', async () => {
      mockTemplateRepository.findById.mockResolvedValue(mockTemplate);
      mockContentRepository.findBySlug.mockResolvedValue(mockContent);

      const result = await contentService.createContent(createData, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SLUG_EXISTS');
    });

    it('should set publishedAt when creating published content', async () => {
      const publishedData = { ...createData, status: 'published' as const };
      mockTemplateRepository.findById.mockResolvedValue(mockTemplate);
      mockContentRepository.findBySlug.mockResolvedValue(null);
      mockContentRepository.create.mockResolvedValue(mockContent);

      await contentService.createContent(publishedData, 'user-1');

      expect(mockContentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          published_at: expect.any(Date),
        })
      );
    });
  });

  describe('updateContent', () => {
    const updateData: UpdateContentData = {
      title: 'Updated Content',
      body: 'Updated body',
      metadata: { tags: ['updated'] },
    };

    it('should update content as admin', async () => {
      const updatedContent = { ...mockContent, ...updateData };
      mockContentRepository.findById.mockResolvedValue(mockContent);
      mockContentRepository.update.mockResolvedValue(updatedContent);

      const result = await contentService.updateContent('content-1', updateData, 'administrator', 'admin-user');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedContent);
    });

    it('should update content as author', async () => {
      const updatedContent = { ...mockContent, ...updateData };
      mockContentRepository.findById.mockResolvedValue(mockContent);
      mockContentRepository.update.mockResolvedValue(updatedContent);

      const result = await contentService.updateContent('content-1', updateData, 'editor', 'user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedContent);
    });

    it('should deny access to other users content', async () => {
      mockContentRepository.findById.mockResolvedValue(mockContent);

      const result = await contentService.updateContent('content-1', updateData, 'editor', 'other-user');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ACCESS_DENIED');
    });

    it('should return not found for non-existent content', async () => {
      mockContentRepository.findById.mockResolvedValue(null);

      const result = await contentService.updateContent('non-existent', updateData, 'administrator', 'admin-user');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONTENT_NOT_FOUND');
    });

    it('should create version before updating published content', async () => {
      const publishedContent = { ...mockContent, status: 'published' as const };
      mockContentRepository.findById.mockResolvedValue(publishedContent);
      mockContentRepository.createVersion.mockResolvedValue({} as any);
      mockContentRepository.update.mockResolvedValue(publishedContent);

      await contentService.updateContent('content-1', updateData, 'administrator', 'admin-user');

      expect(mockContentRepository.createVersion).toHaveBeenCalledWith('content-1', 'admin-user');
    });

    it('should update slug when title changes', async () => {
      const titleUpdate = { title: 'New Title' };
      mockContentRepository.findById.mockResolvedValue(mockContent);
      mockContentRepository.findBySlug.mockResolvedValue(null);
      mockContentRepository.update.mockResolvedValue(mockContent);

      await contentService.updateContent('content-1', titleUpdate, 'administrator', 'admin-user');

      expect(mockContentRepository.update).toHaveBeenCalledWith(
        'content-1',
        expect.objectContaining({
          title: 'New Title',
          slug: 'new-title',
        })
      );
    });

    it('should prevent duplicate slugs when updating title', async () => {
      const titleUpdate = { title: 'Existing Title' };
      const existingContent = { ...mockContent, id: 'other-content' };
      
      mockContentRepository.findById.mockResolvedValue(mockContent);
      mockContentRepository.findBySlug.mockResolvedValue(existingContent);

      const result = await contentService.updateContent('content-1', titleUpdate, 'administrator', 'admin-user');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SLUG_EXISTS');
    });
  });

  describe('deleteContent', () => {
    it('should delete content as admin', async () => {
      mockContentRepository.findById.mockResolvedValue(mockContent);
      mockContentRepository.delete.mockResolvedValue(true);

      const result = await contentService.deleteContent('content-1', 'administrator', 'admin-user');

      expect(result.success).toBe(true);
      expect(mockContentRepository.delete).toHaveBeenCalledWith('content-1');
    });

    it('should delete content as author', async () => {
      mockContentRepository.findById.mockResolvedValue(mockContent);
      mockContentRepository.delete.mockResolvedValue(true);

      const result = await contentService.deleteContent('content-1', 'editor', 'user-1');

      expect(result.success).toBe(true);
    });

    it('should deny access to other users content', async () => {
      mockContentRepository.findById.mockResolvedValue(mockContent);

      const result = await contentService.deleteContent('content-1', 'editor', 'other-user');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ACCESS_DENIED');
    });

    it('should return not found for non-existent content', async () => {
      mockContentRepository.findById.mockResolvedValue(null);

      const result = await contentService.deleteContent('non-existent', 'administrator', 'admin-user');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONTENT_NOT_FOUND');
    });
  });

  describe('publishContent', () => {
    it('should publish content as admin', async () => {
      const publishedContent = { ...mockContent, status: 'published' as const };
      mockContentRepository.findById.mockResolvedValue(mockContent);
      mockContentRepository.createVersion.mockResolvedValue({} as any);
      mockContentRepository.publish.mockResolvedValue(publishedContent);

      const result = await contentService.publishContent('content-1', 'administrator', 'admin-user');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('published');
      expect(mockContentRepository.createVersion).toHaveBeenCalledWith('content-1', 'admin-user');
    });

    it('should deny access to other users content', async () => {
      mockContentRepository.findById.mockResolvedValue(mockContent);

      const result = await contentService.publishContent('content-1', 'editor', 'other-user');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ACCESS_DENIED');
    });
  });

  describe('unpublishContent', () => {
    it('should unpublish content as admin', async () => {
      const unpublishedContent = { ...mockContent, status: 'draft' as const };
      mockContentRepository.findById.mockResolvedValue(mockContent);
      mockContentRepository.unpublish.mockResolvedValue(unpublishedContent);

      const result = await contentService.unpublishContent('content-1', 'administrator', 'admin-user');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('draft');
    });
  });

  describe('archiveContent', () => {
    it('should archive content as admin', async () => {
      const archivedContent = { ...mockContent, status: 'archived' as const };
      mockContentRepository.findById.mockResolvedValue(mockContent);
      mockContentRepository.archive.mockResolvedValue(archivedContent);

      const result = await contentService.archiveContent('content-1', 'administrator', 'admin-user');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('archived');
    });
  });

  describe('getContentVersions', () => {
    it('should return content versions for admin', async () => {
      const mockVersions = [
        {
          id: 'version-1',
          contentId: 'content-1',
          version: 1,
          title: 'Version 1',
          body: 'Version 1 body',
          metadata: {},
          createdAt: new Date(),
          createdBy: 'user-1',
        },
      ];

      mockContentRepository.findById.mockResolvedValue(mockContent);
      mockContentRepository.getVersions.mockResolvedValue(mockVersions);

      const result = await contentService.getContentVersions('content-1', 'administrator', 'admin-user');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockVersions);
    });

    it('should deny access to other users content versions', async () => {
      mockContentRepository.findById.mockResolvedValue(mockContent);

      const result = await contentService.getContentVersions('content-1', 'editor', 'other-user');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ACCESS_DENIED');
    });
  });

  describe('restoreContentVersion', () => {
    it('should restore content version as admin', async () => {
      const restoredContent = { ...mockContent, title: 'Restored Title' };
      mockContentRepository.findById.mockResolvedValue(mockContent);
      mockContentRepository.restoreVersion.mockResolvedValue(restoredContent);

      const result = await contentService.restoreContentVersion('content-1', 1, 'administrator', 'admin-user');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(restoredContent);
      expect(mockContentRepository.restoreVersion).toHaveBeenCalledWith('content-1', 1, 'admin-user');
    });

    it('should return error for non-existent version', async () => {
      mockContentRepository.findById.mockResolvedValue(mockContent);
      mockContentRepository.restoreVersion.mockResolvedValue(null);

      const result = await contentService.restoreContentVersion('content-1', 999, 'administrator', 'admin-user');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VERSION_NOT_FOUND');
    });
  });

  describe('generateSlug', () => {
    it('should generate proper slugs', async () => {
      const service = contentService as any;
      
      expect(service.generateSlug('Test Title')).toBe('test-title');
      expect(service.generateSlug('Title with Special Characters!')).toBe('title-with-special-characters');
      expect(service.generateSlug('Multiple   Spaces')).toBe('multiple-spaces');
      expect(service.generateSlug('Title-with-hyphens')).toBe('title-with-hyphens');
      expect(service.generateSlug('  Leading and trailing spaces  ')).toBe('leading-and-trailing-spaces');
    });
  });
});