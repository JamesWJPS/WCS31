import { Request, Response } from 'express';
import { ContentController } from '../../controllers/ContentController';
import { ContentService } from '../../services/ContentService';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock the ContentService
jest.mock('../../services/ContentService');
const MockedContentService = ContentService as jest.MockedClass<typeof ContentService>;

describe('ContentController', () => {
  let contentController: ContentController;
  let mockContentService: jest.Mocked<ContentService>;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  const mockContent = {
    id: 'content-1',
    title: 'Test Content',
    slug: 'test-content',
    body: 'Test body',
    templateId: 'template-1',
    authorId: 'user-1',
    status: 'draft' as const,
    metadata: { tags: ['test'] },
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockContentService = new MockedContentService() as jest.Mocked<ContentService>;
    contentController = new ContentController();
    (contentController as any).contentService = mockContentService;

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    mockRequest = {
      user: {
        userId: 'user-1',
        username: 'admin',
        role: 'administrator',
      },
      params: {},
      query: {},
      body: {},
    };
  });

  describe('getContent', () => {
    it('should return content list successfully', async () => {
      const mockServiceResponse = {
        success: true,
        data: {
          content: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        },
      };

      mockContentService.getContent.mockResolvedValue(mockServiceResponse);

      await contentController.getContent(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockContentService.getContent).toHaveBeenCalledWith({}, 'administrator', 'user-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });

    it('should parse query parameters correctly', async () => {
      mockRequest.query = {
        page: '2',
        limit: '20',
        query: 'search term',
        status: 'published',
        authorId: 'author-1',
        templateId: 'template-1',
        tags: 'tag1,tag2,tag3',
        dateFrom: '2023-01-01',
        dateTo: '2023-12-31',
        sortBy: 'title',
        sortOrder: 'asc',
      };

      const mockServiceResponse = { success: true, data: { content: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } } };
      mockContentService.getContent.mockResolvedValue(mockServiceResponse);

      await contentController.getContent(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockContentService.getContent).toHaveBeenCalledWith(
        {
          page: 2,
          limit: 20,
          query: 'search term',
          status: 'published',
          authorId: 'author-1',
          templateId: 'template-1',
          tags: ['tag1', 'tag2', 'tag3'],
          dateFrom: '2023-01-01',
          dateTo: '2023-12-31',
          sortBy: 'title',
          sortOrder: 'asc',
        },
        'administrator',
        'user-1'
      );
    });

    it('should handle service errors', async () => {
      const mockServiceResponse = {
        success: false,
        error: { code: 'CONTENT_FETCH_ERROR', message: 'Failed to fetch content' },
      };

      mockContentService.getContent.mockResolvedValue(mockServiceResponse);

      await contentController.getContent(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });

    it('should handle unexpected errors', async () => {
      mockContentService.getContent.mockRejectedValue(new Error('Unexpected error'));

      await contentController.getContent(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('getContentById', () => {
    it('should return content by ID successfully', async () => {
      mockRequest.params = { id: 'content-1' };
      const mockServiceResponse = {
        success: true,
        data: mockContent,
      };

      mockContentService.getContentById.mockResolvedValue(mockServiceResponse);

      await contentController.getContentById(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockContentService.getContentById).toHaveBeenCalledWith('content-1', 'administrator', 'user-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });

    it('should return 400 for missing content ID', async () => {
      mockRequest.params = {};

      await contentController.getContentById(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_CONTENT_ID',
          message: 'Content ID is required',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle not found error', async () => {
      mockRequest.params = { id: 'non-existent' };
      const mockServiceResponse = {
        success: false,
        error: { code: 'CONTENT_NOT_FOUND', message: 'Content not found' },
      };

      mockContentService.getContentById.mockResolvedValue(mockServiceResponse);

      await contentController.getContentById(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });
  });

  describe('getContentBySlug', () => {
    it('should return content by slug successfully', async () => {
      mockRequest.params = { slug: 'test-content' };
      const mockServiceResponse = {
        success: true,
        data: { ...mockContent, slug: 'test-content' },
      };

      mockContentService.getContentBySlug.mockResolvedValue(mockServiceResponse);

      await contentController.getContentBySlug(mockRequest as Request, mockResponse as Response);

      expect(mockContentService.getContentBySlug).toHaveBeenCalledWith('test-content');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });

    it('should return 400 for missing slug', async () => {
      mockRequest.params = {};

      await contentController.getContentBySlug(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_CONTENT_SLUG',
          message: 'Content slug is required',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('createContent', () => {
    it('should create content successfully', async () => {
      const contentData = {
        title: 'New Content',
        body: 'Content body',
        templateId: 'template-1',
      };
      mockRequest.body = contentData;

      const mockServiceResponse = {
        success: true,
        data: { ...mockContent, ...contentData },
      };

      mockContentService.createContent.mockResolvedValue(mockServiceResponse);

      await contentController.createContent(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockContentService.createContent).toHaveBeenCalledWith(contentData, 'user-1');
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });

    it('should handle validation errors', async () => {
      mockRequest.body = {};
      const mockServiceResponse = {
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Required fields missing' },
      };

      mockContentService.createContent.mockResolvedValue(mockServiceResponse);

      await contentController.createContent(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });
  });

  describe('updateContent', () => {
    it('should update content successfully', async () => {
      mockRequest.params = { id: 'content-1' };
      mockRequest.body = { title: 'Updated Title' };

      const mockServiceResponse = {
        success: true,
        data: { ...mockContent, title: 'Updated Title' },
      };

      mockContentService.updateContent.mockResolvedValue(mockServiceResponse);

      await contentController.updateContent(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockContentService.updateContent).toHaveBeenCalledWith(
        'content-1',
        { title: 'Updated Title' },
        'administrator',
        'user-1'
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });

    it('should return 400 for missing content ID', async () => {
      mockRequest.params = {};

      await contentController.updateContent(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_CONTENT_ID',
          message: 'Content ID is required',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle access denied error', async () => {
      mockRequest.params = { id: 'content-1' };
      mockRequest.body = { title: 'Updated Title' };

      const mockServiceResponse = {
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' },
      };

      mockContentService.updateContent.mockResolvedValue(mockServiceResponse);

      await contentController.updateContent(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });
  });

  describe('deleteContent', () => {
    it('should delete content successfully', async () => {
      mockRequest.params = { id: 'content-1' };
      const mockServiceResponse = { success: true };

      mockContentService.deleteContent.mockResolvedValue(mockServiceResponse);

      await contentController.deleteContent(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockContentService.deleteContent).toHaveBeenCalledWith('content-1', 'administrator', 'user-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });

    it('should return 400 for missing content ID', async () => {
      mockRequest.params = {};

      await contentController.deleteContent(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('publishContent', () => {
    it('should publish content successfully', async () => {
      mockRequest.params = { id: 'content-1' };
      const mockServiceResponse = {
        success: true,
        data: { ...mockContent, status: 'published' as const },
      };

      mockContentService.publishContent.mockResolvedValue(mockServiceResponse);

      await contentController.publishContent(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockContentService.publishContent).toHaveBeenCalledWith('content-1', 'administrator', 'user-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });
  });

  describe('unpublishContent', () => {
    it('should unpublish content successfully', async () => {
      mockRequest.params = { id: 'content-1' };
      const mockServiceResponse = {
        success: true,
        data: { ...mockContent, status: 'draft' as const },
      };

      mockContentService.unpublishContent.mockResolvedValue(mockServiceResponse);

      await contentController.unpublishContent(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockContentService.unpublishContent).toHaveBeenCalledWith('content-1', 'administrator', 'user-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });
  });

  describe('archiveContent', () => {
    it('should archive content successfully', async () => {
      mockRequest.params = { id: 'content-1' };
      const mockServiceResponse = {
        success: true,
        data: { ...mockContent, status: 'archived' as const },
      };

      mockContentService.archiveContent.mockResolvedValue(mockServiceResponse);

      await contentController.archiveContent(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockContentService.archiveContent).toHaveBeenCalledWith('content-1', 'administrator', 'user-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });
  });

  describe('getContentPreview', () => {
    it('should return content preview successfully', async () => {
      mockRequest.params = { id: 'content-1' };
      const mockContentData = mockContent;

      const mockServiceResponse = {
        success: true,
        data: mockContent,
      };

      mockContentService.getContentById.mockResolvedValue(mockServiceResponse);

      await contentController.getContentPreview(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockContentService.getContentById).toHaveBeenCalledWith('content-1', 'administrator', 'user-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          content: mockContentData,
          preview: {
            title: mockContentData.title,
            body: mockContentData.body,
            metadata: mockContentData.metadata,
            templateId: mockContentData.templateId,
          },
        },
      });
    });

    it('should handle content not found for preview', async () => {
      mockRequest.params = { id: 'non-existent' };
      const mockServiceResponse = {
        success: false,
        error: { code: 'CONTENT_NOT_FOUND', message: 'Content not found' },
      };

      mockContentService.getContentById.mockResolvedValue(mockServiceResponse);

      await contentController.getContentPreview(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });
  });

  describe('getContentVersions', () => {
    it('should return content versions successfully', async () => {
      mockRequest.params = { id: 'content-1' };
      const mockVersions = [
        { 
          id: 'version-1', 
          contentId: 'content-1',
          version: 1, 
          title: 'Version 1',
          body: 'Version 1 body',
          metadata: {},
          createdAt: new Date(),
          createdBy: 'user-1'
        },
        { 
          id: 'version-2', 
          contentId: 'content-1',
          version: 2, 
          title: 'Version 2',
          body: 'Version 2 body',
          metadata: {},
          createdAt: new Date(),
          createdBy: 'user-1'
        },
      ];

      const mockServiceResponse = {
        success: true,
        data: mockVersions,
      };

      mockContentService.getContentVersions.mockResolvedValue(mockServiceResponse);

      await contentController.getContentVersions(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockContentService.getContentVersions).toHaveBeenCalledWith('content-1', 'administrator', 'user-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });
  });

  describe('restoreContentVersion', () => {
    it('should restore content version successfully', async () => {
      mockRequest.params = { id: 'content-1' };
      mockRequest.body = { version: 1 };

      const mockServiceResponse = {
        success: true,
        data: { ...mockContent, title: 'Restored Content' },
      };

      mockContentService.restoreContentVersion.mockResolvedValue(mockServiceResponse);

      await contentController.restoreContentVersion(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockContentService.restoreContentVersion).toHaveBeenCalledWith('content-1', 1, 'administrator', 'user-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockServiceResponse);
    });

    it('should return 400 for missing version', async () => {
      mockRequest.params = { id: 'content-1' };
      mockRequest.body = {};

      await contentController.restoreContentVersion(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_VERSION',
          message: 'Version number is required',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 400 for invalid version type', async () => {
      mockRequest.params = { id: 'content-1' };
      mockRequest.body = { version: 'invalid' };

      await contentController.restoreContentVersion(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getStatusCodeFromError', () => {
    it('should map error codes to correct HTTP status codes', () => {
      const controller = contentController as any;

      expect(controller.getStatusCodeFromError('MISSING_FIELDS')).toBe(400);
      expect(controller.getStatusCodeFromError('MISSING_CONTENT_ID')).toBe(400);
      expect(controller.getStatusCodeFromError('MISSING_CONTENT_SLUG')).toBe(400);
      expect(controller.getStatusCodeFromError('MISSING_VERSION')).toBe(400);
      expect(controller.getStatusCodeFromError('ACCESS_DENIED')).toBe(403);
      expect(controller.getStatusCodeFromError('CONTENT_NOT_FOUND')).toBe(404);
      expect(controller.getStatusCodeFromError('VERSION_NOT_FOUND')).toBe(404);
      expect(controller.getStatusCodeFromError('SLUG_EXISTS')).toBe(409);
      expect(controller.getStatusCodeFromError('INVALID_TEMPLATE')).toBe(422);
      expect(controller.getStatusCodeFromError('UNKNOWN_ERROR')).toBe(500);
      expect(controller.getStatusCodeFromError()).toBe(500);
    });
  });
});