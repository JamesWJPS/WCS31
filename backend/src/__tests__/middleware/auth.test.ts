import { Request, Response, NextFunction } from 'express';
import { authenticateToken, requireRole, requireAdmin, requireEditor, optionalAuth } from '../../middleware/auth';
import { JWTUtils } from '../../utils/jwt';
import { UserRepository } from '../../models/UserRepository';

// Mock dependencies
jest.mock('../../utils/jwt');
jest.mock('../../models/UserRepository');

const mockJWTUtils = JWTUtils as jest.Mocked<typeof JWTUtils>;
const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockUserRepositoryInstance: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();

    mockUserRepositoryInstance = {
      findById: jest.fn()
    } as any;

    mockUserRepository.mockImplementation(() => mockUserRepositoryInstance);
    
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', async () => {
      const mockPayload = {
        userId: 'user-123',
        username: 'testuser',
        role: 'editor' as const
      };
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        role: 'editor' as const,
        isActive: true
      };

      mockJWTUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      mockJWTUtils.verifyToken.mockReturnValue(mockPayload);
      mockUserRepositoryInstance.findById.mockResolvedValue(mockUser as any);

      mockRequest.headers = { authorization: 'Bearer valid-token' };

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      mockJWTUtils.extractTokenFromHeader.mockReturnValue(null);

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockJWTUtils.extractTokenFromHeader.mockReturnValue('invalid-token');
      mockJWTUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Invalid token',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token for inactive user', async () => {
      const mockPayload = {
        userId: 'user-123',
        username: 'testuser',
        role: 'editor' as const
      };
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        role: 'editor' as const,
        isActive: false
      };

      mockJWTUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      mockJWTUtils.verifyToken.mockReturnValue(mockPayload);
      mockUserRepositoryInstance.findById.mockResolvedValue(mockUser as any);

      mockRequest.headers = { authorization: 'Bearer valid-token' };

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_USER',
          message: 'User account is invalid or inactive',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token for non-existent user', async () => {
      const mockPayload = {
        userId: 'user-123',
        username: 'testuser',
        role: 'editor' as const
      };

      mockJWTUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      mockJWTUtils.verifyToken.mockReturnValue(mockPayload);
      mockUserRepositoryInstance.findById.mockResolvedValue(null);

      mockRequest.headers = { authorization: 'Bearer valid-token' };

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_USER',
          message: 'User account is invalid or inactive',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow user with required role', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'testuser',
        role: 'administrator'
      };

      const middleware = requireRole('administrator', 'editor');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject user without required role', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'testuser',
        role: 'read-only'
      };

      const middleware = requireRole('administrator', 'editor');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this operation',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      delete mockRequest.user;

      const middleware = requireRole('administrator');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow administrator', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'admin',
        role: 'administrator'
      };

      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject non-administrator', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };

      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireEditor', () => {
    it('should allow administrator', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'admin',
        role: 'administrator'
      };

      requireEditor(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow editor', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };

      requireEditor(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject read-only user', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'readonly',
        role: 'read-only'
      };

      requireEditor(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should set user if valid token provided', async () => {
      const mockPayload = {
        userId: 'user-123',
        username: 'testuser',
        role: 'editor' as const
      };
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        role: 'editor' as const,
        isActive: true
      };

      mockJWTUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      mockJWTUtils.verifyToken.mockReturnValue(mockPayload);
      mockUserRepositoryInstance.findById.mockResolvedValue(mockUser as any);

      mockRequest.headers = { authorization: 'Bearer valid-token' };

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without user if no token provided', async () => {
      mockJWTUtils.extractTokenFromHeader.mockReturnValue(null);

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without user if invalid token provided', async () => {
      mockJWTUtils.extractTokenFromHeader.mockReturnValue('invalid-token');
      mockJWTUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});