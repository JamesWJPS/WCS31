import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../userService';
import { apiService } from '../api';
import { User } from '../../types';

// Mock the API service
vi.mock('../api');

const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'editor',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastLogin: '2024-01-02T00:00:00Z',
  isActive: true,
};

const mockUsers: User[] = [mockUser];

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUsers', () => {
    it('fetches users without filters', async () => {
      vi.mocked(apiService.get).mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      const result = await userService.getUsers();

      expect(apiService.get).toHaveBeenCalledWith('/users');
      expect(result).toEqual({
        success: true,
        data: mockUsers,
      });
    });

    it('fetches users with search filter', async () => {
      vi.mocked(apiService.get).mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      await userService.getUsers({ search: 'test' });

      expect(apiService.get).toHaveBeenCalledWith('/users?search=test');
    });

    it('fetches users with role filter', async () => {
      vi.mocked(apiService.get).mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      await userService.getUsers({ role: 'editor' });

      expect(apiService.get).toHaveBeenCalledWith('/users?role=editor');
    });

    it('fetches users with isActive filter', async () => {
      vi.mocked(apiService.get).mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      await userService.getUsers({ isActive: true });

      expect(apiService.get).toHaveBeenCalledWith('/users?isActive=true');
    });

    it('fetches users with multiple filters', async () => {
      vi.mocked(apiService.get).mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      await userService.getUsers({
        search: 'test',
        role: 'editor',
        isActive: false,
      });

      expect(apiService.get).toHaveBeenCalledWith('/users?search=test&role=editor&isActive=false');
    });
  });

  describe('getUserById', () => {
    it('fetches user by id', async () => {
      vi.mocked(apiService.get).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await userService.getUserById('1');

      expect(apiService.get).toHaveBeenCalledWith('/users/1');
      expect(result).toEqual({
        success: true,
        data: mockUser,
      });
    });
  });

  describe('createUser', () => {
    it('creates a new user', async () => {
      const createData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        role: 'editor' as const,
      };

      vi.mocked(apiService.post).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await userService.createUser(createData);

      expect(apiService.post).toHaveBeenCalledWith('/users', createData);
      expect(result).toEqual({
        success: true,
        data: mockUser,
      });
    });
  });

  describe('updateUser', () => {
    it('updates an existing user', async () => {
      const updateData = {
        username: 'updateduser',
        email: 'updated@example.com',
        role: 'administrator' as const,
      };

      vi.mocked(apiService.put).mockResolvedValue({
        success: true,
        data: { ...mockUser, ...updateData },
      });

      const result = await userService.updateUser('1', updateData);

      expect(apiService.put).toHaveBeenCalledWith('/users/1', updateData);
      expect(result).toEqual({
        success: true,
        data: { ...mockUser, ...updateData },
      });
    });
  });

  describe('deleteUser', () => {
    it('deletes a user', async () => {
      vi.mocked(apiService.delete).mockResolvedValue({
        success: true,
      });

      const result = await userService.deleteUser('1');

      expect(apiService.delete).toHaveBeenCalledWith('/users/1');
      expect(result).toEqual({
        success: true,
      });
    });
  });

  describe('activateUser', () => {
    it('activates a user', async () => {
      const activatedUser = { ...mockUser, isActive: true };

      vi.mocked(apiService.put).mockResolvedValue({
        success: true,
        data: activatedUser,
      });

      const result = await userService.activateUser('1');

      expect(apiService.put).toHaveBeenCalledWith('/users/1', { isActive: true });
      expect(result).toEqual({
        success: true,
        data: activatedUser,
      });
    });
  });

  describe('deactivateUser', () => {
    it('deactivates a user', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };

      vi.mocked(apiService.put).mockResolvedValue({
        success: true,
        data: deactivatedUser,
      });

      const result = await userService.deactivateUser('1');

      expect(apiService.put).toHaveBeenCalledWith('/users/1', { isActive: false });
      expect(result).toEqual({
        success: true,
        data: deactivatedUser,
      });
    });
  });
});