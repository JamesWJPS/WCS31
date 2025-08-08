import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticateToken, requireAdmin, Permission } from '../middleware/auth';
import { requirePermissions, conditionalAuth } from '../middleware/decorators';
import { routeSecurity } from '../middleware/security';

const router = Router();
const userController = new UserController();

/**
 * @route GET /api/users
 * @desc Get paginated list of users with search and filtering
 * @access Private (Admin only)
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 10, max: 100)
 * @query search - Search term for username/email
 * @query role - Filter by user role
 * @query isActive - Filter by active status
 */
router.get(
  '/',
  authenticateToken,
  requireAdmin,
  userController.getUsers
);

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Private (Admin or self)
 */
router.get(
  '/:id',
  authenticateToken,
  conditionalAuth({
    permissions: [Permission.READ_USER],
    allowSelf: true,
    adminOverride: true,
    paramName: 'id'
  }),
  userController.getUserById as any
);

/**
 * @route POST /api/users
 * @desc Create new user
 * @access Private (Admin only)
 */
router.post(
  '/',
  ...routeSecurity.users,
  authenticateToken,
  requirePermissions([Permission.CREATE_USER]),
  userController.createUser
);

/**
 * @route PUT /api/users/:id
 * @desc Update user (admin only - full update including role and status)
 * @access Private (Admin only)
 */
router.put(
  '/:id',
  ...routeSecurity.users,
  authenticateToken,
  requirePermissions([Permission.UPDATE_USER]),
  userController.updateUser
);

/**
 * @route PATCH /api/users/:id/profile
 * @desc Update user profile (self-service - limited fields)
 * @access Private (Admin or self)
 */
router.patch(
  '/:id/profile',
  ...routeSecurity.users,
  authenticateToken,
  conditionalAuth({
    allowSelf: true,
    adminOverride: true,
    paramName: 'id'
  }),
  userController.updateProfile as any
);

/**
 * @route PATCH /api/users/:id/password
 * @desc Change user password
 * @access Private (Admin or self)
 */
router.patch(
  '/:id/password',
  ...routeSecurity.users,
  authenticateToken,
  conditionalAuth({
    allowSelf: true,
    adminOverride: true,
    paramName: 'id'
  }),
  userController.changePassword as any
);

/**
 * @route DELETE /api/users/:id
 * @desc Delete user
 * @access Private (Admin only)
 */
router.delete(
  '/:id',
  ...routeSecurity.users,
  authenticateToken,
  requirePermissions([Permission.DELETE_USER]),
  userController.deleteUser
);

/**
 * @route PATCH /api/users/:id/activate
 * @desc Activate user account
 * @access Private (Admin only)
 */
router.patch(
  '/:id/activate',
  authenticateToken,
  requirePermissions([Permission.UPDATE_USER]),
  userController.activateUser
);

/**
 * @route PATCH /api/users/:id/deactivate
 * @desc Deactivate user account
 * @access Private (Admin only)
 */
router.patch(
  '/:id/deactivate',
  authenticateToken,
  requirePermissions([Permission.UPDATE_USER]),
  userController.deactivateUser
);

export default router;