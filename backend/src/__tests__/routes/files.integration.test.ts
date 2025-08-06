import request from 'supertest';
import express from 'express';
import fileRoutes from '../../routes/files';
import { authenticateToken } from '../../middleware/auth';
import { FileService } from '../../services/FileService';
import { FolderRepository } from '../../models/FolderRepository';

// Mock dependencies
jest.mock('../../services/FileService');
jest.mock('../../models/FolderRepository');
jest.mock('../../middleware/auth');

const MockFileService = FileService as jest.MockedClass<typeof FileService>;
const MockFolderRepository = FolderRepository as jest.MockedClass<typeof FolderRepository>;
const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

describe('File Routes Integration', () => {
  let app: express.Application;
  let mockFileService: jest.Mocked<FileService>;
  let mockFolderRepository: jest.Mocked<FolderRepository>;

  const mockUser = {
    userId: 'user-1',
    username: 'testuser',
    role: 'editor' as const
  };

  const mockDocument = {
    id: 'doc-1',
    filename: 'test-file.pdf',
    originalName: 'test.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    folderId: 'folder-1',
    uploadedBy: 'user-1',
    createdAt: new Date(),
    metadata: {
      title: 'Test Document',
      description: 'A test document',
      tags: ['test']
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Mock authentication middleware
    mockAuthenticateToken.mockImplementation(async (req: any, _res, next) => {
      req.user = mockUser;
      next();
    });

    mockFileService = new MockFileService() as jest.Mocked<FileService>;
    mockFolderRepository = new MockFolderRepository() as jest.Mocked<FolderRepository>;

    MockFileService.mockImplementation(() => mockFileService);
    MockFolderRepository.mockImplementation(() => mockFolderRepository);

    app.use('/api/files', fileRoutes);
  });

  describe('POST /api/files/upload', () => {
    it('should upload file successfully', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);
      mockFileService.uploadFile.mockResolvedValue({
        document: mockDocument,
        storedFile: {
          filename: 'stored-file.pdf',
          originalName: 'test.pdf',
          path: '/uploads/stored-file.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          hash: 'file-hash'
        }
      });

      const response = await request(app)
        .post('/api/files/upload')
        .field('folderId', 'folder-1')
        .field('title', 'Test Document')
        .attach('file', Buffer.from('test content'), 'test.pdf');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.document).toEqual(mockDocument);
    });

    it('should return 403 if user lacks write permission', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/files/upload')
        .field('folderId', 'folder-1')
        .attach('file', Buffer.from('test content'), 'test.pdf');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return 400 if no file provided', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .field('folderId', 'folder-1');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE');
    });
  });

  describe('POST /api/files/upload-multiple', () => {
    it('should upload multiple files successfully', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);
      mockFileService.uploadMultipleFiles.mockResolvedValue([
        {
          document: { ...mockDocument, id: 'doc-1' },
          storedFile: {
            filename: 'stored-file1.pdf',
            originalName: 'test1.pdf',
            path: '/uploads/stored-file1.pdf',
            size: 1024,
            mimeType: 'application/pdf',
            hash: 'hash1'
          }
        },
        {
          document: { ...mockDocument, id: 'doc-2' },
          storedFile: {
            filename: 'stored-file2.pdf',
            originalName: 'test2.pdf',
            path: '/uploads/stored-file2.pdf',
            size: 1024,
            mimeType: 'application/pdf',
            hash: 'hash2'
          }
        }
      ]);

      const response = await request(app)
        .post('/api/files/upload-multiple')
        .field('folderId', 'folder-1')
        .attach('files', Buffer.from('test content 1'), 'test1.pdf')
        .attach('files', Buffer.from('test content 2'), 'test2.pdf');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toHaveLength(2);
      expect(response.body.data.message).toBe('2 files uploaded successfully');
    });
  });

  describe('GET /api/files/:id/download', () => {
    it('should download file successfully', async () => {
      mockFileService.checkFileAccess.mockResolvedValue({
        document: mockDocument,
        filePath: '/uploads/test-file.pdf',
        canAccess: true
      });

      const response = await request(app)
        .get('/api/files/doc-1/download');

      expect(response.status).toBe(200);
      expect(mockFileService.checkFileAccess).toHaveBeenCalledWith('doc-1', 'user-1', 'editor');
    });

    it('should return 403 if user lacks access', async () => {
      mockFileService.checkFileAccess.mockResolvedValue({
        document: mockDocument,
        filePath: '/uploads/test-file.pdf',
        canAccess: false
      });

      const response = await request(app)
        .get('/api/files/doc-1/download');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('DELETE /api/files/:id', () => {
    it('should delete file successfully', async () => {
      mockFileService.deleteFile.mockResolvedValue();

      const response = await request(app)
        .delete('/api/files/doc-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('File deleted successfully');
    });

    it('should return 404 if document not found', async () => {
      mockFileService.deleteFile.mockRejectedValue(new Error('Document not found'));

      const response = await request(app)
        .delete('/api/files/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });
  });

  describe('GET /api/files/folder/:folderId', () => {
    it('should get files in folder successfully', async () => {
      const files = [mockDocument];
      mockFileService.getFilesInFolder.mockResolvedValue(files);

      const response = await request(app)
        .get('/api/files/folder/folder-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toEqual(files);
      expect(response.body.data.count).toBe(1);
    });
  });

  describe('GET /api/files/search', () => {
    it('should search files successfully', async () => {
      const files = [mockDocument];
      mockFileService.searchFiles.mockResolvedValue(files);

      const response = await request(app)
        .get('/api/files/search')
        .query({ q: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toEqual(files);
      expect(response.body.data.searchTerm).toBe('test');
    });

    it('should return 400 if search term missing', async () => {
      const response = await request(app)
        .get('/api/files/search');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_SEARCH_TERM');
    });
  });

  describe('PUT /api/files/:id/metadata', () => {
    it('should update file metadata successfully', async () => {
      const updatedDocument = { 
        ...mockDocument, 
        metadata: { ...mockDocument.metadata, title: 'Updated Title' } 
      };
      mockFileService.updateFileMetadata.mockResolvedValue(updatedDocument);

      const response = await request(app)
        .put('/api/files/doc-1/metadata')
        .send({
          title: 'Updated Title',
          description: 'Updated description',
          tags: ['updated']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.document).toEqual(updatedDocument);
    });
  });

  describe('GET /api/files/folder/:folderId/stats', () => {
    it('should get folder statistics successfully', async () => {
      const stats = {
        totalFiles: 5,
        totalSize: 5120,
        fileTypes: { 'application/pdf': 3, 'image/jpeg': 2 }
      };
      mockFileService.getFolderFileStats.mockResolvedValue(stats);

      const response = await request(app)
        .get('/api/files/folder/folder-1/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(stats);
    });
  });

  describe('POST /api/files/:id/verify', () => {
    it('should verify file integrity successfully for admin', async () => {
      // Mock admin user
      mockAuthenticateToken.mockImplementation((req: any, _res, next) => {
        req.user = { ...mockUser, role: 'administrator' };
        next();
      });

      mockFileService.verifyFileIntegrity.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/files/doc-1/verify');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
    });

    it('should return 403 for non-admin user', async () => {
      mockFileService.verifyFileIntegrity.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/files/doc-1/verify');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all routes', async () => {
      // Mock authentication failure
      mockAuthenticateToken.mockImplementation((req: any, res, next) => {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
      });

      const routes = [
        { method: 'post', path: '/api/files/upload' },
        { method: 'get', path: '/api/files/doc-1/download' },
        { method: 'delete', path: '/api/files/doc-1' },
        { method: 'get', path: '/api/files/folder/folder-1' },
        { method: 'get', path: '/api/files/search' }
      ];

      for (const route of routes) {
        const response = await request(app)[route.method as keyof typeof request](route.path);
        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      }
    });
  });
});