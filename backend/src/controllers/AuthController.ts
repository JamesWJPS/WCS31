import { Request, Response } from 'express';
import { AuthService, LoginCredentials, RegisterUserData } from '../services/AuthService';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * User login endpoint
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const credentials: LoginCredentials = req.body;
      const result = await this.authService.login(credentials);

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
   * User registration endpoint (admin only)
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData: RegisterUserData = req.body;
      const result = await this.authService.register(userData);

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
   * Token refresh endpoint
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refreshToken(refreshToken);

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
   * Get user profile endpoint
   */
  getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await this.authService.getProfile(req.user.userId);

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
   * Logout endpoint (client-side token invalidation)
   */
  logout = async (_req: Request, res: Response): Promise<void> => {
    // For JWT tokens, logout is typically handled client-side by removing the token
    // This endpoint exists for consistency and future token blacklisting if needed
    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    });
  };

  /**
   * Map error codes to HTTP status codes
   */
  private getStatusCodeFromError(errorCode?: string): number {
    switch (errorCode) {
      case 'MISSING_CREDENTIALS':
      case 'MISSING_FIELDS':
      case 'MISSING_REFRESH_TOKEN':
        return 400;
      case 'INVALID_CREDENTIALS':
      case 'ACCOUNT_INACTIVE':
      case 'INVALID_USER':
      case 'TOKEN_REFRESH_FAILED':
        return 401;
      case 'USERNAME_EXISTS':
      case 'EMAIL_EXISTS':
        return 409;
      case 'WEAK_PASSWORD':
        return 422;
      case 'USER_NOT_FOUND':
        return 404;
      default:
        return 500;
    }
  }
}