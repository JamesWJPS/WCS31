import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController';
import { authenticateToken } from '../middleware/auth';
import { uploadSingle, uploadMultiple, validateUploadPermissions } from '../middleware/fileUpload';
import { routeSecurity } from '../middleware/security';
import { sanitizeFileUpload } from '../middleware/sanitization';
import { validateFileUpload } from '../utils/fileValidation';

const router = Router();
const documentController = new DocumentController();

// All document routes require authentication
router.use(authenticateToken);

/**
 * @route POST /api/documents/upload
 * @desc Upload a single document
 * @access Private (requires write permission to folder)
 */
router.post(
  '/upload',
  ...routeSecurity.upload,
  validateUploadPermissions,
  uploadSingle('document'),
  validateFileUpload({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    scanForMalware: true
  }),
  sanitizeFileUpload,
  documentController.uploadDocument
);

/**
 * @route POST /api/documents/upload-bulk
 * @desc Upload multiple documents
 * @access Private (requires write permission to folder)
 */
router.post(
  '/upload-bulk',
  ...routeSecurity.upload,
  validateUploadPermissions,
  uploadMultiple('documents', 10),
  validateFileUpload({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    scanForMalware: true
  }),
  sanitizeFileUpload,
  documentController.uploadBulkDocuments
);

/**
 * @route GET /api/documents/search
 * @desc Search documents
 * @access Private (returns only accessible documents)
 */
router.get('/search', documentController.searchDocuments);

/**
 * @route GET /api/documents
 * @desc Get all documents accessible to user
 * @access Private
 */
router.get('/', documentController.getDocuments);

/**
 * @route GET /api/documents/:id
 * @desc Get document by ID
 * @access Private (requires read permission to folder)
 */
router.get('/:id', documentController.getDocument);

/**
 * @route GET /api/documents/:id/download
 * @desc Download a document
 * @access Private (requires read permission to folder)
 */
router.get('/:id/download', documentController.downloadDocument);

/**
 * @route PUT /api/documents/:id/metadata
 * @desc Update document metadata
 * @access Private (requires write permission to folder)
 */
router.put('/:id/metadata', documentController.updateDocumentMetadata);

/**
 * @route PUT /api/documents/:id/move
 * @desc Move document to different folder
 * @access Private (requires write permission to both folders)
 */
router.put('/:id/move', documentController.moveDocument);

/**
 * @route DELETE /api/documents/:id
 * @desc Delete a document
 * @access Private (requires write permission to folder)
 */
router.delete('/:id', documentController.deleteDocument);

/**
 * @route DELETE /api/documents/bulk
 * @desc Delete multiple documents
 * @access Private (requires write permission to folders)
 */
router.delete('/bulk', documentController.deleteBulkDocuments);

/**
 * @route GET /api/documents/folder/:folderId
 * @desc Get documents in a specific folder
 * @access Private (requires read permission to folder)
 */
router.get('/folder/:folderId', documentController.getDocumentsInFolder);

/**
 * @route POST /api/documents/bulk-move
 * @desc Move multiple documents to a folder
 * @access Private (requires write permission to folders)
 */
router.post('/bulk-move', documentController.bulkMoveDocuments);

/**
 * @route POST /api/documents/bulk-metadata
 * @desc Update metadata for multiple documents
 * @access Private (requires write permission to folders)
 */
router.post('/bulk-metadata', documentController.bulkUpdateMetadata);

export default router;