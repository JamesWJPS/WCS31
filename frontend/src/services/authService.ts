import { apiService } from './api';
import { ApiResponse } from '../types';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role: 'administrator' | 'editor' | 'read-only';
    isActive: boolean;
  };
  token: string;
}

export interface RefreshTokenResponse {
  token: string;
}

export interface UserProfileResponse {
  id: string;
  username: string;
  email: string;
  role: 'administrator' | 'editor' | 'read-only';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
}

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>('/auth/login', credentials);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Login failed');
    }

    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    }
  }

  async refreshToken(): Promise<string> {
    const response = await apiService.post<RefreshTokenResponse>('/auth/refresh');
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Token refresh failed');
    }

    return response.data.token;
  }

  async getProfile(): Promise<UserProfileResponse> {
    const response = await apiService.get<UserProfileResponse>('/auth/profile');
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get user profile');
    }

    return response.data;
  }

  // Token management utilities
  getStoredToken(): string | null {
    return localStorage.getItem('token');
  }

  setStoredToken(token: string): void {
    localStorage.setItem('token', token);
  }

  removeStoredToken(): void {
    localStorage.removeItem('token');
  }

  // JWT token validation (basic check)
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true; // If we can't parse the token, consider it expired
    }
  }
}

export const authService = new AuthService();
export default authService;