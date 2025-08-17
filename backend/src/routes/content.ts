import { Router } from 'express';
import { ContentController } from '../controllers/ContentController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/decorators';
import { routeSecurity } from '../middleware/security';
import { sanitizeContent } from '../middleware/sanitization';

const router = Router();
const contentController = new ContentController();

// Public routes (no authentication required)
router.get('/public/:slug', contentController.getContentBySlug.bind(contentController));

// Protected routes (authentication required)
router.use(authenticateToken);

// Content CRUD operations
router.get('/', contentController.getContent.bind(contentController));
router.get('/:id', contentController.getContentById.bind(contentController));
router.post('/', 
  ...routeSecurity.content,
  sanitizeContent,
  requireRole(['administrator', 'editor']), 
  contentController.createContent.bind(contentController)
);
router.put('/:id', 
  ...routeSecurity.content,
  sanitizeContent,
  requireRole(['administrator', 'editor']), 
  contentController.updateContent.bind(contentController)
);
router.delete('/:id', 
  ...routeSecurity.content,
  requireRole(['administrator', 'editor']), 
  contentController.deleteContent.bind(contentController)
);

// Content status management
router.post('/:id/publish', 
  ...routeSecurity.content,
  requireRole(['administrator', 'editor']), 
  contentController.publishContent.bind(contentController)
);
router.post('/:id/unpublish', 
  ...routeSecurity.content,
  requireRole(['administrator', 'editor']), 
  contentController.unpublishContent.bind(contentController)
);
router.post('/:id/archive', 
  ...routeSecurity.content,
  requireRole(['administrator', 'editor']), 
  contentController.archiveContent.bind(contentController)
);

// Content preview
router.get('/:id/preview', contentController.getContentPreview.bind(contentController));

// Content versioning
router.get('/:id/versions', requireRole(['administrator', 'editor']), contentController.getContentVersions.bind(contentController));
router.post('/:id/restore', requireRole(['administrator', 'editor']), contentController.restoreContentVersion.bind(contentController));

export default router;