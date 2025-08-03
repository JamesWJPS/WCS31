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
});