import { FolderRepository } from '../../models/FolderRepository';
import { UserRepository } from '../../models/UserRepository';
import { Folder } from '../../models/interfaces';
import db from '../../config/database';

describe('FolderRepository', () => {
  let folderRepository: FolderRepository;
  let userRepository: UserRepository;
  let testFolder: Folder;
  let testUserId: string;

  beforeAll(async () => {
    await db.migrate.latest();
    folderRepository = new FolderRepository();
    userRepository = new UserRepository();
  });

  beforeEach(async () => {
    // Clean up before each test
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

    testFolder = {
      id: 'test-folder-1',
      name: 'Test Folder',
      parentId: null,
      isPublic: true,
      permissions: {
        read: ['user-1', 'user-2'],
        write: ['user-1'],
      },
      createdBy: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('create', () => {
    it('should create new folder', async () => {
      const created = await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: testFolder.parentId,
        is_public: testFolder.isPublic,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      expect(created.id).toBe(testFolder.id);
      expect(created.name).toBe(testFolder.name);
      expect(created.parentId).toBe(testFolder.parentId);
      expect(created.isPublic).toBe(testFolder.isPublic);
      expect(created.permissions).toEqual(testFolder.permissions);
      expect(created.createdBy).toBe(testFolder.createdBy);
    });
  });

  describe('findByParent', () => {
    it('should find folders by parent (root folders)', async () => {
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: null,
        is_public: testFolder.isPublic,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      const found = await folderRepository.findByParent(null);
      expect(found).toHaveLength(1);
      expect(found[0]?.parentId).toBeNull();
    });

    it('should find folders by parent (subfolders)', async () => {
      // Create parent folder
      const parentId = 'parent-folder-1';
      await folderRepository.create({
        id: parentId,
        name: 'Parent Folder',
        parent_id: null,
        is_public: true,
        permissions: JSON.stringify({ read: [], write: [] }),
        created_by: testUserId,
      });

      // Create child folder
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: parentId,
        is_public: testFolder.isPublic,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      const found = await folderRepository.findByParent(parentId);
      expect(found).toHaveLength(1);
      expect(found[0]?.parentId).toBe(parentId);
    });
  });

  describe('findPublicFolders', () => {
    it('should find only public folders', async () => {
      // Create public folder
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: testFolder.parentId,
        is_public: true,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      // Create private folder
      await folderRepository.create({
        id: 'private-folder-1',
        name: 'Private Folder',
        parent_id: null,
        is_public: false,
        permissions: JSON.stringify({ read: [], write: [] }),
        created_by: testUserId,
      });

      const publicFolders = await folderRepository.findPublicFolders();
      expect(publicFolders).toHaveLength(1);
      expect(publicFolders[0]?.isPublic).toBe(true);
    });
  });

  describe('findByCreator', () => {
    it('should find folders by creator', async () => {
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: testFolder.parentId,
        is_public: testFolder.isPublic,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      const found = await folderRepository.findByCreator(testUserId);
      expect(found).toHaveLength(1);
      expect(found[0]?.createdBy).toBe(testUserId);
    });
  });

  describe('updatePermissions', () => {
    it('should update folder permissions', async () => {
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: testFolder.parentId,
        is_public: testFolder.isPublic,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      const newPermissions = {
        read: ['user-1', 'user-2', 'user-3'],
        write: ['user-1', 'user-2'],
      };

      const updated = await folderRepository.updatePermissions(testFolder.id, newPermissions);
      expect(updated?.permissions).toEqual(newPermissions);
    });
  });

  describe('update', () => {
    it('should update folder properties', async () => {
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: testFolder.parentId,
        is_public: testFolder.isPublic,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      const updated = await folderRepository.update(testFolder.id, {
        name: 'Updated Folder Name',
        is_public: false,
      });

      expect(updated?.name).toBe('Updated Folder Name');
      expect(updated?.isPublic).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete folder', async () => {
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: testFolder.parentId,
        is_public: testFolder.isPublic,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      const deleted = await folderRepository.delete(testFolder.id);
      expect(deleted).toBe(true);

      const found = await folderRepository.findById(testFolder.id);
      expect(found).toBeNull();
    });
  });
});