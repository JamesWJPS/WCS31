import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { routeSecurity } from '../middleware/security';
import { sanitizeInputs } from '../middleware/sanitization';

const router = Router();
const authController = new AuthController();

/**
 * @route POST /api/auth/login
 * @desc User login
 * @access Public
 */
router.post('/login', 
  ...routeSecurity.auth,
  sanitizeInputs({ body: { stripTags: true, maxLength: 100 } }),
  authController.login
);

/**
 * @route POST /api/auth/register
 * @desc Register new user (admin only)
 * @access Private (Admin)
 */
router.post('/register', 
  ...routeSecurity.users,
  authenticateToken, 
  requireAdmin, 
  authController.register
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', 
  ...routeSecurity.auth,
  authController.refreshToken
);

/**
 * @route GET /api/auth/profile
 * @desc Get user profile
 * @access Private
 */
router.get('/profile', authenticateToken, authController.getProfile as any);

/**
 * @route POST /api/auth/logout
 * @desc User logout
 * @access Private
 */
router.post('/logout', 
  ...routeSecurity.auth,
  authenticateToken, 
  authController.logout
);

export default router;