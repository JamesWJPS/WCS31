import { FolderService } from '../../services/FolderService';
import { FolderRepository } from '../../models/FolderRepository';
import { DocumentRepository } from '../../models/DocumentRepository';
import { Folder } from '../../models/interfaces';

// Mock the repositories
jest.mock('../../models/FolderRepository');
jest.mock('../../models/DocumentRepository');

describe('FolderService', () => {
  let folderService: FolderService;
  let mockFolderRepository: jest.Mocked<FolderRepository>;
  let mockDocumentRepository: jest.Mocked<DocumentRepository>;

  const testFolder: Folder = {
    id: 'folder-1',
    name: 'Test Folder',
    parentId: null,
    isPublic: true,
    permissions: { read: [], write: [] },
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockFolderRepository = new FolderRepository() as jest.Mocked<FolderRepository>;
    mockDocumentRepository = new DocumentRepository() as jest.Mocked<DocumentRepository>;
    
    folderService = new FolderService();
    (folderService as any).folderRepository = mockFolderRepository;
    (folderService as any).documentRepository = mockDocumentRepository;
  });

  describe('createFolder', () => {
    it('should create folder at root level', async () => {
      mockFolderRepository.create.mockResolvedValue(testFolder);

      const result = await folderService.createFolder(
        {
          name: 'Test Folder',
          parentId: null,
          isPublic: true,
        },
        'user-1',
        'editor'
      );

      expect(mockFolderRepository.create).toHaveBeenCalled();
      expect(result).toEqual(testFolder);
    });

    it('should create subfolder when user has write permission on parent', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);
      mockFolderRepository.create.mockResolvedValue({
        ...testFolder,
        parentId: 'parent-folder',
      });

      const result = await folderService.createFolder(
        {
          name: 'Test Subfolder',
          parentId: 'parent-folder',
          isPublic: false,
        },
        'user-1',
        'editor'
      );

      expect(mockFolderRepository.hasWritePermission).toHaveBeenCalledWith(
        'parent-folder',
        'user-1',
        'editor'
      );
      expect(result.parentId).toBe('parent-folder');
    });

    it('should throw error when user lacks permission on parent folder', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(false);

      await expect(
        folderService.createFolder(
          {
            name: 'Test Subfolder',
            parentId: 'parent-folder',
            isPublic: false,
          },
          'user-1',
          'editor'
        )
      ).rejects.toThrow('Insufficient permissions to create folder in this location');

      expect(mockFolderRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getFolderTree', () => {
    it('should return hierarchical folder tree', async () => {
      const folders = [
        { ...testFolder, id: 'root-1', parentId: null },
        { ...testFolder, id: 'child-1', parentId: 'root-1' },
        { ...testFolder, id: 'child-2', parentId: 'root-1' },
        { ...testFolder, id: 'grandchild-1', parentId: 'child-1' },
      ];

      mockFolderRepository.getFoldersForUser.mockResolvedValue(folders);

      const result = await folderService.getFolderTree('user-1', 'editor');

      expect(result).toHaveLength(1); // One root folder
      expect(result[0]?.children).toHaveLength(2); // Two children
      expect(result[0]?.children[0]?.children).toHaveLength(1); // One grandchild
    });
  });

  describe('updateFolder', () => {
    it('should update folder when user has write permission', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);
      mockFolderRepository.update.mockResolvedValue({
        ...testFolder,
        name: 'Updated Folder',
      });

      const result = await folderService.updateFolder(
        'folder-1',
        { name: 'Updated Folder' },
        'user-1',
        'editor'
      );

      expect(mockFolderRepository.update).toHaveBeenCalledWith('folder-1', {
        name: 'Updated Folder',
        updated_at: expect.any(Date),
      });
      expect(result?.name).toBe('Updated Folder');
    });

    it('should throw error when user lacks write permission', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(false);

      await expect(
        folderService.updateFolder(
          'folder-1',
          { name: 'Updated Folder' },
          'user-1',
          'editor'
        )
      ).rejects.toThrow('Insufficient permissions to update this folder');

      expect(mockFolderRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteFolder', () => {
    it('should delete empty folder when user has permission', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);
      mockFolderRepository.findByParent.mockResolvedValue([]);
      mockDocumentRepository.findByFolder.mockResolvedValue([]);
      mockFolderRepository.delete.mockResolvedValue(true);

      const result = await folderService.deleteFolder('folder-1', 'user-1', 'editor');

      expect(mockFolderRepository.delete).toHaveBeenCalledWith('folder-1');
      expect(result).toBe(true);
    });

    it('should throw error when folder has subfolders', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);
      mockFolderRepository.findByParent.mockResolvedValue([testFolder]);

      await expect(
        folderService.deleteFolder('folder-1', 'user-1', 'editor')
      ).rejects.toThrow('Cannot delete folder with subfolders');

      expect(mockFolderRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error when folder has documents', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);
      mockFolderRepository.findByParent.mockResolvedValue([]);
      mockDocumentRepository.findByFolder.mockResolvedValue([
        {
          id: 'doc-1',
          filename: 'test.pdf',
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          folderId: 'folder-1',
          uploadedBy: 'user-1',
          createdAt: new Date(),
          metadata: {},
        },
      ]);

      await expect(
        folderService.deleteFolder('folder-1', 'user-1', 'editor')
      ).rejects.toThrow('Cannot delete folder with documents');

      expect(mockFolderRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error when user lacks permission', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(false);

      await expect(
        folderService.deleteFolder('folder-1', 'user-1', 'editor')
      ).rejects.toThrow('Insufficient permissions to delete this folder');
    });
  });

  describe('moveFolder', () => {
    it('should move folder when user has permissions', async () => {
      mockFolderRepository.hasWritePermission
        .mockResolvedValueOnce(true)  // Source permission
        .mockResolvedValueOnce(true); // Destination permission
      mockFolderRepository.moveFolder.mockResolvedValue({
        ...testFolder,
        parentId: 'new-parent',
      });

      const result = await folderService.moveFolder(
        'folder-1',
        'new-parent',
        'user-1',
        'editor'
      );

      expect(mockFolderRepository.moveFolder).toHaveBeenCalledWith('folder-1', 'new-parent');
      expect(result?.parentId).toBe('new-parent');
    });

    it('should move folder to root', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);
      mockFolderRepository.moveFolder.mockResolvedValue({
        ...testFolder,
        parentId: null,
      });

      const result = await folderService.moveFolder('folder-1', null, 'user-1', 'editor');

      expect(result?.parentId).toBeNull();
    });

    it('should throw error when user lacks source permission', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValueOnce(false);

      await expect(
        folderService.moveFolder('folder-1', 'new-parent', 'user-1', 'editor')
      ).rejects.toThrow('Insufficient permissions to move this folder');
    });

    it('should throw error when user lacks destination permission', async () => {
      mockFolderRepository.hasWritePermission
        .mockResolvedValueOnce(true)  // Source permission
        .mockResolvedValueOnce(false); // Destination permission

      await expect(
        folderService.moveFolder('folder-1', 'new-parent', 'user-1', 'editor')
      ).rejects.toThrow('Insufficient permissions to move folder to this location');
    });
  });

  describe('getFolderContents', () => {
    it('should return folder contents when user has read permission', async () => {
      const subfolders = [{ ...testFolder, id: 'subfolder-1' }];
      const documents = [
        {
          id: 'doc-1',
          filename: 'test.pdf',
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          folderId: 'folder-1',
          uploadedBy: 'user-1',
          createdAt: new Date(),
          metadata: {},
        },
      ];

      mockFolderRepository.hasReadPermission
        .mockResolvedValueOnce(true)  // Main folder permission
        .mockResolvedValueOnce(true); // Subfolder permission
      mockFolderRepository.findByParent.mockResolvedValue(subfolders);
      mockDocumentRepository.findByFolder.mockResolvedValue(documents);

      const result = await folderService.getFolderContents('folder-1', 'user-1', 'editor');

      expect(result.folders).toHaveLength(1);
      expect(result.documents).toHaveLength(1);
    });

    it('should filter out inaccessible subfolders', async () => {
      const subfolders = [
        { ...testFolder, id: 'subfolder-1' },
        { ...testFolder, id: 'subfolder-2' },
      ];

      mockFolderRepository.hasReadPermission
        .mockResolvedValueOnce(true)  // Main folder permission
        .mockResolvedValueOnce(true)  // First subfolder accessible
        .mockResolvedValueOnce(false); // Second subfolder not accessible
      mockFolderRepository.findByParent.mockResolvedValue(subfolders);
      mockDocumentRepository.findByFolder.mockResolvedValue([]);

      const result = await folderService.getFolderContents('folder-1', 'user-1', 'editor');

      expect(result.folders).toHaveLength(1);
      expect(result.folders[0]?.id).toBe('subfolder-1');
    });

    it('should throw error when user lacks read permission', async () => {
      mockFolderRepository.hasReadPermission.mockResolvedValue(false);

      await expect(
        folderService.getFolderContents('folder-1', 'user-1', 'editor')
      ).rejects.toThrow('Insufficient permissions to access this folder');
    });
  });

  describe('updateFolderPermissions', () => {
    it('should update permissions when user has write permission', async () => {
      const newPermissions = { read: ['user-1', 'user-2'], write: ['user-1'] };
      mockFolderRepository.hasWritePermission.mockResolvedValue(true);
      mockFolderRepository.updatePermissions.mockResolvedValue({
        ...testFolder,
        permissions: newPermissions,
      });

      const result = await folderService.updateFolderPermissions(
        'folder-1',
        newPermissions,
        'user-1',
        'editor'
      );

      expect(mockFolderRepository.updatePermissions).toHaveBeenCalledWith(
        'folder-1',
        newPermissions
      );
      expect(result?.permissions).toEqual(newPermissions);
    });

    it('should throw error when user lacks write permission', async () => {
      mockFolderRepository.hasWritePermission.mockResolvedValue(false);

      await expect(
        folderService.updateFolderPermissions(
          'folder-1',
          { read: [], write: [] },
          'user-1',
          'editor'
        )
      ).rejects.toThrow('Insufficient permissions to update folder permissions');
    });
  });

  describe('getFolderPath', () => {
    it('should return folder path when user has read permission', async () => {
      const path = [
        { ...testFolder, id: 'root', name: 'Root' },
        { ...testFolder, id: 'folder-1', name: 'Test Folder' },
      ];

      mockFolderRepository.hasReadPermission.mockResolvedValue(true);
      mockFolderRepository.getFolderPath.mockResolvedValue(path);

      const result = await folderService.getFolderPath('folder-1', 'user-1', 'editor');

      expect(result).toEqual(path);
    });

    it('should throw error when user lacks read permission', async () => {
      mockFolderRepository.hasReadPermission.mockResolvedValue(false);

      await expect(
        folderService.getFolderPath('folder-1', 'user-1', 'editor')
      ).rejects.toThrow('Insufficient permissions to access this folder');
    });
  });

  describe('getPublicFolders', () => {
    it('should return public folders', async () => {
      const publicFolders = [
        { ...testFolder, isPublic: true },
      ];

      mockFolderRepository.findPublicFolders.mockResolvedValue(publicFolders);

      const result = await folderService.getPublicFolders();

      expect(result).toEqual(publicFolders);
    });
  });

  describe('getFolderStatistics', () => {
    it('should return folder statistics when user has read permission', async () => {
      const mockStats = {
        totalDocuments: 5,
        totalSize: 1024000,
        mimeTypes: { 'application/pdf': 3, 'image/jpeg': 2 },
      };
      const subfolders = [testFolder];

      mockFolderRepository.hasReadPermission.mockResolvedValue(true);
      mockDocumentRepository.findByFolder.mockResolvedValue([]);
      mockFolderRepository.findByParent.mockResolvedValue(subfolders);
      mockDocumentRepository.getFolderStats.mockResolvedValue(mockStats);

      const result = await folderService.getFolderStatistics('folder-1', 'user-1', 'editor');

      expect(result).toEqual({
        ...mockStats,
        subfolderCount: 1,
      });
    });

    it('should throw error when user lacks read permission', async () => {
      mockFolderRepository.hasReadPermission.mockResolvedValue(false);

      await expect(
        folderService.getFolderStatistics('folder-1', 'user-1', 'editor')
      ).rejects.toThrow('Insufficient permissions to access folder statistics');
    });
  });
});