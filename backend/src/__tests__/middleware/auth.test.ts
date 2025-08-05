import { Request, Response, NextFunction } from 'express';
import { 
  authenticateToken, 
  requireRole, 
  requireAdmin, 
  requireEditor, 
  optionalAuth,
  Permission,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermission,
  requireAllPermissions,
  requireOwnershipOrAdmin
} from '../../middleware/auth';
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

  describe('Permission System', () => {
    describe('hasPermission', () => {
      it('should return true for administrator with any permission', () => {
        expect(hasPermission('administrator', Permission.CREATE_CONTENT)).toBe(true);
        expect(hasPermission('administrator', Permission.SYSTEM_ADMIN)).toBe(true);
        expect(hasPermission('administrator', Permission.DELETE_USER)).toBe(true);
      });

      it('should return true for editor with content permissions', () => {
        expect(hasPermission('editor', Permission.CREATE_CONTENT)).toBe(true);
        expect(hasPermission('editor', Permission.UPDATE_CONTENT)).toBe(true);
        expect(hasPermission('editor', Permission.UPLOAD_DOCUMENT)).toBe(true);
      });

      it('should return false for editor with admin permissions', () => {
        expect(hasPermission('editor', Permission.CREATE_USER)).toBe(false);
        expect(hasPermission('editor', Permission.SYSTEM_ADMIN)).toBe(false);
        expect(hasPermission('editor', Permission.DELETE_USER)).toBe(false);
      });

      it('should return true for read-only with read permissions', () => {
        expect(hasPermission('read-only', Permission.READ_CONTENT)).toBe(true);
        expect(hasPermission('read-only', Permission.READ_DOCUMENT)).toBe(true);
        expect(hasPermission('read-only', Permission.READ_TEMPLATE)).toBe(true);
      });

      it('should return false for read-only with write permissions', () => {
        expect(hasPermission('read-only', Permission.CREATE_CONTENT)).toBe(false);
        expect(hasPermission('read-only', Permission.UPLOAD_DOCUMENT)).toBe(false);
        expect(hasPermission('read-only', Permission.DELETE_CONTENT)).toBe(false);
      });
    });

    describe('hasAnyPermission', () => {
      it('should return true if user has any of the specified permissions', () => {
        expect(hasAnyPermission('editor', [Permission.CREATE_CONTENT, Permission.SYSTEM_ADMIN])).toBe(true);
        expect(hasAnyPermission('read-only', [Permission.READ_CONTENT, Permission.CREATE_USER])).toBe(true);
      });

      it('should return false if user has none of the specified permissions', () => {
        expect(hasAnyPermission('read-only', [Permission.CREATE_CONTENT, Permission.SYSTEM_ADMIN])).toBe(false);
        expect(hasAnyPermission('editor', [Permission.CREATE_USER, Permission.SYSTEM_ADMIN])).toBe(false);
      });
    });

    describe('hasAllPermissions', () => {
      it('should return true if user has all specified permissions', () => {
        expect(hasAllPermissions('administrator', [Permission.CREATE_CONTENT, Permission.DELETE_CONTENT])).toBe(true);
        expect(hasAllPermissions('editor', [Permission.READ_CONTENT, Permission.CREATE_CONTENT])).toBe(true);
      });

      it('should return false if user is missing any specified permission', () => {
        expect(hasAllPermissions('editor', [Permission.CREATE_CONTENT, Permission.SYSTEM_ADMIN])).toBe(false);
        expect(hasAllPermissions('read-only', [Permission.READ_CONTENT, Permission.CREATE_CONTENT])).toBe(false);
      });
    });
  });

  describe('requirePermission', () => {
    it('should allow user with required permission', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };

      const middleware = requirePermission(Permission.CREATE_CONTENT);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow user with any of multiple permissions', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };

      const middleware = requirePermission(Permission.CREATE_CONTENT, Permission.SYSTEM_ADMIN);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject user without required permissions', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'readonly',
        role: 'read-only'
      };

      const middleware = requirePermission(Permission.CREATE_CONTENT);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Insufficient permissions. Required: ${Permission.CREATE_CONTENT}`,
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      delete mockRequest.user;

      const middleware = requirePermission(Permission.CREATE_CONTENT);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAllPermissions', () => {
    it('should allow user with all required permissions', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'admin',
        role: 'administrator'
      };

      const middleware = requireAllPermissions(Permission.CREATE_CONTENT, Permission.DELETE_CONTENT);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject user missing any required permission', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };

      const middleware = requireAllPermissions(Permission.CREATE_CONTENT, Permission.SYSTEM_ADMIN);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Insufficient permissions. Required: ${Permission.CREATE_CONTENT} and ${Permission.SYSTEM_ADMIN}`,
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnershipOrAdmin', () => {
    it('should allow administrator regardless of ownership', async () => {
      mockRequest.user = {
        userId: 'admin-123',
        username: 'admin',
        role: 'administrator'
      };
      mockRequest.params = { id: 'resource-123' };

      const ownershipCheck = jest.fn().mockResolvedValue(false);
      const middleware = requireOwnershipOrAdmin({
        checkOwnership: ownershipCheck,
        allowAdminOverride: true
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(ownershipCheck).not.toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow resource owner', async () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };
      mockRequest.params = { id: 'resource-123' };

      const ownershipCheck = jest.fn().mockResolvedValue(true);
      const middleware = requireOwnershipOrAdmin({
        checkOwnership: ownershipCheck
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(ownershipCheck).toHaveBeenCalledWith('user-123', 'resource-123');
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject non-owner without admin privileges', async () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };
      mockRequest.params = { id: 'resource-123' };

      const ownershipCheck = jest.fn().mockResolvedValue(false);
      const middleware = requireOwnershipOrAdmin({
        checkOwnership: ownershipCheck
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied. You can only access your own resources.',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without resource ID', async () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };
      mockRequest.params = {};

      const ownershipCheck = jest.fn();
      const middleware = requireOwnershipOrAdmin({
        checkOwnership: ownershipCheck
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_RESOURCE_ID',
          message: 'Resource ID is required',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle ownership check errors', async () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };
      mockRequest.params = { id: 'resource-123' };

      const ownershipCheck = jest.fn().mockRejectedValue(new Error('Database error'));
      const middleware = requireOwnershipOrAdmin({
        checkOwnership: ownershipCheck
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'OWNERSHIP_CHECK_FAILED',
          message: 'Failed to verify resource ownership',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('should define permissions for all roles', () => {
      expect(ROLE_PERMISSIONS.administrator).toBeDefined();
      expect(ROLE_PERMISSIONS.editor).toBeDefined();
      expect(ROLE_PERMISSIONS['read-only']).toBeDefined();
    });

    it('should give administrators all permissions', () => {
      const adminPermissions = ROLE_PERMISSIONS.administrator;
      expect(adminPermissions).toContain(Permission.SYSTEM_ADMIN);
      expect(adminPermissions).toContain(Permission.CREATE_USER);
      expect(adminPermissions).toContain(Permission.DELETE_USER);
      expect(adminPermissions).toContain(Permission.CREATE_CONTENT);
      expect(adminPermissions).toContain(Permission.DELETE_CONTENT);
    });

    it('should give editors content and document permissions', () => {
      const editorPermissions = ROLE_PERMISSIONS.editor;
      expect(editorPermissions).toContain(Permission.CREATE_CONTENT);
      expect(editorPermissions).toContain(Permission.UPDATE_CONTENT);
      expect(editorPermissions).toContain(Permission.UPLOAD_DOCUMENT);
      expect(editorPermissions).not.toContain(Permission.CREATE_USER);
      expect(editorPermissions).not.toContain(Permission.SYSTEM_ADMIN);
    });

    it('should give read-only users only read permissions', () => {
      const readOnlyPermissions = ROLE_PERMISSIONS['read-only'];
      expect(readOnlyPermissions).toContain(Permission.READ_CONTENT);
      expect(readOnlyPermissions).toContain(Permission.READ_DOCUMENT);
      expect(readOnlyPermissions).toContain(Permission.READ_TEMPLATE);
      expect(readOnlyPermissions).not.toContain(Permission.CREATE_CONTENT);
      expect(readOnlyPermissions).not.toContain(Permission.UPLOAD_DOCUMENT);
    });
  });
});