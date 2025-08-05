import { Request, Response } from 'express';
import { UserService, CreateUserData, UpdateUserData, UpdateUserProfileData, ChangePasswordData, UserListQuery } from '../services/UserService';
import { AuthenticatedRequest } from '../middleware/auth';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Get paginated list of users with search and filtering (admin only)
   */
  getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const query: UserListQuery = {};
      
      if (req.query['page']) {
        query.page = parseInt(req.query['page'] as string);
      }
      
      if (req.query['limit']) {
        query.limit = parseInt(req.query['limit'] as string);
      }
      
      if (req.query['search']) {
        query.search = req.query['search'] as string;
      }
      
      if (req.query['role']) {
        query.role = req.query['role'] as any;
      }
      
      if (req.query['isActive']) {
        query.isActive = req.query['isActive'] === 'true';
      }

      const result = await this.userService.getUsers(query);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get user by ID (admin only or self)
   */
  getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      
      // Allow users to access their own profile, admins can access any profile
      if (req.user.role !== 'administrator' && req.user.userId !== id) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only access your own profile',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await this.userService.getUserById(id);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Create new user (admin only)
   */
  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData: CreateUserData = req.body;
      const result = await this.userService.createUser(userData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Update user (admin only)
   */
  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      const updateData: UpdateUserData = req.body;
      
      const result = await this.userService.updateUser(id, updateData);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Update user profile (self-service)
   */
  updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      
      // Users can only update their own profile, admins can update any profile
      if (req.user.role !== 'administrator' && req.user.userId !== id) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only update your own profile',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const profileData: UpdateUserProfileData = req.body;
      const result = await this.userService.updateUserProfile(id, profileData);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Change user password (self-service)
   */
  changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      
      // Users can only change their own password, admins can change any password
      if (req.user.role !== 'administrator' && req.user.userId !== id) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only change your own password',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const passwordData: ChangePasswordData = req.body;
      const result = await this.userService.changePassword(id, passwordData);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Delete user (admin only)
   */
  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      const result = await this.userService.deleteUser(id);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Activate user account (admin only)
   */
  activateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      const result = await this.userService.activateUser(id);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Deactivate user account (admin only)
   */
  deactivateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      const result = await this.userService.deactivateUser(id);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Map error codes to HTTP status codes
   */
  private getStatusCodeFromError(errorCode?: string): number {
    switch (errorCode) {
      case 'MISSING_FIELDS':
      case 'MISSING_PASSWORDS':
        return 400;
      case 'USER_NOT_FOUND':
        return 404;
      case 'USERNAME_EXISTS':
      case 'EMAIL_EXISTS':
        return 409;
      case 'WEAK_PASSWORD':
      case 'INVALID_CURRENT_PASSWORD':
        return 422;
      case 'ACCESS_DENIED':
        return 403;
      default:
        return 500;
    }
  }
}