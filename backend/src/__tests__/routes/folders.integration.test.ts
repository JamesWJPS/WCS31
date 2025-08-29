import request from 'supertest';
import express from 'express';
import { folderRoutes } from '../../routes';
import { authenticateToken } from '../../middleware/auth';
import { FolderService } from '../../services/FolderService';

// Mock services
jest.mock('../../services/FolderService');
jest.mock('../../middleware/auth');

const MockedFolderService = FolderService as jest.MockedClass<typeof FolderService>;
const mockedAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

describe('Folder Routes Integration Tests', () => {
  let app: express.Application;
  let mockFolderService: jest.Mocked<FolderService>;

  const mockUser = {
    userId: 'user-123',
    username: 'testuser',
    role: 'editor' as const
  };

  const mockFolder = {
    id: 'folder-123',
    name: 'Test Folder',
    parentId: null,
    isPublic: false,
    permissions: {
      read: ['user-123'],
      write: ['user-123']
    },
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date()
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
    app.use('/api/folders', folderRoutes);

    // Reset mocks
    jest.clearAllMocks();

    // Setup service mocks
    mockFolderService = {
      getFoldersForUser: jest.fn(),
      getFolderTree: jest.fn(),
      getPublicFolders: jest.fn(),
      canAccessFolder: jest.fn(),
      getFolderContents: jest.fn(),
      getFolderPath: jest.fn(),
      getFolderStatistics: jest.fn(),
      createFolder: jest.fn(),
      updateFolder: jest.fn(),
      updateFolderPermissions: jest.fn(),
      moveFolder: jest.fn(),
      deleteFolder: jest.fn(),
    } as any;

    MockedFolderService.mockImplementation(() => mockFolderService);

    // Setup middleware mocks
    mockedAuthenticateToken.mockImplementation(async (req, _res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe('GET /api/folders', () => {
    it('should get all folders for user', async () => {
      const folders = [mockFolder];
      mockFolderService.getFoldersForUser.mockResolvedValue(folders);

      const response = await request(app)
        .get('/api/folders');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.folders).toEqual(folders);
      expect(response.body.data.count).toBe(1);
      expect(mockFolderService.getFoldersForUser).toHaveBeenCalledWith('user-123', 'editor');
    });
  });

  describe('GET /api/folders/tree', () => {
    it('should get folder hierarchy tree', async () => {
      const folderTree = [
        {
          ...mockFolder,
          children: [
            { ...mockFolder, id: 'folder-child', parentId: 'folder-123', children: [] }
          ]
        }
      ];
      mockFolderService.getFolderTree.mockResolvedValue(folderTree);

      const response = await request(app)
        .get('/api/folders/tree');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tree).toEqual(folderTree);
      expect(response.body.data.count).toBe(1);
      expect(mockFolderService.getFolderTree).toHaveBeenCalledWith('user-123', 'editor');
    });
  });

  describe('GET /api/folders/public', () => {
    it('should get public folders', async () => {
      const publicFolders = [{ ...mockFolder, isPublic: true }];
      mockFolderService.getPublicFolders.mockResolvedValue(publicFolders);

      const response = await request(app)
        .get('/api/folders/public');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.folders).toEqual(publicFolders);
      expect(response.body.data.count).toBe(1);
      expect(mockFolderService.getPublicFolders).toHaveBeenCalled();
    });
  });

  describe('GET /api/folders/:id', () => {
    it('should get folder by ID', async () => {
      mockFolderService.canAccessFolder.mockResolvedValue(true);
      mockFolderService.getFoldersForUser.mockResolvedValue([mockFolder]);

      const response = await request(app)
        .get('/api/folders/folder-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.folder).toEqual(mockFolder);
      expect(mockFolderService.canAccessFolder).toHaveBeenCalledWith('folder-123', 'user-123', 'editor');
    });

    it('should return 403 if user lacks access', async () => {
      mockFolderService.canAccessFolder.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/folders/folder-123');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should return 404 if folder not found', async () => {
      mockFolderService.canAccessFolder.mockResolvedValue(true);
      mockFolderService.getFoldersForUser.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/folders/folder-123');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FOLDER_NOT_FOUND');
    });
  });

  describe('GET /api/folders/:id/contents', () => {
    it('should get folder contents', async () => {
      const contents = {
        folders: [{ ...mockFolder, id: 'subfolder-123', parentId: 'folder-123' }],
        documents: [mockDocument]
      };
      mockFolderService.getFolderContents.mockResolvedValue(contents);

      const response = await request(app)
        .get('/api/folders/folder-123/contents');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.folders).toEqual(contents.folders);
      expect(response.body.data.documents).toEqual(contents.documents);
      expect(response.body.data.folderCount).toBe(1);
      expect(response.body.data.documentCount).toBe(1);
      expect(mockFolderService.getFolderContents).toHaveBeenCalledWith('folder-123', 'user-123', 'editor');
    });

    it('should return 403 if user lacks permissions', async () => {
      mockFolderService.getFolderContents.mockRejectedValue(new Error('Insufficient permissions to access this folder'));

      const response = await request(app)
        .get('/api/folders/folder-123/contents');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('GET /api/folders/:id/breadcrumbs', () => {
    it('should get folder breadcrumbs for navigation', async () => {
      const path = [
        { ...mockFolder, id: 'root', name: 'Root', parentId: null },
        { ...mockFolder, id: 'parent', name: 'Parent', parentId: 'root' },
        { ...mockFolder, id: 'folder-123', name: 'Current', parentId: 'parent' }
      ];
      mockFolderService.getFolderPath.mockResolvedValue(path);

      const response = await request(app)
        .get('/api/folders/folder-123/breadcrumbs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.breadcrumbs).toHaveLength(3);
      expect(response.body.data.breadcrumbs[0]).toMatchObject({
        id: 'root',
        name: 'Root',
        isRoot: true,
        isLast: false,
        level: 0
      });
      expect(response.body.data.breadcrumbs[2]).toMatchObject({
        id: 'folder-123',
        name: 'Current',
        isRoot: false,
        isLast: true,
        level: 2
      });
      expect(response.body.data.currentFolder.id).toBe('folder-123');
      expect(response.body.data.depth).toBe(3);
      expect(mockFolderService.getFolderPath).toHaveBeenCalledWith('folder-123', 'user-123', 'editor');
    });

    it('should return 403 if user lacks permissions', async () => {
      mockFolderService.getFolderPath.mockRejectedValue(new Error('Insufficient permissions to access this folder'));

      const response = await request(app)
        .get('/api/folders/folder-123/breadcrumbs');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('GET /api/folders/:id/path', () => {
    it('should get folder path', async () => {
      const path = [
        { ...mockFolder, id: 'root', name: 'Root' },
        { ...mockFolder, id: 'parent', name: 'Parent', parentId: 'root' },
        { ...mockFolder, id: 'folder-123', name: 'Current', parentId: 'parent' }
      ];
      mockFolderService.getFolderPath.mockResolvedValue(path);

      const response = await request(app)
        .get('/api/folders/folder-123/path');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.path).toEqual(path);
      expect(response.body.data.depth).toBe(3);
      expect(mockFolderService.getFolderPath).toHaveBeenCalledWith('folder-123', 'user-123', 'editor');
    });
  });

  describe('GET /api/folders/:id/stats', () => {
    it('should get folder statistics', async () => {
      const stats = {
        totalDocuments: 5,
        totalSize: 10240,
        subfolderCount: 2,
        mimeTypes: { 'application/pdf': 3, 'image/jpeg': 2 }
      };
      mockFolderService.getFolderStatistics.mockResolvedValue(stats);

      const response = await request(app)
        .get('/api/folders/folder-123/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(stats);
      expect(mockFolderService.getFolderStatistics).toHaveBeenCalledWith('folder-123', 'user-123', 'editor');
    });
  });

  describe('POST /api/folders', () => {
    it('should create a new folder', async () => {
      const newFolder = { ...mockFolder, id: 'folder-new', name: 'New Folder' };
      mockFolderService.createFolder.mockResolvedValue(newFolder);

      const response = await request(app)
        .post('/api/folders')
        .send({
          name: 'New Folder',
          parentId: null,
          isPublic: false,
          permissions: { read: ['user-123'], write: ['user-123'] }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.folder).toEqual(newFolder);
      expect(mockFolderService.createFolder).toHaveBeenCalledWith(
        {
          name: 'New Folder',
          parentId: null,
          isPublic: false,
          permissions: { read: ['user-123'], write: ['user-123'] }
        },
        'user-123',
        'editor'
      );
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/folders')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_NAME');
    });

    it('should return 403 if user lacks permissions', async () => {
      mockFolderService.createFolder.mockRejectedValue(new Error('Insufficient permissions to create folder in this location'));

      const response = await request(app)
        .post('/api/folders')
        .send({ name: 'New Folder' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('PUT /api/folders/:id', () => {
    it('should update folder', async () => {
      const updatedFolder = { ...mockFolder, name: 'Updated Folder' };
      mockFolderService.updateFolder.mockResolvedValue(updatedFolder);

      const response = await request(app)
        .put('/api/folders/folder-123')
        .send({
          name: 'Updated Folder',
          isPublic: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.folder).toEqual(updatedFolder);
      expect(mockFolderService.updateFolder).toHaveBeenCalledWith(
        'folder-123',
        { name: 'Updated Folder', isPublic: true },
        'user-123',
        'editor'
      );
    });

    it('should return 404 if folder not found', async () => {
      mockFolderService.updateFolder.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/folders/folder-123')
        .send({ name: 'Updated Folder' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FOLDER_NOT_FOUND');
    });
  });

  describe('PUT /api/folders/:id/permissions', () => {
    it('should update folder permissions', async () => {
      const updatedFolder = { ...mockFolder, permissions: { read: ['user-123', 'user-456'], write: ['user-123'] } };
      mockFolderService.updateFolderPermissions.mockResolvedValue(updatedFolder);

      const response = await request(app)
        .put('/api/folders/folder-123/permissions')
        .send({
          permissions: { read: ['user-123', 'user-456'], write: ['user-123'] }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.folder).toEqual(updatedFolder);
      expect(mockFolderService.updateFolderPermissions).toHaveBeenCalledWith(
        'folder-123',
        { read: ['user-123', 'user-456'], write: ['user-123'] },
        'user-123',
        'editor'
      );
    });

    it('should return 400 if permissions are invalid', async () => {
      const response = await request(app)
        .put('/api/folders/folder-123/permissions')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PERMISSIONS');
    });
  });

  describe('PUT /api/folders/:id/move', () => {
    it('should move folder', async () => {
      const movedFolder = { ...mockFolder, parentId: 'folder-456' };
      mockFolderService.moveFolder.mockResolvedValue(movedFolder);

      const response = await request(app)
        .put('/api/folders/folder-123/move')
        .send({ parentId: 'folder-456' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.folder).toEqual(movedFolder);
      expect(mockFolderService.moveFolder).toHaveBeenCalledWith(
        'folder-123',
        'folder-456',
        'user-123',
        'editor'
      );
    });

    it('should move folder to root when parentId is null', async () => {
      const movedFolder = { ...mockFolder, parentId: null };
      mockFolderService.moveFolder.mockResolvedValue(movedFolder);

      const response = await request(app)
        .put('/api/folders/folder-123/move')
        .send({ parentId: null });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockFolderService.moveFolder).toHaveBeenCalledWith(
        'folder-123',
        null,
        'user-123',
        'editor'
      );
    });
  });

  describe('DELETE /api/folders/:id', () => {
    it('should delete folder', async () => {
      mockFolderService.deleteFolder.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/folders/folder-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockFolderService.deleteFolder).toHaveBeenCalledWith('folder-123', 'user-123', 'editor');
    });

    it('should return 404 if folder not found', async () => {
      mockFolderService.deleteFolder.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/folders/folder-123');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FOLDER_NOT_FOUND');
    });

    it('should return 403 if user lacks permissions', async () => {
      mockFolderService.deleteFolder.mockRejectedValue(new Error('Insufficient permissions to delete this folder'));

      const response = await request(app)
        .delete('/api/folders/folder-123');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return 400 if folder is not empty', async () => {
      mockFolderService.deleteFolder.mockRejectedValue(new Error('Cannot delete folder with subfolders. Delete subfolders first.'));

      const response = await request(app)
        .delete('/api/folders/folder-123');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FOLDER_NOT_EMPTY');
    });
  });

  describe('POST /api/folders/:id/access-check', () => {
    it('should check folder access - granted', async () => {
      mockFolderService.canAccessFolder.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/folders/folder-123/access-check');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.canAccess).toBe(true);
      expect(response.body.data.message).toBe('Access granted');
      expect(mockFolderService.canAccessFolder).toHaveBeenCalledWith('folder-123', 'user-123', 'editor');
    });

    it('should check folder access - denied', async () => {
      mockFolderService.canAccessFolder.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/folders/folder-123/access-check');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.canAccess).toBe(false);
      expect(response.body.data.message).toBe('Access denied');
    });
  });
});