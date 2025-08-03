import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

/**
 * @route POST /api/auth/login
 * @desc User login
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /api/auth/register
 * @desc Register new user (admin only)
 * @access Private (Admin)
 */
router.post('/register', authenticateToken, requireAdmin, authController.register);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', authController.refreshToken);

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
router.post('/logout', authenticateToken, authController.logout);

export default router;