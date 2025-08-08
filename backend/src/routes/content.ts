import { Router } from 'express';
import { ContentController } from '../controllers/ContentController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/decorators';
import { routeSecurity } from '../middleware/security';
import { sanitizeContent } from '../middleware/sanitization';

const router = Router();
const contentController = new ContentController();

// Public routes (no authentication required)
router.get('/public/:slug', contentController.getContentBySlug);

// Protected routes (authentication required)
router.use(authenticateToken);

// Content CRUD operations
router.get('/', contentController.getContent);
router.get('/:id', contentController.getContentById);
router.post('/', 
  ...routeSecurity.content,
  sanitizeContent,
  requireRole(['administrator', 'editor']), 
  contentController.createContent
);
router.put('/:id', 
  ...routeSecurity.content,
  sanitizeContent,
  requireRole(['administrator', 'editor']), 
  contentController.updateContent
);
router.delete('/:id', 
  ...routeSecurity.content,
  requireRole(['administrator', 'editor']), 
  contentController.deleteContent
);

// Content status management
router.post('/:id/publish', 
  ...routeSecurity.content,
  requireRole(['administrator', 'editor']), 
  contentController.publishContent
);
router.post('/:id/unpublish', 
  ...routeSecurity.content,
  requireRole(['administrator', 'editor']), 
  contentController.unpublishContent
);
router.post('/:id/archive', 
  ...routeSecurity.content,
  requireRole(['administrator', 'editor']), 
  contentController.archiveContent
);

// Content preview
router.get('/:id/preview', contentController.getContentPreview);

// Content versioning
router.get('/:id/versions', requireRole(['administrator', 'editor']), contentController.getContentVersions);
router.post('/:id/restore', requireRole(['administrator', 'editor']), contentController.restoreContentVersion);

export default router;