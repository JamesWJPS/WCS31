import { Request, Response } from 'express';
import { FolderController } from '../../controllers/FolderController';
import { FolderService } from '../../services/FolderService';

// Mock services
jest.mock('../../services/FolderService');

const MockedFolderService = FolderService as jest.MockedClass<typeof FolderService>;

describe('FolderController', () => {
  let folderController: FolderController;
  let mockFolderService: jest.Mocked<FolderService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

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

  beforeEach(() => {
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

    folderController = new FolderController();

    // Setup request and response mocks
    mockRequest = {
      user: mockUser,
      params: {},
      body: {},
      query: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFolders', () => {
    it('should get all folders for user', async () => {
      const folders = [mockFolder];
      mockFolderService.getFoldersForUser.mockResolvedValue(folders);

      await folderController.getFolders(mockRequest as Request, mockResponse as Response);

      expect(mockFolderService.getFoldersForUser).toHaveBeenCalledWith('user-123', 'editor');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          folders,
          count: 1
        }
      });
    });

    it('should handle service errors', async () => {
      mockFolderService.getFoldersForUser.mockRejectedValue(new Error('Service error'));

      await folderController.getFolders(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Service error',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('getFolderTree', () => {
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

      await folderController.getFolderTree(mockRequest as Request, mockResponse as Response);

      expect(mockFolderService.getFolderTree).toHaveBeenCalledWith('user-123', 'editor');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          tree: folderTree,
          count: 1
        }
      });
    });
  });

  describe('createFolder', () => {
    beforeEach(() => {
      mockRequest.body = {
        name: 'New Folder',
        parentId: null,
        isPublic: false,
        permissions: { read: ['user-123'], write: ['user-123'] }
      };
    });

    it('should create a new folder', async () => {
      const newFolder = { ...mockFolder, id: 'folder-new', name: 'New Folder' };
      mockFolderService.createFolder.mockResolvedValue(newFolder);

      await folderController.createFolder(mockRequest as Request, mockResponse as Response);

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
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          folder: newFolder,
          message: 'Folder created successfully'
        }
      });
    });

    it('should return 400 when name is missing', async () => {
      mockRequest.body = {};

      await folderController.createFolder(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_NAME',
          message: 'Folder name is required',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when user lacks permissions', async () => {
      mockFolderService.createFolder.mockRejectedValue(new Error('Insufficient permissions to create folder in this location'));

      await folderController.createFolder(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to create a folder in this location',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('updateFolder', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'folder-123' };
      mockRequest.body = {
        name: 'Updated Folder',
        isPublic: true
      };
    });

    it('should update folder', async () => {
      const updatedFolder = { ...mockFolder, name: 'Updated Folder' };
      mockFolderService.updateFolder.mockResolvedValue(updatedFolder);

      await folderController.updateFolder(mockRequest as Request, mockResponse as Response);

      expect(mockFolderService.updateFolder).toHaveBeenCalledWith(
        'folder-123',
        { name: 'Updated Folder', isPublic: true },
        'user-123',
        'editor'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          folder: updatedFolder,
          message: 'Folder updated successfully'
        }
      });
    });

    it('should return 404 when folder not found', async () => {
      mockFolderService.updateFolder.mockResolvedValue(null);

      await folderController.updateFolder(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FOLDER_NOT_FOUND',
          message: 'Folder not found',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when user lacks permissions', async () => {
      mockFolderService.updateFolder.mockRejectedValue(new Error('Insufficient permissions to update this folder'));

      await folderController.updateFolder(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to update this folder',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('deleteFolder', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'folder-123' };
    });

    it('should delete folder', async () => {
      mockFolderService.deleteFolder.mockResolvedValue(true);

      await folderController.deleteFolder(mockRequest as Request, mockResponse as Response);

      expect(mockFolderService.deleteFolder).toHaveBeenCalledWith('folder-123', 'user-123', 'editor');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Folder deleted successfully'
        }
      });
    });

    it('should return 404 when folder not found', async () => {
      mockFolderService.deleteFolder.mockResolvedValue(false);

      await folderController.deleteFolder(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FOLDER_NOT_FOUND',
          message: 'Folder not found',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when user lacks permissions', async () => {
      mockFolderService.deleteFolder.mockRejectedValue(new Error('Insufficient permissions to delete this folder'));

      await folderController.deleteFolder(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to delete this folder',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when folder is not empty', async () => {
      mockFolderService.deleteFolder.mockRejectedValue(new Error('Cannot delete folder with subfolders. Delete subfolders first.'));

      await folderController.deleteFolder(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FOLDER_NOT_EMPTY',
          message: 'Cannot delete folder with subfolders. Delete subfolders first.',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('checkFolderAccess', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'folder-123' };
    });

    it('should check folder access - granted', async () => {
      mockFolderService.canAccessFolder.mockResolvedValue(true);

      await folderController.checkFolderAccess(mockRequest as Request, mockResponse as Response);

      expect(mockFolderService.canAccessFolder).toHaveBeenCalledWith('folder-123', 'user-123', 'editor');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          folderId: 'folder-123',
          canAccess: true,
          message: 'Access granted'
        }
      });
    });

    it('should check folder access - denied', async () => {
      mockFolderService.canAccessFolder.mockResolvedValue(false);

      await folderController.checkFolderAccess(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          folderId: 'folder-123',
          canAccess: false,
          message: 'Access denied'
        }
      });
    });
  });
});