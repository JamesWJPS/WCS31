import request from 'supertest';
import express from 'express';
import publicRoutes from '../../routes/public';
import { ContentService } from '../../services/ContentService';
import { DocumentService } from '../../services/DocumentService';
import { FolderService } from '../../services/FolderService';
import { TemplateService } from '../../services/TemplateService';

// Mock the services
jest.mock('../../services/ContentService');
jest.mock('../../services/DocumentService');
jest.mock('../../services/FolderService');
jest.mock('../../services/TemplateService');

describe('Public Routes Integration', () => {
  let app: express.Application;
  let mockContentService: jest.Mocked<ContentService>;
  let mockDocumentService: jest.Mocked<DocumentService>;
  let mockFolderService: jest.Mocked<FolderService>;
  let mockTemplateService: jest.Mocked<TemplateService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', publicRoutes);

    mockContentService = ContentService.prototype as jest.Mocked<ContentService>;
    mockDocumentService = DocumentService.prototype as jest.Mocked<DocumentService>;
    mockFolderService = FolderService.prototype as jest.Mocked<FolderService>;
    mockTemplateService = TemplateService.prototype as jest.Mocked<TemplateService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /sitemap.xml', () => {
    it('should generate XML sitemap', async () => {
      const mockContent = [
        {
          id: '1',
          title: 'Page 1',
          slug: 'page-1',
          publishedAt: new Date('2023-01-01'),
          metadata: {},
        },
      ];

      mockContentService.getContent = jest.fn().mockResolvedValue({
        success: true,
        data: {
          content: mockContent,
          pagination: { page: 1, limit: 1000, total: 1, totalPages: 1 },
        },
      });

      const response = await request(app)
        .get('/sitemap.xml')
        .expect(200);

      expect(response.headers['content-type']).toBe('application/xml; charset=utf-8');
      expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(response.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(response.text).toContain('<loc>http://127.0.0.1/page/page-1</loc>');
    });

    it('should handle content service errors', async () => {
      mockContentService.getContent = jest.fn().mockResolvedValue({
        success: false,
        error: { code: 'CONTENT_FETCH_ERROR', message: 'Failed to fetch content' },
      });

      const response = await request(app)
        .get('/sitemap.xml')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SITEMAP_ERROR');
    });
  });

  describe('GET /robots.txt', () => {
    it('should generate robots.txt', async () => {
      const response = await request(app)
        .get('/robots.txt')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(response.text).toContain('User-agent: *');
      expect(response.text).toContain('Allow: /');
      expect(response.text).toContain('Disallow: /api/');
      expect(response.text).toContain('Sitemap: http://127.0.0.1/sitemap.xml');
    });
  });

  describe('GET /page/:slug', () => {
    it('should render published content page', async () => {
      const mockContent = {
        id: '1',
        title: 'Test Page',
        slug: 'test-page',
        body: '{"content": "Test content"}',
        templateId: 'template-1',
        status: 'published' as const,
        publishedAt: new Date(),
        metadata: { description: 'Test description' },
      };

      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        htmlStructure: '<html lang="en"><head><title data-field="title"></title></head><body><main><div data-field="content"></div></main></body></html>',
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
      };

      mockContentService.getContentBySlug = jest.fn().mockResolvedValue({
        success: true,
        data: mockContent,
      });
      mockTemplateService.getTemplateById = jest.fn().mockResolvedValue({
        success: true,
        data: mockTemplate,
      });

      const response = await request(app)
        .get('/page/test-page')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(response.text).toContain('<html');
      expect(response.text).toContain('Test Page');
    });

    it('should return 404 for non-existent page', async () => {
      mockContentService.getContentBySlug = jest.fn().mockResolvedValue({
        success: false,
        error: { code: 'CONTENT_NOT_FOUND', message: 'Content not found' },
      });

      const response = await request(app)
        .get('/page/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAGE_NOT_FOUND');
    });
  });

  describe('GET /api/content/:slug', () => {
    it('should return content metadata', async () => {
      const mockContent = {
        id: '1',
        title: 'Test Page',
        slug: 'test-page',
        templateId: 'template-1',
        publishedAt: new Date('2023-01-01'),
        metadata: { description: 'Test description' },
      };

      mockContentService.getContentBySlug = jest.fn().mockResolvedValue({
        success: true,
        data: mockContent,
      });

      const response = await request(app)
        .get('/api/content/test-page')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        id: '1',
        title: 'Test Page',
        slug: 'test-page',
        metadata: { description: 'Test description' },
        publishedAt: '2023-01-01T00:00:00.000Z',
        templateId: 'template-1',
      });
    });

    it('should return 404 for non-existent content', async () => {
      mockContentService.getContentBySlug = jest.fn().mockResolvedValue({
        success: false,
        error: { code: 'CONTENT_NOT_FOUND', message: 'Content not found' },
      });

      const response = await request(app)
        .get('/api/content/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONTENT_NOT_FOUND');
    });
  });

  describe('GET /api/content', () => {
    it('should list published content with pagination', async () => {
      const mockContent = [
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
      ];

      mockContentService.getContent = jest.fn().mockResolvedValue({
        success: true,
        data: {
          content: mockContent,
          pagination: {
            page: 1,
            limit: 50,
            total: 2,
            totalPages: 1,
          },
        },
      });

      const response = await request(app)
        .get('/api/content?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toHaveLength(2);
      expect(response.body.data.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      });
    });

    it('should handle content service errors', async () => {
      mockContentService.getContent = jest.fn().mockResolvedValue({
        success: false,
        error: { code: 'CONTENT_FETCH_ERROR', message: 'Failed to fetch content' },
      });

      const response = await request(app)
        .get('/api/content')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONTENT_FETCH_ERROR');
    });
  });

  describe('GET /document/:documentId', () => {
    it('should serve public document', async () => {
      const mockDocument = {
        id: 'doc-1',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        folderId: 'folder-1',
      };

      const mockFolder = {
        id: 'folder-1',
        name: 'Public Folder',
        isPublic: true,
      };

      const mockFileStream = {
        pipe: jest.fn(),
      };

      mockDocumentService.getDocumentById = jest.fn().mockResolvedValue({
        success: true,
        data: mockDocument,
      });
      mockFolderService.getFolderById = jest.fn().mockResolvedValue({
        success: true,
        data: mockFolder,
      });
      mockDocumentService.downloadDocument = jest.fn().mockResolvedValue({
        success: true,
        data: mockFileStream,
      });

      const response = await request(app)
        .get('/document/doc-1');

      expect(mockDocumentService.getDocumentById).toHaveBeenCalledWith('doc-1', 'read-only', 'public');
      expect(mockFolderService.getFolderById).toHaveBeenCalledWith('folder-1', 'read-only', 'public');
      expect(mockDocumentService.downloadDocument).toHaveBeenCalledWith('doc-1', 'read-only', 'public');
    });

    it('should return 404 for document in private folder', async () => {
      const mockDocument = {
        id: 'doc-1',
        folderId: 'folder-1',
      };

      const mockFolder = {
        id: 'folder-1',
        name: 'Private Folder',
        isPublic: false,
      };

      mockDocumentService.getDocumentById = jest.fn().mockResolvedValue({
        success: true,
        data: mockDocument,
      });
      mockFolderService.getFolderById = jest.fn().mockResolvedValue({
        success: true,
        data: mockFolder,
      });

      const response = await request(app)
        .get('/document/doc-1')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });

    it('should return 404 for non-existent document', async () => {
      mockDocumentService.getDocumentById = jest.fn().mockResolvedValue({
        success: false,
        error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' },
      });

      const response = await request(app)
        .get('/document/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });
  });

  describe('GET /api/folder/:folderId/documents', () => {
    it('should list documents in public folder', async () => {
      const mockFolder = {
        id: 'folder-1',
        name: 'Public Folder',
        isPublic: true,
      };

      const mockDocuments = [
        {
          id: 'doc-1',
          originalName: 'test1.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          createdAt: new Date(),
          metadata: {},
        },
      ];

      mockFolderService.getFolderById = jest.fn().mockResolvedValue({
        success: true,
        data: mockFolder,
      });
      mockDocumentService.getDocuments = jest.fn().mockResolvedValue({
        success: true,
        data: {
          documents: mockDocuments,
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      });

      const response = await request(app)
        .get('/api/folder/folder-1/documents')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.folder).toEqual({
        id: 'folder-1',
        name: 'Public Folder',
      });
      expect(response.body.data.documents).toHaveLength(1);
    });

    it('should return 404 for private folder', async () => {
      const mockFolder = {
        id: 'folder-1',
        name: 'Private Folder',
        isPublic: false,
      };

      mockFolderService.getFolderById = jest.fn().mockResolvedValue({
        success: true,
        data: mockFolder,
      });

      const response = await request(app)
        .get('/api/folder/folder-1/documents')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FOLDER_NOT_FOUND');
    });
  });
});