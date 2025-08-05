import request from 'supertest';
import express from 'express';
import { UserController } from '../../controllers/UserController';
import { UserService } from '../../services/UserService';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { requirePermissions, conditionalAuth } from '../../middleware/decorators';

// Mock the services and middleware
jest.mock('../../services/UserService');
jest.mock('../../middleware/auth');
jest.mock('../../middleware/decorators');

const MockUserService = UserService as jest.MockedClass<typeof UserService>;
const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockRequirePermissions = requirePermissions as jest.MockedFunction<typeof requirePermissions>;
const mockConditionalAuth = conditionalAuth as jest.MockedFunction<typeof conditionalAuth>;

describe('UserController', () => {
  let app: express.Application;
  let userController: UserController;
  let mockUserService: jest.Mocked<UserService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create Express app
    app = express();
    app.use(express.json());

    // Create controller instance
    userController = new UserController();

    // Mock the service instance
    mockUserService = {
      getUsers: jest.fn(),
      getUserById: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      updateUserProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteUser: jest.fn(),
      activateUser: jest.fn(),
      deactivateUser: jest.fn(),
    } as any;

    MockUserService.mockImplementation(() => mockUserService);

    // Mock middleware to pass through
    mockAuthenticateToken.mockImplementation((req, _res, next) => {
      (req as any).user = { userId: 'user-1', username: 'testuser', role: 'administrator' };
      next();
    });
    mockRequireAdmin.mockImplementation((_req, _res, next) => next());
    mockRequirePermissions.mockImplementation(() => (_req, _res, next) => next());
    mockConditionalAuth.mockImplementation(() => (_req, _res, next) => next());

    // Set up routes
    app.get('/users', userController.getUsers);
    app.get('/users/:id', userController.getUserById as any);
    app.post('/users', userController.createUser);
    app.put('/users/:id', userController.updateUser);
    app.patch('/users/:id/profile', userController.updateProfile as any);
    app.patch('/users/:id/password', userController.changePassword as any);
    app.delete('/users/:id', userController.deleteUser);
    app.patch('/users/:id/activate', userController.activateUser);
    app.patch('/users/:id/deactivate', userController.deactivateUser);
  });

  describe('GET /users', () => {
    it('should return paginated list of users', async () => {
      const mockResponse = {
        success: true,
        data: {
          users: [
            {
              id: 'user-1',
              username: 'admin',
              email: 'admin@example.com',
              role: 'administrator' as const,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastLogin: new Date()
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          }
        }
      };

      mockUserService.getUsers.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/users')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(mockUserService.getUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        role: undefined,
        isActive: undefined
      });
    });

    it('should handle search and filter parameters', async () => {
      const mockResponse = {
        success: true,
        data: {
          users: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
        }
      };

      mockUserService.getUsers.mockResolvedValue(mockResponse);

      await request(app)
        .get('/users')
        .query({
          page: 2,
          limit: 5,
          search: 'test',
          role: 'editor',
          isActive: 'true'
        });

      expect(mockUserService.getUsers).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'test',
        role: 'editor',
        isActive: true
      });
    });

    it('should handle service errors', async () => {
      mockUserService.getUsers.mockResolvedValue({
        success: false,
        error: {
          code: 'USER_LIST_FAILED',
          message: 'Failed to retrieve user list'
        }
      });

      const response = await request(app).get('/users');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'editor' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date()
      };

      mockUserService.getUserById.mockResolvedValue({
        success: true,
        data: mockUser
      });

      const response = await request(app).get('/users/user-1');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockUser);
      expect(mockUserService.getUserById).toHaveBeenCalledWith('user-1');
    });

    it('should return 404 for non-existent user', async () => {
      mockUserService.getUserById.mockResolvedValue({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });

      const response = await request(app).get('/users/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should deny access for non-admin accessing other user', async () => {
      // Mock non-admin user
      mockAuthenticateToken.mockImplementation((req, _res, next) => {
        (req as any).user = { userId: 'user-2', username: 'editor', role: 'editor' };
        next();
      });

      const response = await request(app).get('/users/user-1');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('POST /users', () => {
    it('should create new user', async () => {
      const newUser = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'SecurePass123!',
        role: 'editor' as const
      };

      const createdUser = {
        id: 'user-new',
        username: 'newuser',
        email: 'new@example.com',
        role: 'editor' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null
      };

      mockUserService.createUser.mockResolvedValue({
        success: true,
        data: createdUser
      });

      const response = await request(app)
        .post('/users')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(createdUser);
      expect(mockUserService.createUser).toHaveBeenCalledWith(newUser);
    });

    it('should handle validation errors', async () => {
      mockUserService.createUser.mockResolvedValue({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Username, email, password, and role are required'
        }
      });

      const response = await request(app)
        .post('/users')
        .send({ username: 'incomplete' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle username conflicts', async () => {
      mockUserService.createUser.mockResolvedValue({
        success: false,
        error: {
          code: 'USERNAME_EXISTS',
          message: 'Username already exists'
        }
      });

      const response = await request(app)
        .post('/users')
        .send({
          username: 'existing',
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'editor'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user', async () => {
      const updateData = {
        username: 'updateduser',
        email: 'updated@example.com',
        role: 'administrator' as const,
        isActive: false
      };

      const updatedUser = {
        id: 'user-1',
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date()
      };

      mockUserService.updateUser.mockResolvedValue({
        success: true,
        data: updatedUser
      });

      const response = await request(app)
        .put('/users/user-1')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(updatedUser);
      expect(mockUserService.updateUser).toHaveBeenCalledWith('user-1', updateData);
    });
  });

  describe('PATCH /users/:id/profile', () => {
    it('should update user profile', async () => {
      const profileData = {
        username: 'newusername',
        email: 'newemail@example.com'
      };

      const updatedUser = {
        id: 'user-1',
        username: 'newusername',
        email: 'newemail@example.com',
        role: 'editor' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date()
      };

      mockUserService.updateUserProfile.mockResolvedValue({
        success: true,
        data: updatedUser
      });

      const response = await request(app)
        .patch('/users/user-1/profile')
        .send(profileData);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(updatedUser);
      expect(mockUserService.updateUserProfile).toHaveBeenCalledWith('user-1', profileData);
    });

    it('should deny access for non-admin updating other user profile', async () => {
      // Mock non-admin user
      mockAuthenticateToken.mockImplementation((req, _res, next) => {
        (req as any).user = { userId: 'user-2', username: 'editor', role: 'editor' };
        next();
      });

      const response = await request(app)
        .patch('/users/user-1/profile')
        .send({ username: 'hacker' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('PATCH /users/:id/password', () => {
    it('should change user password', async () => {
      const passwordData = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!'
      };

      mockUserService.changePassword.mockResolvedValue({
        success: true,
        data: { message: 'Password changed successfully' }
      });

      const response = await request(app)
        .patch('/users/user-1/password')
        .send(passwordData);

      expect(response.status).toBe(200);
      expect(response.body.data.message).toBe('Password changed successfully');
      expect(mockUserService.changePassword).toHaveBeenCalledWith('user-1', passwordData);
    });

    it('should handle invalid current password', async () => {
      mockUserService.changePassword.mockResolvedValue({
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect'
        }
      });

      const response = await request(app)
        .patch('/users/user-1/password')
        .send({
          currentPassword: 'wrong',
          newPassword: 'NewPass123!'
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user', async () => {
      mockUserService.deleteUser.mockResolvedValue({
        success: true,
        data: { message: 'User deleted successfully' }
      });

      const response = await request(app).delete('/users/user-1');

      expect(response.status).toBe(200);
      expect(response.body.data.message).toBe('User deleted successfully');
      expect(mockUserService.deleteUser).toHaveBeenCalledWith('user-1');
    });

    it('should return 404 for non-existent user', async () => {
      mockUserService.deleteUser.mockResolvedValue({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });

      const response = await request(app).delete('/users/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /users/:id/activate', () => {
    it('should activate user', async () => {
      const activatedUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'editor' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date()
      };

      mockUserService.activateUser.mockResolvedValue({
        success: true,
        data: activatedUser
      });

      const response = await request(app).patch('/users/user-1/activate');

      expect(response.status).toBe(200);
      expect(response.body.data.isActive).toBe(true);
      expect(mockUserService.activateUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('PATCH /users/:id/deactivate', () => {
    it('should deactivate user', async () => {
      const deactivatedUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'editor' as const,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date()
      };

      mockUserService.deactivateUser.mockResolvedValue({
        success: true,
        data: deactivatedUser
      });

      const response = await request(app).patch('/users/user-1/deactivate');

      expect(response.status).toBe(200);
      expect(response.body.data.isActive).toBe(false);
      expect(mockUserService.deactivateUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('Error handling', () => {
    it('should handle internal server errors', async () => {
      mockUserService.getUsers.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/users');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});