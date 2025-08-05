import { DocumentService } from '../../services/DocumentService';
import { DocumentRepository } from '../../models/DocumentRepository';
import { FolderRepository } from '../../models/FolderRepository';
import { Document } from '../../models/interfaces';

// Mock the repositories
jest.mock('../../models/DocumentRepository');
jest.mock('../../models/FolderRepository');

describe('DocumentService', () => {
  let documentService: DocumentService;
  let mockDocumentRepository: jest.Mocked<DocumentRepository>;
  let mockFolderRepository: jest.Mocked<FolderRepository>;

  const testDocument: Omit<Document, 'id' | 'createdAt'> = {
    filename: 'test-document.pdf',
    originalName: 'Test Document.pdf',
    mimeType: 'application/pdf',
    size: 1024000,
    folderId: 'test-folder-1',
    uploadedBy: 'user-1',
    metadata: {
      title: 'Test Document',
      description: 'A test document',
      tags: ['test', 'document'],
    },
  };

  beforeEach(() => {
    mockDocumentRepository = new DocumentRepository() as jest.Mocked<DocumentRepository>;
    mockFolderRepository = new FolderRepository() as jest.Mocked<FolderRepository>;
    
    documentService = new DocumentService();
    (documentService as any).documentRepository = mockDocumentRepository;
    (documentService as any).folderRepository = mockFolderRepository;
  });

  describe('createDocument', () => {
    it('should create document when user has write permission', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);
      mockDocumentRepository.create.mockResolvedValue({
        id: 'doc-123',
        ...testDocument,
        createdAt: new Date(),
      });

      const result = await documentService.createDocument(testDocument, 'user-1', 'editor');

      expect(mockFolderRepository.hasWritePermission).toHaveBeenCalledWith(
        testDocument.folderId,
        'user-1',
        'editor'
      );
      expect(mockDocumentRepository.create).toHaveBeenCalled();
      expect(result.id).toBe('doc-123');
    });

    it('should throw error when user lacks write permission', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(false);

      await expect(
        documentService.createDocument(testDocument, 'user-1', 'editor')
      ).rejects.toThrow('Insufficient permissions to upload to this folder');

      expect(mockDocumentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getDocumentsInFolder', () => {
    it('should return documents when user has read permission', async () => {
      const mockDocuments = [{ id: 'doc-1', ...testDocument, createdAt: new Date() }];
      mockFolderRepository.hasReadPermission.mockResolvedValue(true);
      mockDocumentRepository.findByFolder.mockResolvedValue(mockDocuments);

      const result = await documentService.getDocumentsInFolder('folder-1', 'user-1', 'editor');

      expect(mockFolderRepository.hasReadPermission).toHaveBeenCalledWith(
        'folder-1',
        'user-1',
        'editor'
      );
      expect(result).toEqual(mockDocuments);
    });

    it('should throw error when user lacks read permission', async () => {
      mockFolderRepository.hasReadPermission.mockResolvedValue(false);

      await expect(
        documentService.getDocumentsInFolder('folder-1', 'user-1', 'editor')
      ).rejects.toThrow('Insufficient permissions to access this folder');

      expect(mockDocumentRepository.findByFolder).not.toHaveBeenCalled();
    });
  });

  describe('updateDocumentMetadata', () => {
    const existingDocument = {
      id: 'doc-1',
      ...testDocument,
      createdAt: new Date(),
    };

    it('should update metadata when user has write permission', async () => {
      mockDocumentRepository.findById.mockResolvedValue(existingDocument);
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);
      mockDocumentRepository.updateMetadata.mockResolvedValue({
        ...existingDocument,
        metadata: { ...existingDocument.metadata, title: 'Updated Title' },
      });

      const result = await documentService.updateDocumentMetadata(
        'doc-1',
        { title: 'Updated Title' },
        'user-1',
        'editor'
      );

      expect(mockDocumentRepository.updateMetadata).toHaveBeenCalledWith(
        'doc-1',
        { title: 'Updated Title' }
      );
      expect(result?.metadata.title).toBe('Updated Title');
    });

    it('should allow document uploader to update metadata', async () => {
      mockDocumentRepository.findById.mockResolvedValue(existingDocument);
      mockFolderRepository.hasWritePermission.mockResolvedValue(false);
      mockDocumentRepository.updateMetadata.mockResolvedValue({
        ...existingDocument,
        metadata: { ...existingDocument.metadata, title: 'Updated Title' },
      });

      const result = await documentService.updateDocumentMetadata(
        'doc-1',
        { title: 'Updated Title' },
        'user-1', // Same as uploadedBy
        'editor'
      );

      expect(result?.metadata.title).toBe('Updated Title');
    });

    it('should throw error when user lacks permission', async () => {
      mockDocumentRepository.findById.mockResolvedValue(existingDocument);
      mockFolderRepository.hasWritePermission.mockResolvedValue(false);

      await expect(
        documentService.updateDocumentMetadata(
          'doc-1',
          { title: 'Updated Title' },
          'user-2', // Different from uploadedBy
          'editor'
        )
      ).rejects.toThrow('Insufficient permissions to update this document');
    });

    it('should throw error when document not found', async () => {
      mockDocumentRepository.findById.mockResolvedValue(null);

      await expect(
        documentService.updateDocumentMetadata(
          'non-existent',
          { title: 'Updated Title' },
          'user-1',
          'editor'
        )
      ).rejects.toThrow('Document not found');
    });
  });

  describe('deleteDocument', () => {
    const existingDocument = {
      id: 'doc-1',
      ...testDocument,
      createdAt: new Date(),
    };

    it('should delete document when user has write permission', async () => {
      mockDocumentRepository.findById.mockResolvedValue(existingDocument);
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);
      mockDocumentRepository.delete.mockResolvedValue(true);

      const result = await documentService.deleteDocument('doc-1', 'user-1', 'editor');

      expect(mockDocumentRepository.delete).toHaveBeenCalledWith('doc-1');
      expect(result).toBe(true);
    });

    it('should allow administrator to delete any document', async () => {
      mockDocumentRepository.findById.mockResolvedValue(existingDocument);
      mockFolderRepository.hasWritePermission.mockResolvedValue(false);
      mockDocumentRepository.delete.mockResolvedValue(true);

      const result = await documentService.deleteDocument('doc-1', 'user-2', 'administrator');

      expect(result).toBe(true);
    });

    it('should throw error when user lacks permission', async () => {
      mockDocumentRepository.findById.mockResolvedValue(existingDocument);
      mockFolderRepository.hasWritePermission.mockResolvedValue(false);

      await expect(
        documentService.deleteDocument('doc-1', 'user-2', 'editor')
      ).rejects.toThrow('Insufficient permissions to delete this document');
    });
  });

  describe('searchDocuments', () => {
    const mockDocuments = [
      { id: 'doc-1', ...testDocument, createdAt: new Date() },
      { id: 'doc-2', ...testDocument, folderId: 'folder-2', createdAt: new Date() },
    ];

    it('should search by name and filter by permissions', async () => {
      mockDocumentRepository.searchByName.mockResolvedValue(mockDocuments);
      mockFolderRepository.hasReadPermission
        .mockResolvedValueOnce(true)  // First document accessible
        .mockResolvedValueOnce(false); // Second document not accessible

      const result = await documentService.searchDocuments('test', 'user-1', 'editor');

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('doc-1');
    });

    it('should search by metadata', async () => {
      const firstDocument = mockDocuments[0];
      if (firstDocument) {
        mockDocumentRepository.searchByMetadata.mockResolvedValue([firstDocument]);
        mockFolderRepository.hasReadPermission.mockResolvedValue(true);

        const result = await documentService.searchDocuments('test', 'user-1', 'editor', 'metadata');

        expect(mockDocumentRepository.searchByMetadata).toHaveBeenCalledWith('test');
        expect(result).toHaveLength(1);
      }
    });

    it('should search by tags', async () => {
      const firstDocument = mockDocuments[0];
      if (firstDocument) {
        mockDocumentRepository.findByTags.mockResolvedValue([firstDocument]);
        mockFolderRepository.hasReadPermission.mockResolvedValue(true);

        const result = await documentService.searchDocuments('test', 'user-1', 'editor', 'tags');

        expect(mockDocumentRepository.findByTags).toHaveBeenCalledWith(['test']);
        expect(result).toHaveLength(1);
      }
    });
  });

  describe('moveDocument', () => {
    const existingDocument = {
      id: 'doc-1',
      ...testDocument,
      createdAt: new Date(),
    };

    it('should move document when user has permissions on both folders', async () => {
      mockDocumentRepository.findById.mockResolvedValue(existingDocument);
      mockFolderRepository.hasWritePermission
        .mockResolvedValueOnce(true)  // Source folder permission
        .mockResolvedValueOnce(true); // Destination folder permission
      mockDocumentRepository.update.mockResolvedValue({
        ...existingDocument,
        folderId: 'new-folder',
      });

      const result = await documentService.moveDocument('doc-1', 'new-folder', 'user-1', 'editor');

      expect(mockDocumentRepository.update).toHaveBeenCalledWith('doc-1', {
        folder_id: 'new-folder',
        updated_at: expect.any(Date),
      });
      expect(result?.folderId).toBe('new-folder');
    });

    it('should throw error when user lacks source folder permission', async () => {
      mockDocumentRepository.findById.mockResolvedValue(existingDocument);
      mockFolderRepository.hasWritePermission
        .mockResolvedValueOnce(false) // Source folder permission
        .mockResolvedValueOnce(true);  // Destination folder permission

      await expect(
        documentService.moveDocument('doc-1', 'new-folder', 'user-1', 'editor')
      ).rejects.toThrow('Insufficient permissions to move document');
    });

    it('should throw error when user lacks destination folder permission', async () => {
      mockDocumentRepository.findById.mockResolvedValue(existingDocument);
      mockFolderRepository.hasWritePermission
        .mockResolvedValueOnce(true)  // Source folder permission
        .mockResolvedValueOnce(false); // Destination folder permission

      await expect(
        documentService.moveDocument('doc-1', 'new-folder', 'user-1', 'editor')
      ).rejects.toThrow('Insufficient permissions to move document');
    });
  });

  describe('getFolderStatistics', () => {
    it('should return statistics when user has read permission', async () => {
      const mockStats = {
        totalDocuments: 5,
        totalSize: 1024000,
        mimeTypes: { 'application/pdf': 3, 'image/jpeg': 2 },
      };

      mockFolderRepository.hasReadPermission.mockResolvedValue(true);
      mockDocumentRepository.getFolderStats.mockResolvedValue(mockStats);

      const result = await documentService.getFolderStatistics('folder-1', 'user-1', 'editor');

      expect(result).toEqual(mockStats);
    });

    it('should throw error when user lacks read permission', async () => {
      mockFolderRepository.hasReadPermission.mockResolvedValue(false);

      await expect(
        documentService.getFolderStatistics('folder-1', 'user-1', 'editor')
      ).rejects.toThrow('Insufficient permissions to access folder statistics');
    });
  });
});