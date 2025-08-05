import { DocumentRepository } from '../../models/DocumentRepository';
import { FolderRepository } from '../../models/FolderRepository';
import { UserRepository } from '../../models/UserRepository';
import { Document } from '../../models/interfaces';
import db from '../../config/database';

describe('DocumentRepository', () => {
  let documentRepository: DocumentRepository;
  let folderRepository: FolderRepository;
  let userRepository: UserRepository;
  let testDocument: Document;
  let testUserId: string;
  let testFolderId: string;

  beforeAll(async () => {
    await db.migrate.latest();
    documentRepository = new DocumentRepository();
    folderRepository = new FolderRepository();
    userRepository = new UserRepository();
  });

  beforeEach(async () => {
    // Clean up before each test
    await db('documents').del();
    await db('folders').del();
    await db('users').del();

    // Create test user
    testUserId = 'test-user-1';
    await userRepository.create({
      id: testUserId,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword123',
      role: 'editor',
      is_active: true,
      last_login: null,
    });

    // Create test folder
    testFolderId = 'test-folder-1';
    await folderRepository.create({
      id: testFolderId,
      name: 'Test Folder',
      parent_id: null,
      is_public: true,
      permissions: JSON.stringify({ read: [], write: [] }),
      created_by: testUserId,
    });

    testDocument = {
      id: 'test-doc-1',
      filename: 'test-document.pdf',
      originalName: 'Test Document.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      folderId: testFolderId,
      uploadedBy: testUserId,
      createdAt: new Date(),
      metadata: {
        title: 'Test Document',
        description: 'A test document',
        tags: ['test', 'document'],
      },
    };
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('create', () => {
    it('should create new document', async () => {
      const created = await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      expect(created.id).toBe(testDocument.id);
      expect(created.filename).toBe(testDocument.filename);
      expect(created.originalName).toBe(testDocument.originalName);
      expect(created.mimeType).toBe(testDocument.mimeType);
      expect(created.size).toBe(testDocument.size);
      expect(created.metadata).toEqual(testDocument.metadata);
    });
  });

  describe('findByFolder', () => {
    it('should find documents by folder', async () => {
      await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      const found = await documentRepository.findByFolder(testFolderId);
      expect(found).toHaveLength(1);
      expect(found[0]?.folderId).toBe(testFolderId);
    });
  });

  describe('findByUploader', () => {
    it('should find documents by uploader', async () => {
      await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      const found = await documentRepository.findByUploader(testUserId);
      expect(found).toHaveLength(1);
      expect(found[0]?.uploadedBy).toBe(testUserId);
    });
  });

  describe('findByMimeType', () => {
    it('should find documents by mime type', async () => {
      await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      const found = await documentRepository.findByMimeType('application/pdf');
      expect(found).toHaveLength(1);
      expect(found[0]?.mimeType).toBe('application/pdf');
    });
  });

  describe('searchByName', () => {
    it('should search documents by name', async () => {
      await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      const found = await documentRepository.searchByName('Test');
      expect(found).toHaveLength(1);
      expect(found[0]?.originalName).toContain('Test');
    });
  });

  describe('update', () => {
    it('should update document metadata', async () => {
      await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      const newMetadata = {
        title: 'Updated Document',
        description: 'Updated description',
        tags: ['updated'],
      };

      const updated = await documentRepository.update(testDocument.id, {
        metadata: JSON.stringify(newMetadata),
      });

      expect(updated?.metadata).toEqual(newMetadata);
    });
  });

  describe('delete', () => {
    it('should delete document', async () => {
      await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      const deleted = await documentRepository.delete(testDocument.id);
      expect(deleted).toBe(true);

      const found = await documentRepository.findById(testDocument.id);
      expect(found).toBeNull();
    });
  });

  describe('searchByMetadata', () => {
    it('should search documents by metadata content', async () => {
      await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      const found = await documentRepository.searchByMetadata('test');
      expect(found).toHaveLength(1);
      expect(found[0]?.metadata.title).toContain('Test');
    });
  });

  describe('findByTags', () => {
    it('should find documents by tags', async () => {
      await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      const found = await documentRepository.findByTags(['test']);
      expect(found).toHaveLength(1);
      expect(found[0]?.metadata.tags).toContain('test');
    });

    it('should find documents with any matching tag', async () => {
      await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      const found = await documentRepository.findByTags(['test', 'nonexistent']);
      expect(found).toHaveLength(1);
    });
  });

  describe('updateMetadata', () => {
    it('should update document metadata', async () => {
      await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      const newMetadata = {
        title: 'Updated Title',
        tags: ['updated', 'new'],
      };

      const updated = await documentRepository.updateMetadata(testDocument.id, newMetadata);
      expect(updated?.metadata.title).toBe('Updated Title');
      expect(updated?.metadata.description).toBe('A test document'); // Should preserve existing
      expect(updated?.metadata.tags).toEqual(['updated', 'new']);
    });

    it('should return null for non-existent document', async () => {
      const updated = await documentRepository.updateMetadata('non-existent', { title: 'Test' });
      expect(updated).toBeNull();
    });
  });

  describe('getFolderStats', () => {
    it('should return folder statistics', async () => {
      // Create multiple documents
      await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      await documentRepository.create({
        id: 'test-doc-2',
        filename: 'test-image.jpg',
        original_name: 'Test Image.jpg',
        mime_type: 'image/jpeg',
        size: 512000,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify({ title: 'Test Image' }),
      });

      const stats = await documentRepository.getFolderStats(testFolderId);
      expect(stats.totalDocuments).toBe(2);
      expect(stats.totalSize).toBe(1536000); // 1024000 + 512000
      expect(stats.mimeTypes['application/pdf']).toBe(1);
      expect(stats.mimeTypes['image/jpeg']).toBe(1);
    });
  });

  describe('findLargeDocuments', () => {
    it('should find documents larger than specified size', async () => {
      await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      const largeDocuments = await documentRepository.findLargeDocuments(500000);
      expect(largeDocuments).toHaveLength(1);
      expect(largeDocuments[0]?.size).toBeGreaterThan(500000);

      const veryLargeDocuments = await documentRepository.findLargeDocuments(2000000);
      expect(veryLargeDocuments).toHaveLength(0);
    });
  });

  describe('findByDateRange', () => {
    it('should find documents within date range', async () => {
      await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const documents = await documentRepository.findByDateRange(yesterday, tomorrow);
      expect(documents).toHaveLength(1);
    });

    it('should return empty array for documents outside date range', async () => {
      // Test with a future date range that shouldn't include any existing documents
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const documents = await documentRepository.findByDateRange(tomorrow, nextWeek);
      expect(documents).toHaveLength(0);
    });
  });

  describe('getDocumentsForUser', () => {
    it('should return documents from accessible folders', async () => {
      await documentRepository.create({
        id: testDocument.id,
        filename: testDocument.filename,
        original_name: testDocument.originalName,
        mime_type: testDocument.mimeType,
        size: testDocument.size,
        folder_id: testDocument.folderId,
        uploaded_by: testDocument.uploadedBy,
        metadata: JSON.stringify(testDocument.metadata),
      });

      // Mock folder repository
      const mockFolderRepository = {
        getFoldersForUser: jest.fn().mockResolvedValue([
          { id: testFolderId, name: 'Test Folder' }
        ])
      };

      const documents = await documentRepository.getDocumentsForUser(
        'user-1',
        'editor',
        mockFolderRepository
      );
      
      expect(documents).toHaveLength(1);
      expect(mockFolderRepository.getFoldersForUser).toHaveBeenCalledWith('user-1', 'editor');
    });

    it('should return empty array when user has no accessible folders', async () => {
      const mockFolderRepository = {
        getFoldersForUser: jest.fn().mockResolvedValue([])
      };

      const documents = await documentRepository.getDocumentsForUser(
        'user-1',
        'editor',
        mockFolderRepository
      );
      
      expect(documents).toHaveLength(0);
    });
  });
});