import { Request, Response } from 'express';
import { DocumentController } from '../../controllers/DocumentController';
import { DocumentService } from '../../services/DocumentService';
import { FileService } from '../../services/FileService';

// Mock services
jest.mock('../../services/DocumentService');
jest.mock('../../services/FileService');

const MockedDocumentService = DocumentService as jest.MockedClass<typeof DocumentService>;
const MockedFileService = FileService as jest.MockedClass<typeof FileService>;

describe('DocumentController', () => {
  let documentController: DocumentController;
  let mockDocumentService: jest.Mocked<DocumentService>;
  let mockFileService: jest.Mocked<FileService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const mockUser = {
    userId: 'user-123',
    username: 'testuser',
    role: 'editor' as const
  };

  const mockDocument = {
    id: 'doc-123',
    filename: 'test-file.pdf',
    originalName: 'test file.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    folderId: 'folder-123',
    uploadedBy: 'user-123',
    createdAt: new Date(),
    metadata: {
      title: 'Test Document',
      description: 'A test document',
      tags: ['test']
    }
  };

  beforeEach(() => {
    // Setup service mocks
    mockDocumentService = {
      getDocumentsForUser: jest.fn(),
      getDocumentsInFolder: jest.fn(),
      updateDocumentMetadata: jest.fn(),
      moveDocument: jest.fn(),
      deleteDocument: jest.fn(),
      searchDocuments: jest.fn(),
    } as any;

    mockFileService = {
      uploadFile: jest.fn(),
      uploadMultipleFiles: jest.fn(),
      checkFileAccess: jest.fn(),
      deleteFile: jest.fn(),
    } as any;

    MockedDocumentService.mockImplementation(() => mockDocumentService);
    MockedFileService.mockImplementation(() => mockFileService);

    documentController = new DocumentController();

    // Setup request and response mocks
    mockRequest = {
      user: mockUser,
      params: {},
      body: {},
      query: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      sendFile: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDocuments', () => {
    it('should get all documents for user', async () => {
      const documents = [mockDocument];
      mockDocumentService.getDocumentsForUser.mockResolvedValue(documents);

      await documentController.getDocuments(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentService.getDocumentsForUser).toHaveBeenCalledWith('user-123', 'editor');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          documents,
          count: 1
        }
      });
    });

    it('should handle service errors', async () => {
      mockDocumentService.getDocumentsForUser.mockRejectedValue(new Error('Service error'));

      await documentController.getDocuments(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Service error',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('getDocument', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'doc-123' };
    });

    it('should get document by ID when user has access', async () => {
      const accessResult = { canAccess: true, document: mockDocument, filePath: '/path/to/file' };
      mockFileService.checkFileAccess.mockResolvedValue(accessResult);

      await documentController.getDocument(mockRequest as Request, mockResponse as Response);

      expect(mockFileService.checkFileAccess).toHaveBeenCalledWith('doc-123', 'user-123', 'editor');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          document: mockDocument
        }
      });
    });

    it('should return 403 when user lacks access', async () => {
      const accessResult = { canAccess: false, document: mockDocument, filePath: '/path/to/file' };
      mockFileService.checkFileAccess.mockResolvedValue(accessResult);

      await documentController.getDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to access this document',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 when document not found', async () => {
      mockFileService.checkFileAccess.mockRejectedValue(new Error('Document not found'));

      await documentController.getDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('updateDocumentMetadata', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'doc-123' };
      mockRequest.body = {
        title: 'Updated Title',
        description: 'Updated description',
        tags: ['updated']
      };
    });

    it('should update document metadata', async () => {
      const updatedDocument = { ...mockDocument, metadata: { ...mockDocument.metadata, title: 'Updated Title' } };
      mockDocumentService.updateDocumentMetadata.mockResolvedValue(updatedDocument);

      await documentController.updateDocumentMetadata(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentService.updateDocumentMetadata).toHaveBeenCalledWith(
        'doc-123',
        { title: 'Updated Title', description: 'Updated description', tags: ['updated'] },
        'user-123',
        'editor'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          document: updatedDocument,
          message: 'Document metadata updated successfully'
        }
      });
    });

    it('should return 404 when document not found', async () => {
      mockDocumentService.updateDocumentMetadata.mockResolvedValue(null);

      await documentController.updateDocumentMetadata(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when user lacks permissions', async () => {
      mockDocumentService.updateDocumentMetadata.mockRejectedValue(new Error('Insufficient permissions to update this document'));

      await documentController.updateDocumentMetadata(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to update this document',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('searchDocuments', () => {
    beforeEach(() => {
      mockRequest.query = { q: 'test', type: 'name' };
    });

    it('should search documents', async () => {
      const documents = [mockDocument];
      mockDocumentService.searchDocuments.mockResolvedValue(documents);

      await documentController.searchDocuments(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentService.searchDocuments).toHaveBeenCalledWith(
        'test',
        'user-123',
        'editor',
        'name'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          documents,
          count: 1,
          searchTerm: 'test',
          searchType: 'name'
        }
      });
    });

    it('should return 400 when search term is missing', async () => {
      mockRequest.query = {};

      await documentController.searchDocuments(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_SEARCH_TERM',
          message: 'Search term is required',
          timestamp: expect.any(String)
        }
      });
    });

    it('should use default search type when not specified', async () => {
      mockRequest.query = { q: 'test' };
      const documents = [mockDocument];
      mockDocumentService.searchDocuments.mockResolvedValue(documents);

      await documentController.searchDocuments(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentService.searchDocuments).toHaveBeenCalledWith(
        'test',
        'user-123',
        'editor',
        'name'
      );
    });
  });

  describe('deleteDocument', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'doc-123' };
    });

    it('should delete document', async () => {
      mockFileService.deleteFile.mockResolvedValue(undefined);

      await documentController.deleteDocument(mockRequest as Request, mockResponse as Response);

      expect(mockFileService.deleteFile).toHaveBeenCalledWith('doc-123', 'user-123', 'editor');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Document deleted successfully'
        }
      });
    });

    it('should return 404 when document not found', async () => {
      mockFileService.deleteFile.mockRejectedValue(new Error('Document not found'));

      await documentController.deleteDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when user lacks permissions', async () => {
      mockFileService.deleteFile.mockRejectedValue(new Error('Insufficient permissions to delete file'));

      await documentController.deleteDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to delete this document',
          timestamp: expect.any(String)
        }
      });
    });
  });
});