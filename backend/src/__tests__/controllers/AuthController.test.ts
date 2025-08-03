import { Request, Response } from 'express';
import { AuthController } from '../../controllers/AuthController';
import { AuthService } from '../../services/AuthService';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock AuthService
jest.mock('../../services/AuthService');

const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockAuthServiceInstance: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockAuthServiceInstance = {
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      getProfile: jest.fn()
    } as any;

    mockAuthService.mockImplementation(() => mockAuthServiceInstance);
    
    authController = new AuthController();
    
    mockRequest = {
      body: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return 200 on successful login', async () => {
      const mockResult = {
        success: true,
        data: {
          user: { 
            id: 'user-123', 
            username: 'testuser', 
            email: 'test@example.com',
            role: 'editor' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLogin: null,
            isActive: true
          },
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        }
      };

      mockRequest.body = { username: 'testuser', password: 'password123' };
      mockAuthServiceInstance.login.mockResolvedValue(mockResult);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 401 on invalid credentials', async () => {
      const mockResult = {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        }
      };

      mockRequest.body = { username: 'testuser', password: 'wrongpassword' };
      mockAuthServiceInstance.login.mockResolvedValue(mockResult);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 on missing credentials', async () => {
      const mockResult = {
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Username and password are required'
        }
      };

      mockRequest.body = { username: '', password: '' };
      mockAuthServiceInstance.login.mockResolvedValue(mockResult);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 500 on server error', async () => {
      mockRequest.body = { username: 'testuser', password: 'password123' };
      mockAuthServiceInstance.login.mockRejectedValue(new Error('Server error'));

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('register', () => {
    it('should return 201 on successful registration', async () => {
      const mockResult = {
        success: true,
        data: {
          user: { 
            id: 'user-456', 
            username: 'newuser', 
            email: 'new@example.com',
            role: 'editor' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLogin: null,
            isActive: true
          },
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        }
      };

      mockRequest.body = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123!',
        role: 'editor'
      };
      mockAuthServiceInstance.register.mockResolvedValue(mockResult);

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 409 on username exists', async () => {
      const mockResult = {
        success: false,
        error: {
          code: 'USERNAME_EXISTS',
          message: 'Username already exists'
        }
      };

      mockRequest.body = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'Password123!',
        role: 'editor'
      };
      mockAuthServiceInstance.register.mockResolvedValue(mockResult);

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 422 on weak password', async () => {
      const mockResult = {
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password does not meet security requirements',
          details: { errors: ['Password too weak'] }
        }
      };

      mockRequest.body = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'weak',
        role: 'editor'
      };
      mockAuthServiceInstance.register.mockResolvedValue(mockResult);

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('refreshToken', () => {
    it('should return 200 on successful token refresh', async () => {
      const mockResult = {
        success: true,
        data: {
          user: { 
            id: 'user-123', 
            username: 'testuser', 
            email: 'test@example.com',
            role: 'editor' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLogin: null,
            isActive: true
          },
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        }
      };

      mockRequest.body = { refreshToken: 'valid-refresh-token' };
      mockAuthServiceInstance.refreshToken.mockResolvedValue(mockResult);

      await authController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 401 on invalid refresh token', async () => {
      const mockResult = {
        success: false,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Failed to refresh token'
        }
      };

      mockRequest.body = { refreshToken: 'invalid-token' };
      mockAuthServiceInstance.refreshToken.mockResolvedValue(mockResult);

      await authController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getProfile', () => {
    it('should return 200 on successful profile fetch', async () => {
      const mockResult = {
        success: true,
        data: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          role: 'editor' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLogin: null,
          isActive: true
        }
      };

      const mockAuthenticatedRequest = {
        ...mockRequest,
        user: { userId: 'user-123', username: 'testuser', role: 'editor' }
      } as AuthenticatedRequest;

      mockAuthServiceInstance.getProfile.mockResolvedValue(mockResult);

      await authController.getProfile(mockAuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
      expect(mockAuthServiceInstance.getProfile).toHaveBeenCalledWith('user-123');
    });

    it('should return 404 on user not found', async () => {
      const mockResult = {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or inactive'
        }
      };

      const mockAuthenticatedRequest = {
        ...mockRequest,
        user: { userId: 'non-existent', username: 'testuser', role: 'editor' }
      } as AuthenticatedRequest;

      mockAuthServiceInstance.getProfile.mockResolvedValue(mockResult);

      await authController.getProfile(mockAuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('logout', () => {
    it('should return 200 on logout', async () => {
      await authController.logout(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Logged out successfully'
        }
      });
    });
  });

  describe('getStatusCodeFromError', () => {
    it('should map error codes to correct HTTP status codes', async () => {
      const testCases = [
        { errorCode: 'MISSING_CREDENTIALS', expectedStatus: 400 },
        { errorCode: 'INVALID_CREDENTIALS', expectedStatus: 401 },
        { errorCode: 'USERNAME_EXISTS', expectedStatus: 409 },
        { errorCode: 'WEAK_PASSWORD', expectedStatus: 422 },
        { errorCode: 'USER_NOT_FOUND', expectedStatus: 404 },
        { errorCode: 'UNKNOWN_ERROR', expectedStatus: 500 }
      ];

      for (const testCase of testCases) {
        const mockResult = {
          success: false,
          error: {
            code: testCase.errorCode,
            message: 'Test error'
          }
        };

        mockRequest.body = { username: 'test', password: 'test' };
        mockAuthServiceInstance.login.mockResolvedValue(mockResult);

        await authController.login(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(testCase.expectedStatus);
      }
    });
  });
});