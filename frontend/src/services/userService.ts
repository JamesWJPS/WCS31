import { ApiResponse, User, UserFilter, CreateUserData, UpdateUserData } from '../types';
import { apiService } from './api';

class UserService {
  async getUsers(filter?: UserFilter): Promise<ApiResponse<User[]>> {
    const params = new URLSearchParams();
    
    if (filter?.search) {
      params.append('search', filter.search);
    }
    if (filter?.role) {
      params.append('role', filter.role);
    }
    if (filter?.isActive !== undefined) {
      params.append('isActive', filter.isActive.toString());
    }

    const queryString = params.toString();
    const url = queryString ? `/users?${queryString}` : '/users';
    
    return apiService.get<User[]>(url);
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    return apiService.get<User>(`/users/${id}`);
  }

  async createUser(userData: CreateUserData): Promise<ApiResponse<User>> {
    return apiService.post<User>('/users', userData);
  }

  async updateUser(id: string, userData: UpdateUserData): Promise<ApiResponse<User>> {
    return apiService.put<User>(`/users/${id}`, userData);
  }

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/users/${id}`);
  }

  async activateUser(id: string): Promise<ApiResponse<User>> {
    return apiService.put<User>(`/users/${id}`, { isActive: true });
  }

  async deactivateUser(id: string): Promise<ApiResponse<User>> {
    return apiService.put<User>(`/users/${id}`, { isActive: false });
  }
}

export const userService = new UserService();
export default userService;