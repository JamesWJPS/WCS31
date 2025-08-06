import request from 'supertest';
import express from 'express';
import { documentRoutes } from '../../routes';
import { authenticateToken } from '../../middleware/auth';
import { uploadSingle, uploadMultiple, validateUploadPermissions } from '../../middleware/fileUpload';
import { DocumentService } from '../../services/DocumentService';
import { FileService } from '../../services/FileService';

// Mock services
jest.mock('../../services/DocumentService');
jest.mock('../../services/FileService');
jest.mock('../../middleware/auth');
jest.mock('../../middleware/fileUpload');

const MockedDocumentService = DocumentService as jest.MockedClass<typeof DocumentService>;
const MockedFileService = FileService as jest.MockedClass<typeof FileService>;
const mockedAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
const mockedUploadSingle = uploadSingle as jest.MockedFunction<typeof uploadSingle>;
const mockedUploadMultiple = uploadMultiple as jest.MockedFunction<typeof uploadMultiple>;
const mockedValidateUploadPermissions = validateUploadPermissions as jest.MockedFunction<any>;

describe('Document Routes Integration Tests', () => {
  let app: express.Application;
  let mockDocumentService: jest.Mocked<DocumentService>;
  let mockFileService: jest.Mocked<FileService>;

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
    app = express();
    app.use(express.json());
    app.use('/api/documents', documentRoutes);

    // Reset mocks
    jest.clearAllMocks();

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

    // Setup middleware mocks
    mockedAuthenticateToken.mockImplementation(async (req, _res, next) => {
      req.user = mockUser;
      next();
    });

    mockedValidateUploadPermissions.mockImplementation((req: any, _res: any, next: any) => {
      req.uploadFolderId = req.body.folderId;
      next();
    });

    mockedUploadSingle.mockImplementation(() => (req, _res, next) => {
      req.file = {
        fieldname: 'document',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
        filename: 'test.pdf',
        path: '/tmp/test.pdf'
      } as any;
      next();
    });

    mockedUploadMultiple.mockImplementation(() => (req, _res, next) => {
      req.files = [
        {
          fieldname: 'documents',
          originalname: 'test1.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('test1'),
          filename: 'test1.pdf',
          path: '/tmp/test1.pdf'
        },
        {
          fieldname: 'documents',
          originalname: 'test2.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('test2'),
          filename: 'test2.pdf',
          path: '/tmp/test2.pdf'
        }
      ] as any;
      next();
    });
  });

  describe('POST /api/documents/upload', () => {
    it('should upload a document successfully', async () => {
      const uploadResult = { 
        document: mockDocument, 
        storedFile: { 
          filename: 'stored-file.pdf', 
          originalName: 'test file.pdf', 
          path: '/uploads/stored-file.pdf',
          mimeType: 'application/pdf', 
          size: 1024, 
          hash: 'abc123' 
        } 
      };
      mockFileService.uploadFile.mockResolvedValue(uploadResult);

      const response = await request(app)
        .post('/api/documents/upload')
        .field('folderId', 'folder-123')
        .field('title', 'Test Document')
        .attach('document', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.document).toEqual(mockDocument);
      expect(mockFileService.uploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        'folder-123',
        'user-123',
        expect.objectContaining({ title: 'Test Document' })
      );
    });

    it('should return 400 if no file is provided', async () => {
      mockedUploadSingle.mockImplementation(() => (req, _res, next) => {
        req.file = undefined;
        next();
      });

      const response = await request(app)
        .post('/api/documents/upload')
        .field('folderId', 'folder-123');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE');
    });

    it('should return 400 if no folder ID is provided', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .attach('document', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FOLDER');
    });

    it('should return 403 if user lacks permissions', async () => {
      mockFileService.uploadFile.mockRejectedValue(new Error('Insufficient permissions to upload to this folder'));

      const response = await request(app)
        .post('/api/documents/upload')
        .field('folderId', 'folder-123')
        .attach('document', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('POST /api/documents/upload-bulk', () => {
    it('should upload multiple documents successfully', async () => {
      const uploadResults = [
        { 
          document: { ...mockDocument, id: 'doc-1' }, 
          storedFile: { 
            filename: 'stored-file-1.pdf', 
            originalName: 'test1.pdf', 
            path: '/uploads/stored-file-1.pdf',
            mimeType: 'application/pdf', 
            size: 1024, 
            hash: 'abc123' 
          } 
        },
        { 
          document: { ...mockDocument, id: 'doc-2' }, 
          storedFile: { 
            filename: 'stored-file-2.pdf', 
            originalName: 'test2.pdf', 
            path: '/uploads/stored-file-2.pdf',
            mimeType: 'application/pdf', 
            size: 1024, 
            hash: 'def456' 
          } 
        }
      ];
      mockFileService.uploadMultipleFiles.mockResolvedValue(uploadResults);

      const response = await request(app)
        .post('/api/documents/upload-bulk')
        .field('folderId', 'folder-123')
        .attach('documents', Buffer.from('test1'), 'test1.pdf')
        .attach('documents', Buffer.from('test2'), 'test2.pdf');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
    });

    it('should return 400 if no files are provided', async () => {
      mockedUploadMultiple.mockImplementation(() => (req, _res, next) => {
        req.files = [];
        next();
      });

      const response = await request(app)
        .post('/api/documents/upload-bulk')
        .field('folderId', 'folder-123');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILES');
    });
  });

  describe('GET /api/documents', () => {
    it('should get all documents for user', async () => {
      const documents = [mockDocument];
      mockDocumentService.getDocumentsForUser.mockResolvedValue(documents);

      const response = await request(app)
        .get('/api/documents');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toEqual(documents);
      expect(response.body.data.count).toBe(1);
      expect(mockDocumentService.getDocumentsForUser).toHaveBeenCalledWith('user-123', 'editor');
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should get document by ID', async () => {
      const accessResult = { canAccess: true, document: mockDocument, filePath: '/path/to/file' };
      mockFileService.checkFileAccess.mockResolvedValue(accessResult);

      const response = await request(app)
        .get('/api/documents/doc-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.document).toEqual(mockDocument);
      expect(mockFileService.checkFileAccess).toHaveBeenCalledWith('doc-123', 'user-123', 'editor');
    });

    it('should return 403 if user lacks access', async () => {
      const accessResult = { canAccess: false, document: mockDocument, filePath: '/path/to/file' };
      mockFileService.checkFileAccess.mockResolvedValue(accessResult);

      const response = await request(app)
        .get('/api/documents/doc-123');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('PUT /api/documents/:id/metadata', () => {
    it('should update document metadata', async () => {
      const updatedDocument = { ...mockDocument, metadata: { ...mockDocument.metadata, title: 'Updated Title' } };
      mockDocumentService.updateDocumentMetadata.mockResolvedValue(updatedDocument);

      const response = await request(app)
        .put('/api/documents/doc-123/metadata')
        .send({
          title: 'Updated Title',
          description: 'Updated description',
          tags: ['updated']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.document).toEqual(updatedDocument);
      expect(mockDocumentService.updateDocumentMetadata).toHaveBeenCalledWith(
        'doc-123',
        { title: 'Updated Title', description: 'Updated description', tags: ['updated'] },
        'user-123',
        'editor'
      );
    });

    it('should return 404 if document not found', async () => {
      mockDocumentService.updateDocumentMetadata.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/documents/doc-123/metadata')
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });
  });

  describe('PUT /api/documents/:id/move', () => {
    it('should move document to different folder', async () => {
      const movedDocument = { ...mockDocument, folderId: 'folder-456' };
      mockDocumentService.moveDocument.mockResolvedValue(movedDocument);

      const response = await request(app)
        .put('/api/documents/doc-123/move')
        .send({ folderId: 'folder-456' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.document).toEqual(movedDocument);
      expect(mockDocumentService.moveDocument).toHaveBeenCalledWith(
        'doc-123',
        'folder-456',
        'user-123',
        'editor'
      );
    });

    it('should return 400 if no folder ID provided', async () => {
      const response = await request(app)
        .put('/api/documents/doc-123/move')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_FOLDER_ID');
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should delete document', async () => {
      mockFileService.deleteFile.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/documents/doc-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockFileService.deleteFile).toHaveBeenCalledWith('doc-123', 'user-123', 'editor');
    });

    it('should return 404 if document not found', async () => {
      mockFileService.deleteFile.mockRejectedValue(new Error('Document not found'));

      const response = await request(app)
        .delete('/api/documents/doc-123');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });
  });

  describe('DELETE /api/documents/bulk', () => {
    it('should delete multiple documents', async () => {
      mockFileService.deleteFile.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/documents/bulk')
        .send({ documentIds: ['doc-1', 'doc-2'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(2);
      expect(response.body.data.errors).toBe(0);
    });

    it('should handle partial failures in bulk delete', async () => {
      mockFileService.deleteFile
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Document not found'));

      const response = await request(app)
        .delete('/api/documents/bulk')
        .send({ documentIds: ['doc-1', 'doc-2'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(1);
      expect(response.body.data.errors).toBe(1);
    });

    it('should return 400 if no document IDs provided', async () => {
      const response = await request(app)
        .delete('/api/documents/bulk')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_DOCUMENT_IDS');
    });
  });

  describe('GET /api/documents/search', () => {
    it('should search documents', async () => {
      const documents = [mockDocument];
      mockDocumentService.searchDocuments.mockResolvedValue(documents);

      const response = await request(app)
        .get('/api/documents/search')
        .query({ q: 'test', type: 'name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toEqual(documents);
      expect(response.body.data.searchTerm).toBe('test');
      expect(response.body.data.searchType).toBe('name');
      expect(mockDocumentService.searchDocuments).toHaveBeenCalledWith(
        'test',
        'user-123',
        'editor',
        'name'
      );
    });

    it('should return 400 if no search term provided', async () => {
      const response = await request(app)
        .get('/api/documents/search');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_SEARCH_TERM');
    });
  });

  describe('GET /api/documents/folder/:folderId', () => {
    it('should get documents in folder', async () => {
      const documents = [mockDocument];
      mockDocumentService.getDocumentsInFolder.mockResolvedValue(documents);

      const response = await request(app)
        .get('/api/documents/folder/folder-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toEqual(documents);
      expect(response.body.data.folderId).toBe('folder-123');
      expect(mockDocumentService.getDocumentsInFolder).toHaveBeenCalledWith(
        'folder-123',
        'user-123',
        'editor'
      );
    });

    it('should return 403 if user lacks folder access', async () => {
      mockDocumentService.getDocumentsInFolder.mockRejectedValue(new Error('Insufficient permissions to access this folder'));

      const response = await request(app)
        .get('/api/documents/folder/folder-123');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('POST /api/documents/bulk-move', () => {
    it('should move multiple documents', async () => {
      const movedDocument1 = { ...mockDocument, id: 'doc-1', folderId: 'folder-456' };
      const movedDocument2 = { ...mockDocument, id: 'doc-2', folderId: 'folder-456' };
      
      mockDocumentService.moveDocument
        .mockResolvedValueOnce(movedDocument1)
        .mockResolvedValueOnce(movedDocument2);

      const response = await request(app)
        .post('/api/documents/bulk-move')
        .send({
          documentIds: ['doc-1', 'doc-2'],
          folderId: 'folder-456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.moved).toBe(2);
      expect(response.body.data.errors).toBe(0);
    });

    it('should return 400 if no document IDs provided', async () => {
      const response = await request(app)
        .post('/api/documents/bulk-move')
        .send({ folderId: 'folder-456' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_DOCUMENT_IDS');
    });

    it('should return 400 if no folder ID provided', async () => {
      const response = await request(app)
        .post('/api/documents/bulk-move')
        .send({ documentIds: ['doc-1', 'doc-2'] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_FOLDER_ID');
    });
  });

  describe('POST /api/documents/bulk-metadata', () => {
    it('should update metadata for multiple documents', async () => {
      const updatedDocument1 = { ...mockDocument, id: 'doc-1' };
      const updatedDocument2 = { ...mockDocument, id: 'doc-2' };
      
      mockDocumentService.updateDocumentMetadata
        .mockResolvedValueOnce(updatedDocument1)
        .mockResolvedValueOnce(updatedDocument2);

      const response = await request(app)
        .post('/api/documents/bulk-metadata')
        .send({
          documentIds: ['doc-1', 'doc-2'],
          metadata: { title: 'Bulk Updated Title' }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(2);
      expect(response.body.data.errors).toBe(0);
    });

    it('should return 400 if no metadata provided', async () => {
      const response = await request(app)
        .post('/api/documents/bulk-metadata')
        .send({ documentIds: ['doc-1', 'doc-2'] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_METADATA');
    });
  });
});