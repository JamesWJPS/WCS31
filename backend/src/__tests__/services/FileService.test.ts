import { FileService } from '../../services/FileService';
import { DocumentRepository } from '../../models/DocumentRepository';
import { FolderRepository } from '../../models/FolderRepository';
import { FileStorage } from '../../utils/fileStorage';
import { Document, Folder } from '../../models/interfaces';

// Mock dependencies
jest.mock('../../models/DocumentRepository');
jest.mock('../../models/FolderRepository');
jest.mock('../../utils/fileStorage');

const MockDocumentRepository = DocumentRepository as jest.MockedClass<typeof DocumentRepository>;
const MockFolderRepository = FolderRepository as jest.MockedClass<typeof FolderRepository>;
const MockFileStorage = FileStorage as jest.MockedClass<typeof FileStorage>;

describe('FileService', () => {
  let fileService: FileService;
  let mockDocumentRepository: jest.Mocked<DocumentRepository>;
  let mockFolderRepository: jest.Mocked<FolderRepository>;
  let mockFileStorage: jest.Mocked<FileStorage>;

  const mockFolder: Folder = {
    id: 'folder-1',
    name: 'Test Folder',
    parentId: null,
    isPublic: false,
    permissions: {
      read: ['user-1'],
      write: ['user-1']
    },
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockDocument: Document = {
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
      tags: ['test'],
      hash: 'test-hash'
    }
  };

  const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test content'),
    destination: '',
    filename: '',
    path: '',
    stream: {} as any,
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDocumentRepository = new MockDocumentRepository() as jest.Mocked<DocumentRepository>;
    mockFolderRepository = new MockFolderRepository() as jest.Mocked<FolderRepository>;
    mockFileStorage = new MockFileStorage({} as any) as jest.Mocked<FileStorage>;

    // Mock constructor calls
    MockDocumentRepository.mockImplementation(() => mockDocumentRepository);
    MockFolderRepository.mockImplementation(() => mockFolderRepository);
    MockFileStorage.mockImplementation(() => mockFileStorage);

    fileService = new FileService();
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const file = createMockFile();
      const storedFile = {
        filename: 'stored-file.pdf',
        originalName: 'test.pdf',
        path: '/uploads/stored-file.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        hash: 'file-hash'
      };

      mockFolderRepository.findById.mockResolvedValue(mockFolder);
      mockFileStorage.storeFile.mockResolvedValue(storedFile);
      mockDocumentRepository.create.mockResolvedValue(mockDocument);

      const result = await fileService.uploadFile(file, 'folder-1', 'user-1');

      expect(mockFolderRepository.findById).toHaveBeenCalledWith('folder-1');
      expect(mockFileStorage.storeFile).toHaveBeenCalledWith(file);
      expect(mockDocumentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'stored-file.pdf',
          original_name: 'test.pdf',
          folder_id: 'folder-1',
          uploaded_by: 'user-1'
        })
      );
      expect(result.document).toBe(mockDocument);
      expect(result.storedFile).toBe(storedFile);
    });

    it('should throw error if folder not found', async () => {
      const file = createMockFile();
      mockFolderRepository.findById.mockResolvedValue(null);

      await expect(fileService.uploadFile(file, 'non-existent', 'user-1'))
        .rejects.toThrow('Folder not found');
    });

    it('should clean up stored file if database save fails', async () => {
      const file = createMockFile();
      const storedFile = {
        filename: 'stored-file.pdf',
        originalName: 'test.pdf',
        path: '/uploads/stored-file.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        hash: 'file-hash'
      };

      mockFolderRepository.findById.mockResolvedValue(mockFolder);
      mockFileStorage.storeFile.mockResolvedValue(storedFile);
      mockDocumentRepository.create.mockResolvedValue(null as any);

      await expect(fileService.uploadFile(file, 'folder-1', 'user-1'))
        .rejects.toThrow('Failed to save document record');

      expect(mockFileStorage.deleteFile).toHaveBeenCalledWith('stored-file.pdf');
    });
  });

  describe('uploadMultipleFiles', () => {
    it('should upload multiple files successfully', async () => {
      const files = [createMockFile({ originalname: 'file1.pdf' }), createMockFile({ originalname: 'file2.pdf' })];
      const storedFile1 = {
        filename: 'stored-file1.pdf',
        originalName: 'file1.pdf',
        path: '/uploads/stored-file1.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        hash: 'hash1'
      };
      const storedFile2 = {
        filename: 'stored-file2.pdf',
        originalName: 'file2.pdf',
        path: '/uploads/stored-file2.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        hash: 'hash2'
      };

      mockFolderRepository.findById.mockResolvedValue(mockFolder);
      mockFileStorage.storeFile
        .mockResolvedValueOnce(storedFile1)
        .mockResolvedValueOnce(storedFile2);
      mockDocumentRepository.create
        .mockResolvedValueOnce({ ...mockDocument, id: 'doc-1' })
        .mockResolvedValueOnce({ ...mockDocument, id: 'doc-2' });

      const results = await fileService.uploadMultipleFiles(files, 'folder-1', 'user-1');

      expect(results).toHaveLength(2);
      expect(mockFileStorage.storeFile).toHaveBeenCalledTimes(2);
      expect(mockDocumentRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should clean up all files if one upload fails', async () => {
      const files = [createMockFile({ originalname: 'file1.pdf' }), createMockFile({ originalname: 'file2.pdf' })];
      const storedFile1 = {
        filename: 'stored-file1.pdf',
        originalName: 'file1.pdf',
        path: '/uploads/stored-file1.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        hash: 'hash1'
      };

      mockFolderRepository.findById.mockResolvedValue(mockFolder);
      mockFileStorage.storeFile
        .mockResolvedValueOnce(storedFile1)
        .mockRejectedValueOnce(new Error('Storage failed'));
      mockDocumentRepository.create.mockResolvedValueOnce({ ...mockDocument, id: 'doc-1' });
      mockDocumentRepository.findAll.mockResolvedValue([{ ...mockDocument, filename: 'stored-file1.pdf' }]);

      await expect(fileService.uploadMultipleFiles(files, 'folder-1', 'user-1'))
        .rejects.toThrow('Storage failed');

      expect(mockFileStorage.deleteFile).toHaveBeenCalledWith('stored-file1.pdf');
      expect(mockDocumentRepository.delete).toHaveBeenCalled();
    });
  });

  describe('checkFileAccess', () => {
    it('should return access result for authorized user', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);
      mockFolderRepository.hasReadPermission.mockResolvedValue(true);
      mockFileStorage.getFilePath.mockReturnValue('/uploads/test-file.pdf');

      const result = await fileService.checkFileAccess('doc-1', 'user-1', 'editor');

      expect(result.document).toBe(mockDocument);
      expect(result.canAccess).toBe(true);
      expect(result.filePath).toBe('/uploads/test-file.pdf');
    });

    it('should return no access for unauthorized user', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);
      mockFolderRepository.hasReadPermission.mockResolvedValue(false);
      mockFileStorage.getFilePath.mockReturnValue('/uploads/test-file.pdf');

      const result = await fileService.checkFileAccess('doc-1', 'user-2', 'read-only');

      expect(result.canAccess).toBe(false);
    });

    it('should throw error if document not found', async () => {
      mockDocumentRepository.findById.mockResolvedValue(null);

      await expect(fileService.checkFileAccess('non-existent', 'user-1', 'editor'))
        .rejects.toThrow('Document not found');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully for authorized user', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);

      await fileService.deleteFile('doc-1', 'user-1', 'editor');

      expect(mockFileStorage.deleteFile).toHaveBeenCalledWith('test-file.pdf');
      expect(mockDocumentRepository.delete).toHaveBeenCalledWith('doc-1');
    });

    it('should throw error for unauthorized user', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);
      mockFolderRepository.hasWritePermission.mockResolvedValue(false);

      await expect(fileService.deleteFile('doc-1', 'user-2', 'read-only'))
        .rejects.toThrow('Insufficient permissions to delete file');
    });

    it('should throw error if document not found', async () => {
      mockDocumentRepository.findById.mockResolvedValue(null);

      await expect(fileService.deleteFile('non-existent', 'user-1', 'editor'))
        .rejects.toThrow('Document not found');
    });
  });

  describe('getFilesInFolder', () => {
    it('should return files for authorized user', async () => {
      const documents = [mockDocument];
      mockFolderRepository.hasReadPermission.mockResolvedValue(true);
      mockDocumentRepository.findByFolder.mockResolvedValue(documents);

      const result = await fileService.getFilesInFolder('folder-1', 'user-1', 'editor');

      expect(result).toBe(documents);
      expect(mockDocumentRepository.findByFolder).toHaveBeenCalledWith('folder-1');
    });

    it('should return empty array for unauthorized user', async () => {
      mockFolderRepository.hasReadPermission.mockResolvedValue(false);

      const result = await fileService.getFilesInFolder('folder-1', 'user-2', 'read-only');

      expect(result).toEqual([]);
      expect(mockDocumentRepository.findByFolder).not.toHaveBeenCalled();
    });
  });

  describe('searchFiles', () => {
    it('should search files accessible to user', async () => {
      const documents = [
        { ...mockDocument, originalName: 'test-document.pdf' }
      ];
      mockDocumentRepository.getDocumentsForUser.mockResolvedValue(documents);

      const result = await fileService.searchFiles('test', 'user-1', 'editor');

      expect(result).toHaveLength(1);
      expect(result[0]?.originalName).toBe('test-document.pdf');
    });

    it('should search by metadata fields', async () => {
      const documents = [
        { 
          ...mockDocument, 
          originalName: 'document.pdf',
          metadata: { ...mockDocument.metadata, title: 'Test Title' }
        }
      ];
      mockDocumentRepository.getDocumentsForUser.mockResolvedValue(documents);

      const result = await fileService.searchFiles('test', 'user-1', 'editor');

      expect(result).toHaveLength(1);
    });
  });

  describe('updateFileMetadata', () => {
    it('should update metadata for authorized user', async () => {
      const updatedDocument = { ...mockDocument, metadata: { ...mockDocument.metadata, title: 'Updated Title' } };
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);
      mockDocumentRepository.updateMetadata.mockResolvedValue(updatedDocument);

      const result = await fileService.updateFileMetadata(
        'doc-1',
        { title: 'Updated Title' },
        'user-1',
        'editor'
      );

      expect(result).toBe(updatedDocument);
      expect(mockDocumentRepository.updateMetadata).toHaveBeenCalledWith('doc-1', { title: 'Updated Title' });
    });

    it('should throw error for unauthorized user', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);
      mockFolderRepository.hasWritePermission.mockResolvedValue(false);

      await expect(fileService.updateFileMetadata('doc-1', { title: 'New Title' }, 'user-2', 'read-only'))
        .rejects.toThrow('Insufficient permissions to update file metadata');
    });
  });

  describe('verifyFileIntegrity', () => {
    it('should verify file integrity successfully', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);
      mockFileStorage.verifyFileIntegrity.mockReturnValue(true);

      const result = await fileService.verifyFileIntegrity('doc-1');

      expect(result).toBe(true);
      expect(mockFileStorage.verifyFileIntegrity).toHaveBeenCalledWith('test-file.pdf', 'test-hash');
    });

    it('should return false for document without hash', async () => {
      const docWithoutHash = { 
        ...mockDocument, 
        metadata: { 
          title: 'Test Document',
          description: 'A test document',
          tags: ['test']
        } 
      };
      mockDocumentRepository.findById.mockResolvedValue(docWithoutHash);

      const result = await fileService.verifyFileIntegrity('doc-1');

      expect(result).toBe(false);
    });

    it('should return false for non-existent document', async () => {
      mockDocumentRepository.findById.mockResolvedValue(null);

      const result = await fileService.verifyFileIntegrity('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getFolderFileStats', () => {
    it('should return folder statistics for authorized user', async () => {
      const stats = {
        totalDocuments: 5,
        totalSize: 5120,
        mimeTypes: { 'application/pdf': 3, 'image/jpeg': 2 }
      };
      mockFolderRepository.hasReadPermission.mockResolvedValue(true);
      mockDocumentRepository.getFolderStats.mockResolvedValue(stats);

      const result = await fileService.getFolderFileStats('folder-1', 'user-1', 'editor');

      expect(result).toEqual({
        totalFiles: 5,
        totalSize: 5120,
        fileTypes: { 'application/pdf': 3, 'image/jpeg': 2 }
      });
    });

    it('should return empty stats for unauthorized user', async () => {
      mockFolderRepository.hasReadPermission.mockResolvedValue(false);

      const result = await fileService.getFolderFileStats('folder-1', 'user-2', 'read-only');

      expect(result).toEqual({
        totalFiles: 0,
        totalSize: 0,
        fileTypes: {}
      });
    });
  });
});