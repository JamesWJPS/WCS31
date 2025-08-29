import { Request, Response } from 'express';
import { FolderService } from '../services/FolderService';

export class FolderController {
  private folderService: FolderService;

  constructor() {
    this.folderService = new FolderService();
  }

  /**
   * Get all folders accessible to user
   */
  getFolders = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const folders = await this.folderService.getFoldersForUser(user.userId, user.role);

      res.json({
        success: true,
        data: {
          folders,
          count: folders.length
        }
      });
    } catch (error) {
      console.error('Get folders error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch folders',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get folder hierarchy tree
   */
  getFolderTree = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const folderTree = await this.folderService.getFolderTree(user.userId, user.role);

      res.json({
        success: true,
        data: {
          tree: folderTree,
          count: folderTree.length
        }
      });
    } catch (error) {
      console.error('Get folder tree error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch folder tree',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get public folders (for public website)
   */
  getPublicFolders = async (_req: Request, res: Response): Promise<void> => {
    try {
      const publicFolders = await this.folderService.getPublicFolders();

      res.json({
        success: true,
        data: {
          folders: publicFolders,
          count: publicFolders.length
        }
      });
    } catch (error) {
      console.error('Get public folders error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch public folders',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get folder by ID
   */
  getFolder = async (req: Request, res: Response): Promise<void> => {
    try {
      const folderId = req.params['id']!;
      const user = req.user!;

      const canAccess = await this.folderService.canAccessFolder(folderId, user.userId, user.role);

      if (!canAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to access this folder',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get folder from accessible folders list
      const folders = await this.folderService.getFoldersForUser(user.userId, user.role);
      const folder = folders.find(f => f.id === folderId);

      if (!folder) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FOLDER_NOT_FOUND',
            message: 'Folder not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          folder
        }
      });
    } catch (error) {
      console.error('Get folder error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch folder',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get folder contents (subfolders and documents)
   */
  getFolderContents = async (req: Request, res: Response): Promise<void> => {
    try {
      const folderId = req.params['id']!;
      const user = req.user!;

      const contents = await this.folderService.getFolderContents(folderId, user.userId, user.role);

      res.json({
        success: true,
        data: {
          ...contents,
          folderCount: contents.folders.length,
          documentCount: contents.documents.length
        }
      });
    } catch (error) {
      console.error('Get folder contents error:', error);
      
      if (error instanceof Error && error.message.includes('Insufficient permissions')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to access this folder',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch folder contents',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get folder path from root
   */
  getFolderPath = async (req: Request, res: Response): Promise<void> => {
    try {
      const folderId = req.params['id']!;
      const user = req.user!;

      const path = await this.folderService.getFolderPath(folderId, user.userId, user.role);

      res.json({
        success: true,
        data: {
          path,
          depth: path.length
        }
      });
    } catch (error) {
      console.error('Get folder path error:', error);
      
      if (error instanceof Error && error.message.includes('Insufficient permissions')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to access this folder',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch folder path',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get folder breadcrumbs for navigation
   */
  getFolderBreadcrumbs = async (req: Request, res: Response): Promise<void> => {
    try {
      const folderId = req.params['id']!;
      const user = req.user!;

      const path = await this.folderService.getFolderPath(folderId, user.userId, user.role);

      // Transform path into breadcrumb format with navigation info
      const breadcrumbs = path.map((folder, index) => ({
        id: folder.id,
        name: folder.name,
        isRoot: index === 0 && !folder.parentId,
        isLast: index === path.length - 1,
        level: index,
        url: `/folders/${folder.id}`
      }));

      res.json({
        success: true,
        data: {
          breadcrumbs,
          currentFolder: breadcrumbs[breadcrumbs.length - 1],
          depth: breadcrumbs.length
        }
      });
    } catch (error) {
      console.error('Get folder breadcrumbs error:', error);
      
      if (error instanceof Error && error.message.includes('Insufficient permissions')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to access this folder',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch folder breadcrumbs',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get folder statistics
   */
  getFolderStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const folderId = req.params['id']!;
      const user = req.user!;

      const stats = await this.folderService.getFolderStatistics(folderId, user.userId, user.role);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get folder statistics error:', error);
      
      if (error instanceof Error && error.message.includes('Insufficient permissions')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to access folder statistics',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch folder statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Create a new folder
   */
  createFolder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, parentId, isPublic, permissions } = req.body;
      const user = req.user!;

      if (!name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_NAME',
            message: 'Folder name is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const folder = await this.folderService.createFolder(
        {
          name,
          parentId: parentId || null,
          isPublic: isPublic || false,
          permissions
        },
        user.userId,
        user.role
      );

      res.status(201).json({
        success: true,
        data: {
          folder,
          message: 'Folder created successfully'
        }
      });
    } catch (error) {
      console.error('Create folder error:', error);
      
      if (error instanceof Error && error.message.includes('Insufficient permissions')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to create a folder in this location',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create folder',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Update folder details
   */
  updateFolder = async (req: Request, res: Response): Promise<void> => {
    try {
      const folderId = req.params['id']!;
      const { name, isPublic, permissions } = req.body;
      const user = req.user!;

      const updatedFolder = await this.folderService.updateFolder(
        folderId,
        { name, isPublic, permissions },
        user.userId,
        user.role
      );

      if (!updatedFolder) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FOLDER_NOT_FOUND',
            message: 'Folder not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          folder: updatedFolder,
          message: 'Folder updated successfully'
        }
      });
    } catch (error) {
      console.error('Update folder error:', error);
      
      if (error instanceof Error && error.message.includes('Insufficient permissions')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to update this folder',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update folder',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Update folder permissions
   */
  updateFolderPermissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const folderId = req.params['id']!;
      const { permissions } = req.body;
      const user = req.user!;

      if (!permissions || typeof permissions !== 'object') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PERMISSIONS',
            message: 'Valid permissions object is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const updatedFolder = await this.folderService.updateFolderPermissions(
        folderId,
        permissions,
        user.userId,
        user.role
      );

      if (!updatedFolder) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FOLDER_NOT_FOUND',
            message: 'Folder not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          folder: updatedFolder,
          message: 'Folder permissions updated successfully'
        }
      });
    } catch (error) {
      console.error('Update folder permissions error:', error);
      
      if (error instanceof Error && error.message.includes('Insufficient permissions')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to update folder permissions',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update folder permissions',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Move folder to different parent
   */
  moveFolder = async (req: Request, res: Response): Promise<void> => {
    try {
      const folderId = req.params['id']!;
      const { parentId } = req.body;
      const user = req.user!;

      const movedFolder = await this.folderService.moveFolder(
        folderId,
        parentId || null,
        user.userId,
        user.role
      );

      if (!movedFolder) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FOLDER_NOT_FOUND',
            message: 'Folder not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          folder: movedFolder,
          message: 'Folder moved successfully'
        }
      });
    } catch (error) {
      console.error('Move folder error:', error);
      
      if (error instanceof Error && error.message.includes('Insufficient permissions')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to move this folder',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'MOVE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to move folder',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Delete a folder
   */
  deleteFolder = async (req: Request, res: Response): Promise<void> => {
    try {
      const folderId = req.params['id']!;
      const user = req.user!;

      const deleted = await this.folderService.deleteFolder(folderId, user.userId, user.role);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FOLDER_NOT_FOUND',
            message: 'Folder not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          message: 'Folder deleted successfully'
        }
      });
    } catch (error) {
      console.error('Delete folder error:', error);
      
      if (error instanceof Error && error.message.includes('Insufficient permissions')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to delete this folder',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (error instanceof Error && error.message.includes('Cannot delete folder')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'FOLDER_NOT_EMPTY',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete folder',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Check if user can access folder
   */
  checkFolderAccess = async (req: Request, res: Response): Promise<void> => {
    try {
      const folderId = req.params['id']!;
      const user = req.user!;

      const canAccess = await this.folderService.canAccessFolder(folderId, user.userId, user.role);

      res.json({
        success: true,
        data: {
          folderId,
          canAccess,
          message: canAccess ? 'Access granted' : 'Access denied'
        }
      });
    } catch (error) {
      console.error('Check folder access error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ACCESS_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Failed to check folder access',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}