import { Request, Response } from 'express';
import { FileController } from '../../controllers/FileController';
import { FileService } from '../../services/FileService';
import { FolderRepository } from '../../models/FolderRepository';

// Mock dependencies
jest.mock('../../services/FileService');
jest.mock('../../models/FolderRepository');

const MockFileService = FileService as jest.MockedClass<typeof FileService>;
const MockFolderRepository = FolderRepository as jest.MockedClass<typeof FolderRepository>;

describe('FileController', () => {
  let fileController: FileController;
  let mockFileService: jest.Mocked<FileService>;
  let mockFolderRepository: jest.Mocked<FolderRepository>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

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

    mockFileService = new MockFileService() as jest.Mocked<FileService>;
    mockFolderRepository = new MockFolderRepository() as jest.Mocked<FolderRepository>;

    MockFileService.mockImplementation(() => mockFileService);
    MockFolderRepository.mockImplementation(() => mockFolderRepository);

    fileController = new FileController();

    mockRequest = {
      user: mockUser,
      file: {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: {} as any
      },
      body: {
        folderId: 'folder-1',
        title: 'Test Document',
        description: 'A test document',
        tags: '["test"]'
      },
      params: {},
      query: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      sendFile: jest.fn()
    };
  });

  describe('uploadFile', () => {
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

      await fileController.uploadFile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          document: mockDocument,
          message: 'File uploaded successfully'
        }
      });
    });

    it('should return error if no file provided', async () => {
      mockRequest.file = undefined;

      await fileController.uploadFile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file provided',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return error if user lacks write permission', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(false);

      await fileController.uploadFile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to upload files to this folder',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle upload errors', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);
      mockFileService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await fileController.uploadFile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Upload failed',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('uploadMultipleFiles', () => {
    beforeEach(() => {
      mockRequest.files = [
        {
          fieldname: 'files',
          originalname: 'test1.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('test1'),
          destination: '',
          filename: '',
          path: '',
          stream: {} as any
        },
        {
          fieldname: 'files',
          originalname: 'test2.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('test2'),
          destination: '',
          filename: '',
          path: '',
          stream: {} as any
        }
      ];
    });

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

      await fileController.uploadMultipleFiles(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          documents: expect.arrayContaining([
            expect.objectContaining({ id: 'doc-1' }),
            expect.objectContaining({ id: 'doc-2' })
          ]),
          message: '2 files uploaded successfully'
        }
      });
    });

    it('should return error if no files provided', async () => {
      mockRequest.files = [];

      await fileController.uploadMultipleFiles(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No files provided',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('downloadFile', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'doc-1' };
    });

    it('should download file successfully', async () => {
      mockFileService.checkFileAccess.mockResolvedValue({
        document: mockDocument,
        filePath: '/uploads/test-file.pdf',
        canAccess: true
      });

      await fileController.downloadFile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="test.pdf"');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Length', 1024);
      expect(mockResponse.sendFile).toHaveBeenCalledWith('/uploads/test-file.pdf', expect.any(Function));
    });

    it('should return error if user lacks access', async () => {
      mockFileService.checkFileAccess.mockResolvedValue({
        document: mockDocument,
        filePath: '/uploads/test-file.pdf',
        canAccess: false
      });

      await fileController.downloadFile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to access this file',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle file access errors', async () => {
      mockFileService.checkFileAccess.mockRejectedValue(new Error('Document not found'));

      await fileController.downloadFile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: 'Document not found',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('deleteFile', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'doc-1' };
    });

    it('should delete file successfully', async () => {
      mockFileService.deleteFile.mockResolvedValue();

      await fileController.deleteFile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'File deleted successfully'
        }
      });
    });

    it('should handle document not found error', async () => {
      mockFileService.deleteFile.mockRejectedValue(new Error('Document not found'));

      await fileController.deleteFile(mockRequest as Request, mockResponse as Response);

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

    it('should handle insufficient permissions error', async () => {
      mockFileService.deleteFile.mockRejectedValue(new Error('Insufficient permissions to delete file'));

      await fileController.deleteFile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to delete this file',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('getFilesInFolder', () => {
    beforeEach(() => {
      mockRequest.params = { folderId: 'folder-1' };
    });

    it('should get files in folder successfully', async () => {
      const files = [mockDocument];
      mockFileService.getFilesInFolder.mockResolvedValue(files);

      await fileController.getFilesInFolder(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          files,
          count: 1
        }
      });
    });

    it('should handle errors', async () => {
      mockFileService.getFilesInFolder.mockRejectedValue(new Error('Fetch failed'));

      await fileController.getFilesInFolder(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Fetch failed',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('searchFiles', () => {
    beforeEach(() => {
      mockRequest.query = { q: 'test' };
    });

    it('should search files successfully', async () => {
      const files = [mockDocument];
      mockFileService.searchFiles.mockResolvedValue(files);

      await fileController.searchFiles(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          files,
          count: 1,
          searchTerm: 'test'
        }
      });
    });

    it('should return error if search term missing', async () => {
      mockRequest.query = {};

      await fileController.searchFiles(mockRequest as Request, mockResponse as Response);

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
  });

  describe('updateFileMetadata', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'doc-1' };
      mockRequest.body = {
        title: 'Updated Title',
        description: 'Updated description',
        tags: ['updated']
      };
    });

    it('should update file metadata successfully', async () => {
      const updatedDocument = { ...mockDocument, metadata: { ...mockDocument.metadata, title: 'Updated Title' } };
      mockFileService.updateFileMetadata.mockResolvedValue(updatedDocument);

      await fileController.updateFileMetadata(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          document: updatedDocument,
          message: 'File metadata updated successfully'
        }
      });
    });

    it('should handle document not found', async () => {
      mockFileService.updateFileMetadata.mockResolvedValue(null);

      await fileController.updateFileMetadata(mockRequest as Request, mockResponse as Response);

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

  describe('verifyFileIntegrity', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'doc-1' };
      mockRequest.user = { ...mockUser, role: 'administrator' };
    });

    it('should verify file integrity successfully for admin', async () => {
      mockFileService.verifyFileIntegrity.mockResolvedValue(true);

      await fileController.verifyFileIntegrity(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          documentId: 'doc-1',
          isValid: true,
          message: 'File integrity verified'
        }
      });
    });

    it('should return error for non-admin user', async () => {
      mockRequest.user = { ...mockUser, role: 'editor' };

      await fileController.verifyFileIntegrity(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only administrators can verify file integrity',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle integrity check failure', async () => {
      mockFileService.verifyFileIntegrity.mockResolvedValue(false);

      await fileController.verifyFileIntegrity(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          documentId: 'doc-1',
          isValid: false,
          message: 'File integrity check failed'
        }
      });
    });
  });
});