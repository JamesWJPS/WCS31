import { Request, Response } from 'express';
import { FileService } from '../services/FileService';
import { FolderRepository } from '../models/FolderRepository';

export class FileController {
  private fileService: FileService;
  private folderRepository: FolderRepository;

  constructor() {
    this.fileService = new FileService();
    this.folderRepository = new FolderRepository();
  }

  /**
   * Upload a single file
   */
  uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      const folderId = req.uploadFolderId || req.body.folderId;
      const user = req.user!;
      const metadata = {
        title: req.body.title,
        description: req.body.description,
        tags: req.body.tags ? JSON.parse(req.body.tags) : []
      };

      if (!file) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file provided',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check write permission to folder
      const hasWritePermission = await this.folderRepository.hasWritePermission(
        folderId,
        user.userId,
        user.role
      );

      if (!hasWritePermission) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to upload files to this folder',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await this.fileService.uploadFile(file, folderId, user.userId, metadata);

      res.status(201).json({
        success: true,
        data: {
          document: result.document,
          message: 'File uploaded successfully'
        }
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload file',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Upload multiple files
   */
  uploadMultipleFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      const folderId = req.uploadFolderId || req.body.folderId;
      const user = req.user!;
      const metadata = {
        title: req.body.title,
        description: req.body.description,
        tags: req.body.tags ? JSON.parse(req.body.tags) : []
      };

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILES',
            message: 'No files provided',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check write permission to folder
      const hasWritePermission = await this.folderRepository.hasWritePermission(
        folderId,
        user.userId,
        user.role
      );

      if (!hasWritePermission) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to upload files to this folder',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const results = await this.fileService.uploadMultipleFiles(files, folderId, user.userId, metadata);

      res.status(201).json({
        success: true,
        data: {
          documents: results.map(r => r.document),
          message: `${results.length} files uploaded successfully`
        }
      });
    } catch (error) {
      console.error('Multiple file upload error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload files',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Download/serve a file
   */
  downloadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const documentId = req.params['id']!;
      const user = req.user!;

      const accessResult = await this.fileService.checkFileAccess(documentId, user.userId, user.role);

      if (!accessResult.canAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to access this file',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${accessResult.document.originalName}"`);
      res.setHeader('Content-Type', accessResult.document.mimeType);
      res.setHeader('Content-Length', accessResult.document.size);

      // Send file
      res.sendFile(accessResult.filePath, (err) => {
        if (err) {
          console.error('File download error:', err);
          if (!res.headersSent) {
            res.status(404).json({
              success: false,
              error: {
                code: 'FILE_NOT_FOUND',
                message: 'File not found on disk',
                timestamp: new Date().toISOString()
              }
            });
          }
        }
      });
    } catch (error) {
      console.error('File download error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to download file',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Delete a file
   */
  deleteFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const documentId = req.params['id']!;
      const user = req.user!;

      await this.fileService.deleteFile(documentId, user.userId, user.role);

      res.json({
        success: true,
        data: {
          message: 'File deleted successfully'
        }
      });
    } catch (error) {
      console.error('File deletion error:', error);
      
      if (error instanceof Error && error.message === 'Document not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (error instanceof Error && error.message === 'Insufficient permissions to delete file') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to delete this file',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete file',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get files in a folder
   */
  getFilesInFolder = async (req: Request, res: Response): Promise<void> => {
    try {
      const folderId = req.params['folderId']!;
      const user = req.user!;

      const files = await this.fileService.getFilesInFolder(folderId, user.userId, user.role);

      res.json({
        success: true,
        data: {
          files,
          count: files.length
        }
      });
    } catch (error) {
      console.error('Get files error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch files',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Search files
   */
  searchFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const searchTerm = req.query['q'] as string;
      const user = req.user!;

      if (!searchTerm) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SEARCH_TERM',
            message: 'Search term is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const files = await this.fileService.searchFiles(searchTerm, user.userId, user.role);

      res.json({
        success: true,
        data: {
          files,
          count: files.length,
          searchTerm
        }
      });
    } catch (error) {
      console.error('File search error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to search files',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Update file metadata
   */
  updateFileMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      const documentId = req.params['id']!;
      const user = req.user!;
      const { title, description, tags } = req.body;

      const updatedDocument = await this.fileService.updateFileMetadata(
        documentId,
        { title, description, tags },
        user.userId,
        user.role
      );

      if (!updatedDocument) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          document: updatedDocument,
          message: 'File metadata updated successfully'
        }
      });
    } catch (error) {
      console.error('Update metadata error:', error);
      
      if (error instanceof Error && error.message === 'Document not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (error instanceof Error && error.message === 'Insufficient permissions to update file metadata') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to update this file',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update file metadata',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get folder file statistics
   */
  getFolderStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const folderId = req.params['folderId']!;
      const user = req.user!;

      const stats = await this.fileService.getFolderFileStats(folderId, user.userId, user.role);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get folder stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get folder statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Verify file integrity (admin only)
   */
  verifyFileIntegrity = async (req: Request, res: Response): Promise<void> => {
    try {
      const documentId = req.params['id']!;
      const user = req.user!;

      // Only administrators can verify file integrity
      if (user.role !== 'administrator') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only administrators can verify file integrity',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const isValid = await this.fileService.verifyFileIntegrity(documentId);

      res.json({
        success: true,
        data: {
          documentId,
          isValid,
          message: isValid ? 'File integrity verified' : 'File integrity check failed'
        }
      });
    } catch (error) {
      console.error('File integrity verification error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to verify file integrity',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}