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

  describe('getFolderPath', () => {
    it('should return path from root to folder', async () => {
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

      const path = await folderRepository.getFolderPath(testFolder.id);
      expect(path).toHaveLength(2);
      expect(path[0]?.id).toBe(parentId);
      expect(path[1]?.id).toBe(testFolder.id);
    });

    it('should return single folder for root folder', async () => {
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: null,
        is_public: testFolder.isPublic,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      const path = await folderRepository.getFolderPath(testFolder.id);
      expect(path).toHaveLength(1);
      expect(path[0]?.id).toBe(testFolder.id);
    });
  });

  describe('getDescendantFolders', () => {
    it('should return all descendant folders', async () => {
      // Create parent folder
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: null,
        is_public: testFolder.isPublic,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      // Create child folder
      const childId = 'child-folder-1';
      await folderRepository.create({
        id: childId,
        name: 'Child Folder',
        parent_id: testFolder.id,
        is_public: true,
        permissions: JSON.stringify({ read: [], write: [] }),
        created_by: testUserId,
      });

      // Create grandchild folder
      const grandchildId = 'grandchild-folder-1';
      await folderRepository.create({
        id: grandchildId,
        name: 'Grandchild Folder',
        parent_id: childId,
        is_public: true,
        permissions: JSON.stringify({ read: [], write: [] }),
        created_by: testUserId,
      });

      const descendants = await folderRepository.getDescendantFolders(testFolder.id);
      expect(descendants).toHaveLength(2);
      expect(descendants.map(f => f.id)).toContain(childId);
      expect(descendants.map(f => f.id)).toContain(grandchildId);
    });
  });

  describe('canMoveFolder', () => {
    it('should allow moving to root', async () => {
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: null,
        is_public: testFolder.isPublic,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      const canMove = await folderRepository.canMoveFolder(testFolder.id, null);
      expect(canMove).toBe(true);
    });

    it('should prevent moving folder to itself', async () => {
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: null,
        is_public: testFolder.isPublic,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      const canMove = await folderRepository.canMoveFolder(testFolder.id, testFolder.id);
      expect(canMove).toBe(false);
    });

    it('should prevent circular references', async () => {
      // Create parent folder
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: null,
        is_public: testFolder.isPublic,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      // Create child folder
      const childId = 'child-folder-1';
      await folderRepository.create({
        id: childId,
        name: 'Child Folder',
        parent_id: testFolder.id,
        is_public: true,
        permissions: JSON.stringify({ read: [], write: [] }),
        created_by: testUserId,
      });

      // Try to move parent to child (would create circular reference)
      const canMove = await folderRepository.canMoveFolder(testFolder.id, childId);
      expect(canMove).toBe(false);
    });
  });

  describe('moveFolder', () => {
    it('should move folder to new parent', async () => {
      // Create folders
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: null,
        is_public: testFolder.isPublic,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      const newParentId = 'new-parent-1';
      await folderRepository.create({
        id: newParentId,
        name: 'New Parent',
        parent_id: null,
        is_public: true,
        permissions: JSON.stringify({ read: [], write: [] }),
        created_by: testUserId,
      });

      const moved = await folderRepository.moveFolder(testFolder.id, newParentId);
      expect(moved?.parentId).toBe(newParentId);
    });

    it('should throw error for circular reference', async () => {
      // Create parent and child
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: null,
        is_public: testFolder.isPublic,
        permissions: JSON.stringify(testFolder.permissions),
        created_by: testFolder.createdBy,
      });

      const childId = 'child-folder-1';
      await folderRepository.create({
        id: childId,
        name: 'Child Folder',
        parent_id: testFolder.id,
        is_public: true,
        permissions: JSON.stringify({ read: [], write: [] }),
        created_by: testUserId,
      });

      await expect(folderRepository.moveFolder(testFolder.id, childId))
        .rejects.toThrow('Cannot move folder: would create circular reference');
    });
  });

  describe('permission methods', () => {
    beforeEach(async () => {
      await folderRepository.create({
        id: testFolder.id,
        name: testFolder.name,
        parent_id: testFolder.parentId,
        is_public: false, // Private folder
        permissions: JSON.stringify({
          read: ['user-1', 'user-2'],
          write: ['user-1'],
        }),
        created_by: testUserId,
      });
    });

    describe('hasReadPermission', () => {
      it('should allow administrators to read any folder', async () => {
        const hasPermission = await folderRepository.hasReadPermission(
          testFolder.id,
          'any-user',
          'administrator'
        );
        expect(hasPermission).toBe(true);
      });

      it('should allow reading public folders', async () => {
        await folderRepository.update(testFolder.id, { is_public: true });
        
        const hasPermission = await folderRepository.hasReadPermission(
          testFolder.id,
          'any-user',
          'editor'
        );
        expect(hasPermission).toBe(true);
      });

      it('should allow users with explicit read permission', async () => {
        const hasPermission = await folderRepository.hasReadPermission(
          testFolder.id,
          'user-1',
          'editor'
        );
        expect(hasPermission).toBe(true);
      });

      it('should deny users without permission', async () => {
        const hasPermission = await folderRepository.hasReadPermission(
          testFolder.id,
          'user-3',
          'editor'
        );
        expect(hasPermission).toBe(false);
      });
    });

    describe('hasWritePermission', () => {
      it('should allow administrators to write to any folder', async () => {
        const hasPermission = await folderRepository.hasWritePermission(
          testFolder.id,
          'any-user',
          'administrator'
        );
        expect(hasPermission).toBe(true);
      });

      it('should allow folder creator to write', async () => {
        const hasPermission = await folderRepository.hasWritePermission(
          testFolder.id,
          testUserId,
          'editor'
        );
        expect(hasPermission).toBe(true);
      });

      it('should allow users with explicit write permission', async () => {
        const hasPermission = await folderRepository.hasWritePermission(
          testFolder.id,
          'user-1',
          'editor'
        );
        expect(hasPermission).toBe(true);
      });

      it('should deny users without write permission', async () => {
        const hasPermission = await folderRepository.hasWritePermission(
          testFolder.id,
          'user-2',
          'editor'
        );
        expect(hasPermission).toBe(false);
      });
    });

    describe('getFoldersForUser', () => {
      it('should return all folders for administrators', async () => {
        const folders = await folderRepository.getFoldersForUser('any-user', 'administrator');
        expect(folders).toHaveLength(1);
      });

      it('should return accessible folders for regular users', async () => {
        // Create public folder
        await folderRepository.create({
          id: 'public-folder-1',
          name: 'Public Folder',
          parent_id: null,
          is_public: true,
          permissions: JSON.stringify({ read: [], write: [] }),
          created_by: testUserId,
        });

        const folders = await folderRepository.getFoldersForUser('user-1', 'editor');
        expect(folders).toHaveLength(2); // Private folder (has permission) + public folder
      });

      it('should return only accessible folders', async () => {
        const folders = await folderRepository.getFoldersForUser('user-3', 'editor');
        expect(folders).toHaveLength(0); // No access to private folder
      });
    });
  });
});