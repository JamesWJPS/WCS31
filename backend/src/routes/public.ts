import { Router } from 'express';
import { PublicController } from '../controllers/PublicController';

const router = Router();
const publicController = new PublicController();

// SEO routes
router.get('/sitemap.xml', publicController.generateSitemap.bind(publicController));
router.get('/robots.txt', publicController.generateRobotsTxt.bind(publicController));

// Content routes
router.get('/page/:slug', publicController.renderContentPage.bind(publicController));
router.get('/api/content/:slug', publicController.getContentMetadata.bind(publicController));
router.get('/api/content', publicController.listPublishedContent.bind(publicController));

// Document routes
router.get('/document/:documentId', publicController.getPublicDocument.bind(publicController));
router.get('/api/folder/:folderId/documents', publicController.listPublicDocuments.bind(publicController));

export default router;