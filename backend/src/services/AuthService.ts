import { UserRepository } from '../models/UserRepository';
import { User } from '../models/interfaces';
import { PasswordUtils } from '../utils/password';
import { JWTUtils } from '../utils/jwt';
import { randomUUID } from 'crypto';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterUserData {
  username: string;
  email: string;
  password: string;
  role: User['role'];
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: Omit<User, 'passwordHash'>;
    accessToken: string;
    refreshToken: string;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Authenticate user login
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { username, password } = credentials;

      if (!username || !password) {
        return {
          success: false,
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Username and password are required'
          }
        };
      }

      // Find user by username
      const user = await this.userRepository.findByUsername(username);
      if (!user) {
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password'
          }
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Account is inactive'
          }
        };
      }

      // Verify password
      const isPasswordValid = await PasswordUtils.verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password'
          }
        };
      }

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Generate tokens
      const accessToken = JWTUtils.generateAccessToken(user);
      const refreshToken = JWTUtils.generateRefreshToken(user);

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      return {
        success: true,
        data: {
          user: userWithoutPassword,
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Login failed due to server error'
        }
      };
    }
  }

  /**
   * Register new user (admin only operation)
   */
  async register(userData: RegisterUserData): Promise<AuthResponse> {
    try {
      const { username, email, password, role } = userData;

      // Validate required fields
      if (!username || !email || !password || !role) {
        return {
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'Username, email, password, and role are required'
          }
        };
      }

      // Validate password strength
      const passwordValidation = PasswordUtils.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Password does not meet security requirements',
            details: { errors: passwordValidation.errors }
          }
        };
      }

      // Check if username already exists
      const existingUser = await this.userRepository.findByUsername(username);
      if (existingUser) {
        return {
          success: false,
          error: {
            code: 'USERNAME_EXISTS',
            message: 'Username already exists'
          }
        };
      }

      // Check if email already exists
      const existingEmail = await this.userRepository.findByEmail(email);
      if (existingEmail) {
        return {
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email already exists'
          }
        };
      }

      // Hash password
      const passwordHash = await PasswordUtils.hashPassword(password);

      // Create user
      const newUser = await this.userRepository.create({
        id: randomUUID(),
        username,
        email,
        password_hash: passwordHash,
        role,
        is_active: true,
        last_login: null
      });

      // Generate tokens
      const accessToken = JWTUtils.generateAccessToken(newUser);
      const refreshToken = JWTUtils.generateRefreshToken(newUser);

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = newUser;

      return {
        success: true,
        data: {
          user: userWithoutPassword,
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Registration failed due to server error'
        }
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      if (!refreshToken) {
        return {
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required'
          }
        };
      }

      // Verify refresh token
      const payload = JWTUtils.verifyToken(refreshToken);

      // Get current user data
      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.isActive) {
        return {
          success: false,
          error: {
            code: 'INVALID_USER',
            message: 'User account is invalid or inactive'
          }
        };
      }

      // Generate new tokens
      const newAccessToken = JWTUtils.generateAccessToken(user);
      const newRefreshToken = JWTUtils.generateRefreshToken(user);

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      return {
        success: true,
        data: {
          user: userWithoutPassword,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Failed to refresh token'
        }
      };
    }
  }

  /**
   * Get user profile from token
   */
  async getProfile(userId: string): Promise<{ success: boolean; data?: Omit<User, 'passwordHash'>; error?: any }> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.isActive) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or inactive'
          }
        };
      }

      const { passwordHash, ...userWithoutPassword } = user;

      return {
        success: true,
        data: userWithoutPassword
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PROFILE_FETCH_FAILED',
          message: 'Failed to fetch user profile'
        }
      };
    }
  }
}