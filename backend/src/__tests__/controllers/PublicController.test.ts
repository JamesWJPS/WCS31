import { Request, Response } from 'express';
import { PublicController } from '../../controllers/PublicController';
import { ContentService } from '../../services/ContentService';
import { DocumentService } from '../../services/DocumentService';
import { FolderService } from '../../services/FolderService';
import { TemplateService } from '../../services/TemplateService';

// Mock the services
jest.mock('../../services/ContentService');
jest.mock('../../services/DocumentService');
jest.mock('../../services/FolderService');
jest.mock('../../services/TemplateService');

describe('PublicController', () => {
  let publicController: PublicController;
  let mockContentService: jest.Mocked<ContentService>;
  let mockDocumentService: jest.Mocked<DocumentService>;
  let mockFolderService: jest.Mocked<FolderService>;
  let mockTemplateService: jest.Mocked<TemplateService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    publicController = new PublicController();
    
    // Mock the service instances
    mockContentService = {
      getContentBySlug: jest.fn(),
      getContent: jest.fn(),
    } as any;
    
    mockDocumentService = {} as any;
    mockFolderService = {} as any;
    
    mockTemplateService = {
      getTemplateById: jest.fn(),
    } as any;

    (publicController as any).contentService = mockContentService;
    (publicController as any).documentService = mockDocumentService;
    (publicController as any).folderService = mockFolderService;
    (publicController as any).templateService = mockTemplateService;

    mockRequest = {
      params: {},
      query: {},
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost:3001'),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('renderContentPage', () => {
    it('should render published content page successfully', async () => {
      const mockContent = {
        id: '1',
        title: 'Test Page',
        slug: 'test-page',
        body: '{"content": "Test content"}',
        templateId: 'template-1',
        authorId: 'user-1',
        status: 'published' as const,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { description: 'Test description' },
      };

      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        description: 'Test template description',
        htmlStructure: '<html><head><title data-field="title"></title></head><body><main><div data-field="content"></div></main></body></html>',
        cssStyles: 'body { font-family: Arial; }',
        accessibilityFeatures: {
          skipLinks: true,
          headingStructure: true,
          altTextRequired: true,
          colorContrastCompliant: true,
        },
        contentFields: [
          { id: 'title', name: 'Title', type: 'text' as const, required: true, validation: {} },
          { id: 'content', name: 'Content', type: 'rich-text' as const, required: true, validation: {} },
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { slug: 'test-page' };
      mockContentService.getContentBySlug.mockResolvedValue({
        success: true,
        data: mockContent,
      });
      mockTemplateService.getTemplateById = jest.fn().mockResolvedValue({
        success: true,
        data: mockTemplate,
      });

      await publicController.renderContentPage(mockRequest as Request, mockResponse as Response);

      expect(mockContentService.getContentBySlug).toHaveBeenCalledWith('test-page');
      expect(mockTemplateService.getTemplateById).toHaveBeenCalledWith('template-1');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should return 404 for non-existent content', async () => {
      mockRequest.params = { slug: 'non-existent' };
      mockContentService.getContentBySlug.mockResolvedValue({
        success: false,
        error: { code: 'CONTENT_NOT_FOUND', message: 'Content not found' },
      });

      await publicController.renderContentPage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'PAGE_NOT_FOUND',
          message: 'Page not found',
        },
      });
    });

    it('should return 500 for template errors', async () => {
      const mockContent = {
        id: '1',
        title: 'Test Page',
        slug: 'test-page',
        body: '{"content": "Test content"}',
        templateId: 'template-1',
        authorId: 'user-1',
        status: 'published' as const,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };

      mockRequest.params = { slug: 'test-page' };
      mockContentService.getContentBySlug.mockResolvedValue({
        success: true,
        data: mockContent,
      });
      mockTemplateService.getTemplateById = jest.fn().mockResolvedValue({
        success: false,
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' },
      });

      await publicController.renderContentPage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TEMPLATE_ERROR',
          message: 'Template not found',
        },
      });
    });
  });

  describe('getContentMetadata', () => {
    it('should return content metadata for published content', async () => {
      const mockContent = {
        id: '1',
        title: 'Test Page',
        slug: 'test-page',
        body: 'content body',
        templateId: 'template-1',
        authorId: 'user-1',
        status: 'published' as const,
        publishedAt: new Date('2023-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { description: 'Test description' },
      };

      mockRequest.params = { slug: 'test-page' };
      mockContentService.getContentBySlug.mockResolvedValue({
        success: true,
        data: mockContent,
      });

      await publicController.getContentMetadata(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: '1',
          title: 'Test Page',
          slug: 'test-page',
          metadata: { description: 'Test description' },
          publishedAt: new Date('2023-01-01'),
          templateId: 'template-1',
        },
      });
    });

    it('should return 404 for non-existent content', async () => {
      mockRequest.params = { slug: 'non-existent' };
      mockContentService.getContentBySlug.mockResolvedValue({
        success: false,
        error: { code: 'CONTENT_NOT_FOUND', message: 'Content not found' },
      });

      await publicController.getContentMetadata(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Content not found',
        },
      });
    });
  });

  describe('listPublishedContent', () => {
    it('should list published content with pagination', async () => {
      const mockContent = [
        {
          id: '1',
          title: 'Page 1',
          slug: 'page-1',
          body: 'content 1',
          templateId: 'template-1',
          authorId: 'user-1',
          status: 'published' as const,
          publishedAt: new Date('2023-01-01'),
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        },
        {
          id: '2',
          title: 'Page 2',
          slug: 'page-2',
          body: 'content 2',
          templateId: 'template-1',
          authorId: 'user-1',
          status: 'published' as const,
          publishedAt: new Date('2023-01-02'),
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        },
      ];

      mockRequest.query = { page: '1', limit: '10' };
      mockContentService.getContent.mockResolvedValue({
        success: true,
        data: {
          content: mockContent,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
          },
        },
      });

      await publicController.listPublishedContent(mockRequest as Request, mockResponse as Response);

      expect(mockContentService.getContent).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          status: 'published',
          sortBy: 'publishedAt',
          sortOrder: 'desc',
        },
        'administrator',
        'system'
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          content: [
            {
              id: '1',
              title: 'Page 1',
              slug: 'page-1',
              publishedAt: new Date('2023-01-01'),
              metadata: {},
            },
            {
              id: '2',
              title: 'Page 2',
              slug: 'page-2',
              publishedAt: new Date('2023-01-02'),
              metadata: {},
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
          },
        },
      });
    });
  });

  describe('getPublicDocument', () => {
    it('should return not implemented status', async () => {
      mockRequest.params = { documentId: 'doc-1' };

      await publicController.getPublicDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Document serving not yet implemented',
        },
      });
    });
  });

  describe('generateSitemap', () => {
    it('should generate XML sitemap successfully', async () => {
      const mockContent = [
        {
          id: '1',
          title: 'Page 1',
          slug: 'page-1',
          body: 'content 1',
          templateId: 'template-1',
          authorId: 'user-1',
          status: 'published' as const,
          publishedAt: new Date('2023-01-01'),
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        },
      ];

      mockContentService.getContent.mockResolvedValue({
        success: true,
        data: {
          content: mockContent,
          pagination: { page: 1, limit: 1000, total: 1, totalPages: 1 },
        },
      });

      await publicController.generateSitemap(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/xml');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('<?xml version="1.0" encoding="UTF-8"?>')
      );
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('<loc>http://localhost:3001/page/page-1</loc>')
      );
    });
  });

  describe('generateRobotsTxt', () => {
    it('should generate robots.txt successfully', async () => {
      await publicController.generateRobotsTxt(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('User-agent: *')
      );
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('Sitemap: http://localhost:3001/sitemap.xml')
      );
    });
  });
});