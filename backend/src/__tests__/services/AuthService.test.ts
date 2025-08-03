import { AuthService } from '../../services/AuthService';
import { UserRepository } from '../../models/UserRepository';
import { PasswordUtils } from '../../utils/password';
import { JWTUtils } from '../../utils/jwt';

// Mock dependencies
jest.mock('../../models/UserRepository');
jest.mock('../../utils/password');
jest.mock('../../utils/jwt');

const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const mockPasswordUtils = PasswordUtils as jest.Mocked<typeof PasswordUtils>;
const mockJWTUtils = JWTUtils as jest.Mocked<typeof JWTUtils>;

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepositoryInstance: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepositoryInstance = {
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn()
    } as any;

    mockUserRepository.mockImplementation(() => mockUserRepositoryInstance);
    authService = new AuthService();
    
    jest.clearAllMocks();
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      role: 'editor' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null
    };

    it('should successfully login with valid credentials', async () => {
      const credentials = { username: 'testuser', password: 'password123' };
      
      mockUserRepositoryInstance.findByUsername.mockResolvedValue(mockUser);
      mockPasswordUtils.verifyPassword.mockResolvedValue(true);
      mockJWTUtils.generateAccessToken.mockReturnValue('access-token');
      mockJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');

      const result = await authService.login(credentials);

      expect(result.success).toBe(true);
      expect(result.data?.user.username).toBe('testuser');
      expect(result.data?.accessToken).toBe('access-token');
      expect(result.data?.refreshToken).toBe('refresh-token');
      expect(result.data?.user).not.toHaveProperty('passwordHash');
      expect(mockUserRepositoryInstance.updateLastLogin).toHaveBeenCalledWith('user-123');
    });

    it('should fail with missing credentials', async () => {
      const result = await authService.login({ username: '', password: 'password' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_CREDENTIALS');
    });

    it('should fail with invalid username', async () => {
      const credentials = { username: 'nonexistent', password: 'password123' };
      
      mockUserRepositoryInstance.findByUsername.mockResolvedValue(null);

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should fail with inactive account', async () => {
      const credentials = { username: 'testuser', password: 'password123' };
      const inactiveUser = { ...mockUser, isActive: false };
      
      mockUserRepositoryInstance.findByUsername.mockResolvedValue(inactiveUser);

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ACCOUNT_INACTIVE');
    });

    it('should fail with invalid password', async () => {
      const credentials = { username: 'testuser', password: 'wrongpassword' };
      
      mockUserRepositoryInstance.findByUsername.mockResolvedValue(mockUser);
      mockPasswordUtils.verifyPassword.mockResolvedValue(false);

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should handle server errors gracefully', async () => {
      const credentials = { username: 'testuser', password: 'password123' };
      
      mockUserRepositoryInstance.findByUsername.mockRejectedValue(new Error('Database error'));

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('LOGIN_FAILED');
    });
  });

  describe('register', () => {
    const userData = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'Password123!',
      role: 'editor' as const
    };

    const mockNewUser = {
      id: 'user-456',
      username: 'newuser',
      email: 'new@example.com',
      passwordHash: 'hashed-password',
      role: 'editor' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null
    };

    it('should successfully register new user', async () => {
      mockUserRepositoryInstance.findByUsername.mockResolvedValue(null);
      mockUserRepositoryInstance.findByEmail.mockResolvedValue(null);
      mockPasswordUtils.validatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
      mockPasswordUtils.hashPassword.mockResolvedValue('hashed-password');
      mockUserRepositoryInstance.create.mockResolvedValue(mockNewUser);
      mockJWTUtils.generateAccessToken.mockReturnValue('access-token');
      mockJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');

      const result = await authService.register(userData);

      expect(result.success).toBe(true);
      expect(result.data?.user.username).toBe('newuser');
      expect(result.data?.user).not.toHaveProperty('passwordHash');
    });

    it('should fail with missing fields', async () => {
      const incompleteData = { username: 'test', email: '', password: '', role: 'editor' as const };

      const result = await authService.register(incompleteData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_FIELDS');
    });

    it('should fail with weak password', async () => {
      const weakPasswordData = { ...userData, password: 'weak' };
      
      mockPasswordUtils.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password too weak']
      });

      const result = await authService.register(weakPasswordData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WEAK_PASSWORD');
      expect(result.error?.details?.['errors']).toEqual(['Password too weak']);
    });

    it('should fail with existing username', async () => {
      mockPasswordUtils.validatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
      mockUserRepositoryInstance.findByUsername.mockResolvedValue(mockNewUser);

      const result = await authService.register(userData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USERNAME_EXISTS');
    });

    it('should fail with existing email', async () => {
      mockPasswordUtils.validatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
      mockUserRepositoryInstance.findByUsername.mockResolvedValue(null);
      mockUserRepositoryInstance.findByEmail.mockResolvedValue(mockNewUser);

      const result = await authService.register(userData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EMAIL_EXISTS');
    });

    it('should handle server errors gracefully', async () => {
      mockPasswordUtils.validatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
      mockUserRepositoryInstance.findByUsername.mockRejectedValue(new Error('Database error'));

      const result = await authService.register(userData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REGISTRATION_FAILED');
    });
  });

  describe('refreshToken', () => {
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      role: 'editor' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null
    };

    it('should successfully refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { userId: 'user-123', username: 'testuser', role: 'editor' as const };
      
      mockJWTUtils.verifyToken.mockReturnValue(mockPayload);
      mockUserRepositoryInstance.findById.mockResolvedValue(mockUser);
      mockJWTUtils.generateAccessToken.mockReturnValue('new-access-token');
      mockJWTUtils.generateRefreshToken.mockReturnValue('new-refresh-token');

      const result = await authService.refreshToken(refreshToken);

      expect(result.success).toBe(true);
      expect(result.data?.accessToken).toBe('new-access-token');
      expect(result.data?.refreshToken).toBe('new-refresh-token');
    });

    it('should fail with missing refresh token', async () => {
      const result = await authService.refreshToken('');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_REFRESH_TOKEN');
    });

    it('should fail with invalid refresh token', async () => {
      mockJWTUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.refreshToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TOKEN_REFRESH_FAILED');
    });

    it('should fail with inactive user', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { userId: 'user-123', username: 'testuser', role: 'editor' as const };
      const inactiveUser = { ...mockUser, isActive: false };
      
      mockJWTUtils.verifyToken.mockReturnValue(mockPayload);
      mockUserRepositoryInstance.findById.mockResolvedValue(inactiveUser);

      const result = await authService.refreshToken(refreshToken);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_USER');
    });
  });

  describe('getProfile', () => {
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      role: 'editor' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null
    };

    it('should successfully get user profile', async () => {
      mockUserRepositoryInstance.findById.mockResolvedValue(mockUser);

      const result = await authService.getProfile('user-123');

      expect(result.success).toBe(true);
      expect(result.data?.username).toBe('testuser');
      expect(result.data).not.toHaveProperty('passwordHash');
    });

    it('should fail with non-existent user', async () => {
      mockUserRepositoryInstance.findById.mockResolvedValue(null);

      const result = await authService.getProfile('non-existent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_NOT_FOUND');
    });

    it('should fail with inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepositoryInstance.findById.mockResolvedValue(inactiveUser);

      const result = await authService.getProfile('user-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_NOT_FOUND');
    });

    it('should handle server errors gracefully', async () => {
      mockUserRepositoryInstance.findById.mockRejectedValue(new Error('Database error'));

      const result = await authService.getProfile('user-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROFILE_FETCH_FAILED');
    });
  });
});