import { PublicService } from '../../services/PublicService';
import { ContentService } from '../../services/ContentService';
import { DocumentService } from '../../services/DocumentService';
import { FolderService } from '../../services/FolderService';
import { TemplateService } from '../../services/TemplateService';

// Mock the services
jest.mock('../../services/ContentService');
jest.mock('../../services/DocumentService');
jest.mock('../../services/FolderService');
jest.mock('../../services/TemplateService');

describe('PublicService', () => {
  let publicService: PublicService;
  let mockContentService: jest.Mocked<ContentService>;
  let mockDocumentService: jest.Mocked<DocumentService>;
  let mockFolderService: jest.Mocked<FolderService>;
  let mockTemplateService: jest.Mocked<TemplateService>;

  beforeEach(() => {
    publicService = new PublicService();
    
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

    (publicService as any).contentService = mockContentService;
    (publicService as any).documentService = mockDocumentService;
    (publicService as any).folderService = mockFolderService;
    (publicService as any).templateService = mockTemplateService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublishedContent', () => {
    it('should return published content successfully', async () => {
      const mockContent = {
        id: '1',
        title: 'Test Page',
        slug: 'test-page',
        body: 'content body',
        templateId: 'template-1',
        authorId: 'user-1',
        status: 'published' as const,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };

      mockContentService.getContentBySlug.mockResolvedValue({
        success: true,
        data: mockContent,
      });

      const result = await publicService.getPublishedContent('test-page');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockContent);
      expect(mockContentService.getContentBySlug).toHaveBeenCalledWith('test-page');
    });

    it('should return error for non-published content', async () => {
      const mockContent = {
        id: '1',
        title: 'Test Page',
        slug: 'test-page',
        body: 'content body',
        templateId: 'template-1',
        authorId: 'user-1',
        status: 'draft' as const,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };

      mockContentService.getContentBySlug.mockResolvedValue({
        success: true,
        data: mockContent,
      });

      const result = await publicService.getPublishedContent('test-page');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONTENT_NOT_FOUND');
    });

    it('should return error for non-existent content', async () => {
      mockContentService.getContentBySlug.mockResolvedValue({
        success: false,
        error: { code: 'CONTENT_NOT_FOUND', message: 'Content not found' },
      });

      const result = await publicService.getPublishedContent('non-existent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONTENT_NOT_FOUND');
    });
  });

  describe('renderContentPage', () => {
    it('should render content page successfully', async () => {
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
          { id: 'content', name: 'Content', type: 'text' as const, required: true, validation: {} },
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContentService.getContentBySlug.mockResolvedValue({
        success: true,
        data: mockContent,
      });
      mockTemplateService.getTemplateById.mockResolvedValue({
        success: true,
        data: mockTemplate,
      });

      const result = await publicService.renderContentPage('test-page');

      expect(result.success).toBe(true);
      expect(result.data?.html).toContain('<html>');
      expect(result.data?.accessibilityScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle plain text content body', async () => {
      const mockContent = {
        id: '1',
        title: 'Test Page',
        slug: 'test-page',
        body: 'Plain text content',
        templateId: 'template-1',
        status: 'published' as const,
        publishedAt: new Date(),
        metadata: {},
      };

      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        htmlStructure: '<html><body><main><div data-field="content"></div></main></body></html>',
        cssStyles: '',
        accessibilityFeatures: {
          skipLinks: false,
          headingStructure: false,
          altTextRequired: false,
          colorContrastCompliant: false,
        },
        contentFields: [
          { id: 'content', name: 'Content', type: 'text' as const, required: true, validation: {} },
        ],
      };

      mockContentService.getContentBySlug.mockResolvedValue({
        success: true,
        data: mockContent,
      });
      mockTemplateService.getTemplateById.mockResolvedValue({
        success: true,
        data: mockTemplate,
      });

      const result = await publicService.renderContentPage('test-page');

      expect(result.success).toBe(true);
      expect(result.data?.html).toContain('<html>');
    });

    it('should return error for template not found', async () => {
      const mockContent = {
        id: '1',
        title: 'Test Page',
        slug: 'test-page',
        body: '{"content": "Test content"}',
        templateId: 'template-1',
        status: 'published' as const,
        publishedAt: new Date(),
        metadata: {},
      };

      mockContentService.getContentBySlug.mockResolvedValue({
        success: true,
        data: mockContent,
      });
      mockTemplateService.getTemplateById.mockResolvedValue({
        success: false,
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' },
      });

      const result = await publicService.renderContentPage('test-page');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TEMPLATE_ERROR');
    });
  });

  describe('getPublicDocument', () => {
    it('should return public document successfully', async () => {
      const mockDocument = {
        id: 'doc-1',
        originalName: 'test.pdf',
        folderId: 'folder-1',
        mimeType: 'application/pdf',
        size: 1024,
        createdAt: new Date(),
        metadata: {},
      };

      const mockFolder = {
        id: 'folder-1',
        name: 'Public Folder',
        isPublic: true,
      };

      mockDocumentService.getDocumentById.mockResolvedValue({
        success: true,
        data: mockDocument,
      });
      mockFolderService.getFolderById.mockResolvedValue({
        success: true,
        data: mockFolder,
      });

      const result = await publicService.getPublicDocument('doc-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDocument);
    });

    it('should return error for document in private folder', async () => {
      const mockDocument = {
        id: 'doc-1',
        folderId: 'folder-1',
      };

      const mockFolder = {
        id: 'folder-1',
        name: 'Private Folder',
        isPublic: false,
      };

      mockDocumentService.getDocumentById.mockResolvedValue({
        success: true,
        data: mockDocument,
      });
      mockFolderService.getFolderById.mockResolvedValue({
        success: true,
        data: mockFolder,
      });

      const result = await publicService.getPublicDocument('doc-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DOCUMENT_NOT_FOUND');
    });
  });

  describe('listAllPublishedContent', () => {
    it('should list all published content successfully', async () => {
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

      mockContentService.getContent.mockResolvedValue({
        success: true,
        data: {
          content: mockContent,
          pagination: { page: 1, limit: 1000, total: 2, totalPages: 1 },
        },
      });

      const result = await publicService.listAllPublishedContent();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]).toEqual({
        id: '1',
        title: 'Page 1',
        slug: 'page-1',
        publishedAt: new Date('2023-01-01'),
        metadata: {},
      });
    });
  });

  describe('getPublicFolderDocuments', () => {
    it('should return public folder documents successfully', async () => {
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
        {
          id: 'doc-2',
          originalName: 'test2.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          createdAt: new Date(),
          metadata: {},
        },
      ];

      mockFolderService.getFolderById.mockResolvedValue({
        success: true,
        data: mockFolder,
      });
      mockDocumentService.getDocuments.mockResolvedValue({
        success: true,
        data: {
          documents: mockDocuments,
          pagination: { page: 1, limit: 1000, total: 2, totalPages: 1 },
        },
      });

      const result = await publicService.getPublicFolderDocuments('folder-1');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('folder-1');
      expect(result.data?.name).toBe('Public Folder');
      expect(result.data?.documents).toHaveLength(2);
    });

    it('should return error for private folder', async () => {
      const mockFolder = {
        id: 'folder-1',
        name: 'Private Folder',
        isPublic: false,
      };

      mockFolderService.getFolderById.mockResolvedValue({
        success: true,
        data: mockFolder,
      });

      const result = await publicService.getPublicFolderDocuments('folder-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FOLDER_NOT_FOUND');
    });
  });

  describe('validatePageAccessibility', () => {
    it('should validate page accessibility successfully', async () => {
      const mockContent = {
        id: '1',
        title: 'Test Page',
        slug: 'test-page',
        body: '{"content": "Test content"}',
        templateId: 'template-1',
        status: 'published' as const,
        publishedAt: new Date(),
        metadata: {},
      };

      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        htmlStructure: '<html><head><title>Test</title></head><body><main><h1>Test</h1><div data-field="content"></div></main></body></html>',
        cssStyles: '',
        accessibilityFeatures: {
          skipLinks: true,
          headingStructure: true,
          altTextRequired: true,
          colorContrastCompliant: true,
        },
        contentFields: [
          { id: 'content', name: 'Content', type: 'text' as const, required: true, validation: {} },
        ],
      };

      mockContentService.getContentBySlug.mockResolvedValue({
        success: true,
        data: mockContent,
      });
      mockTemplateService.getTemplateById.mockResolvedValue({
        success: true,
        data: mockTemplate,
      });

      const result = await publicService.validatePageAccessibility('test-page');

      expect(result.success).toBe(true);
      expect(result.data?.score).toBeGreaterThanOrEqual(0);
      expect(result.data?.issues).toBeDefined();
    });
  });

  describe('generateStructuredData', () => {
    it('should generate structured data for SEO', () => {
      const mockContent = {
        id: '1',
        title: 'Test Page',
        slug: 'test-page',
        publishedAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-02T10:00:00Z'),
        metadata: {
          description: 'Test description',
          keywords: 'test, page',
          siteName: 'Test Council',
        },
      };

      const structuredData = publicService.generateStructuredData(mockContent as any);

      expect(structuredData['@context']).toBe('https://schema.org');
      expect(structuredData['@type']).toBe('WebPage');
      expect(structuredData.name).toBe('Test Page');
      expect(structuredData.description).toBe('Test description');
      expect(structuredData.keywords).toBe('test, page');
      expect(structuredData.datePublished).toBe('2023-01-01T10:00:00.000Z');
      expect(structuredData.dateModified).toBe('2023-01-02T10:00:00.000Z');
      expect(structuredData.isPartOf.name).toBe('Test Council');
    });

    it('should use defaults for missing metadata', () => {
      const mockContent = {
        id: '1',
        title: 'Test Page',
        slug: 'test-page',
        publishedAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-02T10:00:00Z'),
        metadata: {},
      };

      const structuredData = publicService.generateStructuredData(mockContent as any);

      expect(structuredData.description).toBe('Test Page');
      expect(structuredData.keywords).toBe('');
      expect(structuredData.isPartOf.name).toBe('Council Website');
    });
  });
});