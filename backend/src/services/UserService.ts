import { UserRepository } from '../models/UserRepository';
import { User } from '../models/interfaces';
import { PasswordUtils } from '../utils/password';
import { randomUUID } from 'crypto';

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role: User['role'];
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  role?: User['role'];
  isActive?: boolean;
}

export interface UpdateUserProfileData {
  username?: string;
  email?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: User['role'];
  isActive?: boolean;
}

export interface UserListResponse {
  users: Omit<User, 'passwordHash'>[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Get paginated list of users with search and filtering
   */
  async getUsers(query: UserListQuery): Promise<ServiceResponse<UserListResponse>> {
    try {
      const page = Math.max(1, query.page || 1);
      const limit = Math.min(100, Math.max(1, query.limit || 10));
      const offset = (page - 1) * limit;

      // Build query conditions
      const conditions: any = {};
      
      if (query.role) {
        conditions.role = query.role;
      }
      
      if (query.isActive !== undefined) {
        conditions.is_active = query.isActive;
      }

      // Get total count for pagination
      let totalQuery = (this.userRepository as any).db((this.userRepository as any).tableName);
      
      if (Object.keys(conditions).length > 0) {
        totalQuery = totalQuery.where(conditions);
      }
      
      if (query.search) {
        totalQuery = totalQuery.where(function(this: any) {
          this.where('username', 'like', `%${query.search}%`)
              .orWhere('email', 'like', `%${query.search}%`);
        });
      }
      
      const totalResult = await totalQuery.count('* as count').first();
      const total = totalResult ? Number(totalResult['count']) : 0;

      // Get paginated results
      let usersQuery = (this.userRepository as any).db((this.userRepository as any).tableName);
      
      if (Object.keys(conditions).length > 0) {
        usersQuery = usersQuery.where(conditions);
      }
      
      if (query.search) {
        usersQuery = usersQuery.where(function(this: any) {
          this.where('username', 'like', `%${query.search}%`)
              .orWhere('email', 'like', `%${query.search}%`);
        });
      }

      const userRows = await usersQuery
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const users = userRows.map((row: any) => {
        const user = (this.userRepository as any).mapFromTable(row);
        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return {
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'USER_LIST_FAILED',
          message: 'Failed to retrieve user list'
        }
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<ServiceResponse<Omit<User, 'passwordHash'>>> {
    try {
      const user = await this.userRepository.findById(id);
      
      if (!user) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
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
          code: 'USER_FETCH_FAILED',
          message: 'Failed to fetch user'
        }
      };
    }
  }

  /**
   * Create new user (admin only)
   */
  async createUser(userData: CreateUserData): Promise<ServiceResponse<Omit<User, 'passwordHash'>>> {
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

      const { passwordHash: _, ...userWithoutPassword } = newUser;

      return {
        success: true,
        data: userWithoutPassword
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'USER_CREATION_FAILED',
          message: 'Failed to create user'
        }
      };
    }
  }

  /**
   * Update user (admin only)
   */
  async updateUser(id: string, updateData: UpdateUserData): Promise<ServiceResponse<Omit<User, 'passwordHash'>>> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        };
      }

      // Check for username conflicts
      if (updateData.username && updateData.username !== existingUser.username) {
        const usernameExists = await this.userRepository.findByUsername(updateData.username);
        if (usernameExists) {
          return {
            success: false,
            error: {
              code: 'USERNAME_EXISTS',
              message: 'Username already exists'
            }
          };
        }
      }

      // Check for email conflicts
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await this.userRepository.findByEmail(updateData.email);
        if (emailExists) {
          return {
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: 'Email already exists'
            }
          };
        }
      }

      // Prepare update data
      const updateFields: any = {
        updated_at: new Date()
      };

      if (updateData.username) updateFields.username = updateData.username;
      if (updateData.email) updateFields.email = updateData.email;
      if (updateData.role) updateFields.role = updateData.role;
      if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;

      // Update user
      const updatedUser = await this.userRepository.update(id, updateFields);

      if (!updatedUser) {
        return {
          success: false,
          error: {
            code: 'USER_UPDATE_FAILED',
            message: 'Failed to update user'
          }
        };
      }

      const { passwordHash, ...userWithoutPassword } = updatedUser;

      return {
        success: true,
        data: userWithoutPassword
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'USER_UPDATE_FAILED',
          message: 'Failed to update user'
        }
      };
    }
  }

  /**
   * Update user profile (self-service)
   */
  async updateUserProfile(id: string, profileData: UpdateUserProfileData): Promise<ServiceResponse<Omit<User, 'passwordHash'>>> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        };
      }

      // Check for username conflicts
      if (profileData.username && profileData.username !== existingUser.username) {
        const usernameExists = await this.userRepository.findByUsername(profileData.username);
        if (usernameExists) {
          return {
            success: false,
            error: {
              code: 'USERNAME_EXISTS',
              message: 'Username already exists'
            }
          };
        }
      }

      // Check for email conflicts
      if (profileData.email && profileData.email !== existingUser.email) {
        const emailExists = await this.userRepository.findByEmail(profileData.email);
        if (emailExists) {
          return {
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: 'Email already exists'
            }
          };
        }
      }

      // Prepare update data (only allow username and email changes)
      const updateFields: any = {
        updated_at: new Date()
      };

      if (profileData.username) updateFields.username = profileData.username;
      if (profileData.email) updateFields.email = profileData.email;

      // Update user
      const updatedUser = await this.userRepository.update(id, updateFields);

      if (!updatedUser) {
        return {
          success: false,
          error: {
            code: 'PROFILE_UPDATE_FAILED',
            message: 'Failed to update profile'
          }
        };
      }

      const { passwordHash, ...userWithoutPassword } = updatedUser;

      return {
        success: true,
        data: userWithoutPassword
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PROFILE_UPDATE_FAILED',
          message: 'Failed to update profile'
        }
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(id: string, passwordData: ChangePasswordData): Promise<ServiceResponse<{ message: string }>> {
    try {
      const { currentPassword, newPassword } = passwordData;

      if (!currentPassword || !newPassword) {
        return {
          success: false,
          error: {
            code: 'MISSING_PASSWORDS',
            message: 'Current password and new password are required'
          }
        };
      }

      // Get user
      const user = await this.userRepository.findById(id);
      if (!user) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await PasswordUtils.verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
            message: 'Current password is incorrect'
          }
        };
      }

      // Validate new password strength
      const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'New password does not meet security requirements',
            details: { errors: passwordValidation.errors }
          }
        };
      }

      // Hash new password
      const newPasswordHash = await PasswordUtils.hashPassword(newPassword);

      // Update password
      await this.userRepository.update(id, {
        password_hash: newPasswordHash,
        updated_at: new Date()
      });

      return {
        success: true,
        data: {
          message: 'Password changed successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PASSWORD_CHANGE_FAILED',
          message: 'Failed to change password'
        }
      };
    }
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(id: string): Promise<ServiceResponse<{ message: string }>> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        };
      }

      // Delete user
      await this.userRepository.delete(id);

      return {
        success: true,
        data: {
          message: 'User deleted successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'USER_DELETION_FAILED',
          message: 'Failed to delete user'
        }
      };
    }
  }

  /**
   * Activate user account (admin only)
   */
  async activateUser(id: string): Promise<ServiceResponse<Omit<User, 'passwordHash'>>> {
    try {
      const result = await this.updateUser(id, { isActive: true });
      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'USER_ACTIVATION_FAILED',
          message: 'Failed to activate user'
        }
      };
    }
  }

  /**
   * Deactivate user account (admin only)
   */
  async deactivateUser(id: string): Promise<ServiceResponse<Omit<User, 'passwordHash'>>> {
    try {
      const result = await this.updateUser(id, { isActive: false });
      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'USER_DEACTIVATION_FAILED',
          message: 'Failed to deactivate user'
        }
      };
    }
  }
}