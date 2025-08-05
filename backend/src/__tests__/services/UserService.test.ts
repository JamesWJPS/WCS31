import { UserService, CreateUserData, UpdateUserData, UpdateUserProfileData, ChangePasswordData } from '../../services/UserService';
import { UserRepository } from '../../models/UserRepository';
import { PasswordUtils } from '../../utils/password';
import { User } from '../../models/interfaces';

// Mock dependencies
jest.mock('../../models/UserRepository');
jest.mock('../../utils/password');
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid')
}));

const MockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const MockPasswordUtils = PasswordUtils as jest.MockedClass<typeof PasswordUtils>;

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  const mockUser: User = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: 'editor',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLogin: new Date('2024-01-01'),
    isActive: true
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      findByRole: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateLastLogin: jest.fn(),
      tableName: 'users'
    } as any;

    MockUserRepository.mockImplementation(() => mockUserRepository);

    MockPasswordUtils.validatePasswordStrength = jest.fn().mockReturnValue({
      isValid: true,
      errors: []
    });
    MockPasswordUtils.hashPassword = jest.fn().mockResolvedValue('hashed-password');
    MockPasswordUtils.verifyPassword = jest.fn().mockResolvedValue(true);

    userService = new UserService();
  });

  describe('getUsers', () => {
    it('should return paginated list of users', async () => {
      const mockQuery = jest.fn().mockReturnThis();
      const mockDb = {
        count: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue({ count: 1 })
        }),
        where: mockQuery,
        orderBy: mockQuery,
        limit: mockQuery,
        offset: mockQuery
      };

      (mockUserRepository as any).db = jest.fn(() => mockDb);
      mockDb.orderBy.mockResolvedValue([{
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed',
        role: 'editor',
        created_at: new Date(),
        updated_at: new Date(),
        last_login: new Date(),
        is_active: true
      }]);

      const result = await userService.getUsers({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data?.users).toHaveLength(1);
      expect(result.data?.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      });
    });

    it('should handle search and filter parameters', async () => {
      const mockQuery = jest.fn().mockReturnThis();
      const mockDb = {
        count: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue({ count: 0 })
        }),
        where: mockQuery,
        orderBy: mockQuery,
        limit: mockQuery,
        offset: mockQuery
      };

      (mockUserRepository as any).db = jest.fn(() => mockDb);
      mockDb.orderBy.mockResolvedValue([]);

      const result = await userService.getUsers({
        page: 1,
        limit: 10,
        search: 'test',
        role: 'editor',
        isActive: true
      });

      expect(result.success).toBe(true);
      expect(mockDb.where).toHaveBeenCalledWith({ role: 'editor', is_active: true });
    });

    it('should handle database errors', async () => {
      (mockUserRepository as any).db = jest.fn(() => {
        throw new Error('Database error');
      });

      const result = await userService.getUsers({});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_LIST_FAILED');
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById('user-1');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('user-1');
      expect(result.data).not.toHaveProperty('passwordHash');
    });

    it('should return error for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.getUserById('non-existent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('createUser', () => {
    const createUserData: CreateUserData = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'SecurePass123!',
      role: 'editor'
    };

    it('should create new user successfully', async () => {
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await userService.createUser(createUserData);

      expect(result.success).toBe(true);
      expect(result.data?.username).toBe('testuser');
      expect(result.data).not.toHaveProperty('passwordHash');
      expect(MockPasswordUtils.hashPassword).toHaveBeenCalledWith('SecurePass123!');
    });

    it('should validate required fields', async () => {
      const result = await userService.createUser({
        username: '',
        email: 'test@example.com',
        password: 'pass',
        role: 'editor'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_FIELDS');
    });

    it('should validate password strength', async () => {
      MockPasswordUtils.validatePasswordStrength = jest.fn().mockReturnValue({
        isValid: false,
        errors: ['Password too weak']
      });

      const result = await userService.createUser(createUserData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WEAK_PASSWORD');
    });

    it('should check for existing username', async () => {
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);

      const result = await userService.createUser(createUserData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USERNAME_EXISTS');
    });

    it('should check for existing email', async () => {
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await userService.createUser(createUserData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EMAIL_EXISTS');
    });
  });

  describe('updateUser', () => {
    const updateData: UpdateUserData = {
      username: 'updateduser',
      email: 'updated@example.com',
      role: 'administrator',
      isActive: false
    };

    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateData };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser('user-1', updateData);

      expect(result.success).toBe(true);
      expect(result.data?.username).toBe('updateduser');
    });

    it('should return error for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.updateUser('non-existent', updateData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_NOT_FOUND');
    });

    it('should check for username conflicts', async () => {
      const conflictUser = { ...mockUser, id: 'other-user' };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByUsername.mockResolvedValue(conflictUser);

      const result = await userService.updateUser('user-1', { username: 'conflictuser' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USERNAME_EXISTS');
    });
  });

  describe('updateUserProfile', () => {
    const profileData: UpdateUserProfileData = {
      username: 'newusername',
      email: 'newemail@example.com'
    };

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...profileData };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUserProfile('user-1', profileData);

      expect(result.success).toBe(true);
      expect(result.data?.username).toBe('newusername');
    });

    it('should return error for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.updateUserProfile('non-existent', profileData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('changePassword', () => {
    const passwordData: ChangePasswordData = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!'
    };

    it('should change password successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      MockPasswordUtils.verifyPassword = jest.fn().mockResolvedValue(true);
      MockPasswordUtils.validatePasswordStrength = jest.fn().mockReturnValue({
        isValid: true,
        errors: []
      });
      MockPasswordUtils.hashPassword = jest.fn().mockResolvedValue('new-hashed-password');

      const result = await userService.changePassword('user-1', passwordData);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('Password changed successfully');
      expect(MockPasswordUtils.verifyPassword).toHaveBeenCalledWith('OldPass123!', 'hashed-password');
      expect(MockPasswordUtils.hashPassword).toHaveBeenCalledWith('NewPass123!');
    });

    it('should validate required fields', async () => {
      const result = await userService.changePassword('user-1', {
        currentPassword: '',
        newPassword: 'NewPass123!'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_PASSWORDS');
    });

    it('should verify current password', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      MockPasswordUtils.verifyPassword = jest.fn().mockResolvedValue(false);

      const result = await userService.changePassword('user-1', passwordData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('should validate new password strength', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      MockPasswordUtils.verifyPassword = jest.fn().mockResolvedValue(true);
      MockPasswordUtils.validatePasswordStrength = jest.fn().mockReturnValue({
        isValid: false,
        errors: ['Password too weak']
      });

      const result = await userService.changePassword('user-1', passwordData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WEAK_PASSWORD');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(true);

      const result = await userService.deleteUser('user-1');

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('User deleted successfully');
      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-1');
    });

    it('should return error for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.deleteUser('non-existent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('activateUser', () => {
    it('should activate user successfully', async () => {
      const activatedUser = { ...mockUser, isActive: true };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(activatedUser);

      const result = await userService.activateUser('user-1');

      expect(result.success).toBe(true);
      expect(result.data?.isActive).toBe(true);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(deactivatedUser);

      const result = await userService.deactivateUser('user-1');

      expect(result.success).toBe(true);
      expect(result.data?.isActive).toBe(false);
    });
  });
});