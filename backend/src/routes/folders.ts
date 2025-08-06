import { Router } from 'express';
import { FolderController } from '../controllers/FolderController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const folderController = new FolderController();

// All folder routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/folders
 * @desc Get all folders accessible to user
 * @access Private
 */
router.get('/', folderController.getFolders);

/**
 * @route GET /api/folders/tree
 * @desc Get folder hierarchy tree
 * @access Private
 */
router.get('/tree', folderController.getFolderTree);

/**
 * @route GET /api/folders/public
 * @desc Get public folders (for public website)
 * @access Private
 */
router.get('/public', folderController.getPublicFolders);

/**
 * @route GET /api/folders/:id
 * @desc Get folder by ID
 * @access Private (requires read permission)
 */
router.get('/:id', folderController.getFolder);

/**
 * @route GET /api/folders/:id/contents
 * @desc Get folder contents (subfolders and documents)
 * @access Private (requires read permission)
 */
router.get('/:id/contents', folderController.getFolderContents);

/**
 * @route GET /api/folders/:id/path
 * @desc Get folder path from root
 * @access Private (requires read permission)
 */
router.get('/:id/path', folderController.getFolderPath);

/**
 * @route GET /api/folders/:id/stats
 * @desc Get folder statistics
 * @access Private (requires read permission)
 */
router.get('/:id/stats', folderController.getFolderStatistics);

/**
 * @route POST /api/folders
 * @desc Create a new folder
 * @access Private (requires write permission to parent)
 */
router.post('/', folderController.createFolder);

/**
 * @route PUT /api/folders/:id
 * @desc Update folder details
 * @access Private (requires write permission)
 */
router.put('/:id', folderController.updateFolder);

/**
 * @route PUT /api/folders/:id/permissions
 * @desc Update folder permissions
 * @access Private (requires write permission)
 */
router.put('/:id/permissions', folderController.updateFolderPermissions);

/**
 * @route PUT /api/folders/:id/move
 * @desc Move folder to different parent
 * @access Private (requires write permission to both locations)
 */
router.put('/:id/move', folderController.moveFolder);

/**
 * @route DELETE /api/folders/:id
 * @desc Delete a folder
 * @access Private (requires write permission)
 */
router.delete('/:id', folderController.deleteFolder);

/**
 * @route POST /api/folders/:id/access-check
 * @desc Check if user can access folder
 * @access Private
 */
router.post('/:id/access-check', folderController.checkFolderAccess);

export default router;