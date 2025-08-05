import { Router } from 'express';
import { ContentController } from '../controllers/ContentController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/decorators';

const router = Router();
const contentController = new ContentController();

// Public routes (no authentication required)
router.get('/public/:slug', contentController.getContentBySlug);

// Protected routes (authentication required)
router.use(authenticateToken);

// Content CRUD operations
router.get('/', contentController.getContent);
router.get('/:id', contentController.getContentById);
router.post('/', requireRole(['administrator', 'editor']), contentController.createContent);
router.put('/:id', requireRole(['administrator', 'editor']), contentController.updateContent);
router.delete('/:id', requireRole(['administrator', 'editor']), contentController.deleteContent);

// Content status management
router.post('/:id/publish', requireRole(['administrator', 'editor']), contentController.publishContent);
router.post('/:id/unpublish', requireRole(['administrator', 'editor']), contentController.unpublishContent);
router.post('/:id/archive', requireRole(['administrator', 'editor']), contentController.archiveContent);

// Content preview
router.get('/:id/preview', contentController.getContentPreview);

// Content versioning
router.get('/:id/versions', requireRole(['administrator', 'editor']), contentController.getContentVersions);
router.post('/:id/restore', requireRole(['administrator', 'editor']), contentController.restoreContentVersion);

export default router;