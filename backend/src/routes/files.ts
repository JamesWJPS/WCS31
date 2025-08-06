import { Router } from 'express';
import { FileController } from '../controllers/FileController';
import { authenticateToken } from '../middleware/auth';
import { uploadSingle, uploadMultiple, validateUploadPermissions } from '../middleware/fileUpload';

const router = Router();
const fileController = new FileController();

// All file routes require authentication
router.use(authenticateToken);

/**
 * @route POST /api/files/upload
 * @desc Upload a single file
 * @access Private (requires write permission to folder)
 */
router.post(
  '/upload',
  validateUploadPermissions,
  uploadSingle('file'),
  fileController.uploadFile
);

/**
 * @route POST /api/files/upload-multiple
 * @desc Upload multiple files
 * @access Private (requires write permission to folder)
 */
router.post(
  '/upload-multiple',
  validateUploadPermissions,
  uploadMultiple('files', 5),
  fileController.uploadMultipleFiles
);

/**
 * @route GET /api/files/:id/download
 * @desc Download a file
 * @access Private (requires read permission to folder)
 */
router.get('/:id/download', fileController.downloadFile);

/**
 * @route DELETE /api/files/:id
 * @desc Delete a file
 * @access Private (requires write permission to folder)
 */
router.delete('/:id', fileController.deleteFile);

/**
 * @route GET /api/files/folder/:folderId
 * @desc Get all files in a folder
 * @access Private (requires read permission to folder)
 */
router.get('/folder/:folderId', fileController.getFilesInFolder);

/**
 * @route GET /api/files/search
 * @desc Search files
 * @access Private (returns only accessible files)
 */
router.get('/search', fileController.searchFiles);

/**
 * @route PUT /api/files/:id/metadata
 * @desc Update file metadata
 * @access Private (requires write permission to folder)
 */
router.put('/:id/metadata', fileController.updateFileMetadata);

/**
 * @route GET /api/files/folder/:folderId/stats
 * @desc Get folder file statistics
 * @access Private (requires read permission to folder)
 */
router.get('/folder/:folderId/stats', fileController.getFolderStats);

/**
 * @route POST /api/files/:id/verify
 * @desc Verify file integrity
 * @access Private (admin only)
 */
router.post('/:id/verify', fileController.verifyFileIntegrity);

export default router;