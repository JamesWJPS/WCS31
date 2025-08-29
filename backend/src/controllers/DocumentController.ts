import { Request, Response } from 'express';
import { DocumentService } from '../services/DocumentService';
import { FileService } from '../services/FileService';

export class DocumentController {
  private documentService: DocumentService;
  private fileService: FileService;

  constructor() {
    this.documentService = new DocumentService();
    this.fileService = new FileService();
  }

  /**
   * Upload a single document
   */
  uploadDocument = async (req: Request, res: Response): Promise<void> => {
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
            message: 'No document provided',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!folderId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_FOLDER',
            message: 'Folder ID is required',
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
          message: 'Document uploaded successfully'
        }
      });
    } catch (error) {
      console.error('Document upload error:', error);
      
      if (error instanceof Error && error.message === 'Insufficient permissions to upload to this folder') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to upload documents to this folder',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload document',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Upload multiple documents (bulk upload)
   */
  uploadBulkDocuments = async (req: Request, res: Response): Promise<void> => {
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
            message: 'No documents provided',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!folderId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_FOLDER',
            message: 'Folder ID is required',
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
          count: results.length,
          message: `${results.length} documents uploaded successfully`
        }
      });
    } catch (error) {
      console.error('Bulk document upload error:', error);
      
      if (error instanceof Error && error.message === 'Insufficient permissions to upload to this folder') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to upload documents to this folder',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload documents',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get all documents accessible to user with filtering and sorting
   */
  getDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      
      // Extract query parameters for filtering and sorting
      const {
        folderId,
        mimeType,
        startDate,
        endDate,
        minSize,
        maxSize,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = '1',
        limit = '50'
      } = req.query;

      const filters: {
        folderId?: string;
        mimeType?: string;
        startDate?: Date;
        endDate?: Date;
        minSize?: number;
        maxSize?: number;
      } = {};

      if (folderId) filters.folderId = folderId as string;
      if (mimeType) filters.mimeType = mimeType as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (minSize) filters.minSize = parseInt(minSize as string);
      if (maxSize) filters.maxSize = parseInt(maxSize as string);

      const sorting = {
        sortBy: sortBy as 'name' | 'size' | 'createdAt' | 'mimeType',
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const pagination = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const result = await this.documentService.getDocumentsForUserWithFilters(
        user.userId, 
        user.role, 
        filters, 
        sorting, 
        pagination
      );

      res.json({
        success: true,
        data: {
          documents: result.documents,
          count: result.documents.length,
          totalCount: result.totalCount,
          page: pagination.page,
          totalPages: Math.ceil(result.totalCount / pagination.limit),
          filters,
          sorting
        }
      });
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch documents',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get document by ID
   */
  getDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const documentId = req.params['id']!;
      const user = req.user!;

      const accessResult = await this.fileService.checkFileAccess(documentId, user.userId, user.role);

      if (!accessResult.canAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to access this document',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          document: accessResult.document
        }
      });
    } catch (error) {
      console.error('Get document error:', error);
      
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

      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch document',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Download a document
   */
  downloadDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const documentId = req.params['id']!;
      const user = req.user!;

      const accessResult = await this.fileService.checkFileAccess(documentId, user.userId, user.role);

      if (!accessResult.canAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to download this document',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${accessResult.document.originalName}"`);
      res.setHeader('Content-Type', accessResult.document.mimeType);
      res.setHeader('Content-Length', accessResult.document.size);

      // Send file
      res.sendFile(accessResult.filePath, (err) => {
        if (err) {
          console.error('Document download error:', err);
          if (!res.headersSent) {
            res.status(404).json({
              success: false,
              error: {
                code: 'FILE_NOT_FOUND',
                message: 'Document file not found on disk',
                timestamp: new Date().toISOString()
              }
            });
          }
        }
      });
    } catch (error) {
      console.error('Document download error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to download document',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Update document metadata
   */
  updateDocumentMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      const documentId = req.params['id']!;
      const user = req.user!;
      const { title, description, tags } = req.body;

      const updatedDocument = await this.documentService.updateDocumentMetadata(
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
          message: 'Document metadata updated successfully'
        }
      });
    } catch (error) {
      console.error('Update document metadata error:', error);
      
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

      if (error instanceof Error && error.message.includes('Insufficient permissions')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to update this document',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update document metadata',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Move document to different folder
   */
  moveDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const documentId = req.params['id']!;
      const { folderId: newFolderId } = req.body;
      const user = req.user!;

      if (!newFolderId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FOLDER_ID',
            message: 'New folder ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const movedDocument = await this.documentService.moveDocument(
        documentId,
        newFolderId,
        user.userId,
        user.role
      );

      if (!movedDocument) {
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
          document: movedDocument,
          message: 'Document moved successfully'
        }
      });
    } catch (error) {
      console.error('Move document error:', error);
      
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

      if (error instanceof Error && error.message.includes('Insufficient permissions')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to move this document',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'MOVE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to move document',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Delete a document
   */
  deleteDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const documentId = req.params['id']!;
      const user = req.user!;

      await this.fileService.deleteFile(documentId, user.userId, user.role);

      res.json({
        success: true,
        data: {
          message: 'Document deleted successfully'
        }
      });
    } catch (error) {
      console.error('Delete document error:', error);
      
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

      if (error instanceof Error && error.message.includes('Insufficient permissions')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to delete this document',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete document',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Delete multiple documents (bulk delete)
   */
  deleteBulkDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { documentIds } = req.body;
      const user = req.user!;

      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DOCUMENT_IDS',
            message: 'Document IDs array is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const results = [];
      const errors = [];

      for (const documentId of documentIds) {
        try {
          await this.fileService.deleteFile(documentId, user.userId, user.role);
          results.push({ documentId, success: true });
        } catch (error) {
          errors.push({
            documentId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        data: {
          deleted: results.length,
          errorCount: errors.length,
          results,
          errors: errors.length > 0 ? errors : undefined,
          message: `${results.length} documents deleted successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
        }
      });
    } catch (error) {
      console.error('Bulk delete documents error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete documents',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Search documents with advanced filtering and sorting
   */
  searchDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const searchTerm = req.query['q'] as string;
      const searchType = (req.query['type'] as 'name' | 'metadata' | 'tags' | 'all') || 'all';
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

      // Extract additional filters and sorting
      const {
        folderId,
        mimeType,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = '1',
        limit = '50'
      } = req.query;

      const filters: {
        folderId?: string;
        mimeType?: string;
        startDate?: Date;
        endDate?: Date;
      } = {};

      if (folderId) filters.folderId = folderId as string;
      if (mimeType) filters.mimeType = mimeType as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const sorting = {
        sortBy: sortBy as 'name' | 'size' | 'createdAt' | 'mimeType',
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const pagination = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const result = await this.documentService.searchDocumentsAdvanced(
        searchTerm,
        user.userId,
        user.role,
        searchType,
        filters,
        sorting,
        pagination
      );

      res.json({
        success: true,
        data: {
          documents: result.documents,
          count: result.documents.length,
          totalCount: result.totalCount,
          page: pagination.page,
          totalPages: Math.ceil(result.totalCount / pagination.limit),
          searchTerm,
          searchType,
          filters,
          sorting
        }
      });
    } catch (error) {
      console.error('Search documents error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to search documents',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get documents in a specific folder
   */
  getDocumentsInFolder = async (req: Request, res: Response): Promise<void> => {
    try {
      const folderId = req.params['folderId']!;
      const user = req.user!;

      const documents = await this.documentService.getDocumentsInFolder(folderId, user.userId, user.role);

      res.json({
        success: true,
        data: {
          documents,
          count: documents.length,
          folderId
        }
      });
    } catch (error) {
      console.error('Get documents in folder error:', error);
      
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
          message: error instanceof Error ? error.message : 'Failed to fetch documents',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Move multiple documents to a folder (bulk move)
   */
  bulkMoveDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { documentIds, folderId } = req.body;
      const user = req.user!;

      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DOCUMENT_IDS',
            message: 'Document IDs array is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!folderId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FOLDER_ID',
            message: 'Folder ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const results = [];
      const errors = [];

      for (const documentId of documentIds) {
        try {
          const movedDocument = await this.documentService.moveDocument(
            documentId,
            folderId,
            user.userId,
            user.role
          );
          results.push({ documentId, document: movedDocument, success: true });
        } catch (error) {
          errors.push({
            documentId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        data: {
          moved: results.length,
          errorCount: errors.length,
          results,
          errors: errors.length > 0 ? errors : undefined,
          message: `${results.length} documents moved successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
        }
      });
    } catch (error) {
      console.error('Bulk move documents error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_MOVE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to move documents',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Update metadata for multiple documents (bulk metadata update)
   */
  bulkUpdateMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      const { documentIds, metadata } = req.body;
      const user = req.user!;

      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DOCUMENT_IDS',
            message: 'Document IDs array is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!metadata || typeof metadata !== 'object') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_METADATA',
            message: 'Metadata object is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const results = [];
      const errors = [];

      for (const documentId of documentIds) {
        try {
          const updatedDocument = await this.documentService.updateDocumentMetadata(
            documentId,
            metadata,
            user.userId,
            user.role
          );
          results.push({ documentId, document: updatedDocument, success: true });
        } catch (error) {
          errors.push({
            documentId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        data: {
          updated: results.length,
          errorCount: errors.length,
          results,
          errors: errors.length > 0 ? errors : undefined,
          message: `${results.length} documents updated successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
        }
      });
    } catch (error) {
      console.error('Bulk update metadata error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update document metadata',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}