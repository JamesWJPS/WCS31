import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../authService';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('token management', () => {
    it('should get stored token from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('stored-token');

      const token = authService.getStoredToken();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token');
      expect(token).toBe('stored-token');
    });

    it('should set token in localStorage', () => {
      authService.setStoredToken('new-token');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'new-token');
    });

    it('should remove token from localStorage', () => {
      authService.removeStoredToken();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      // Create a token that expires in the future
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = { exp: futureTimestamp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;

      const result = authService.isTokenExpired(token);

      expect(result).toBe(false);
    });

    it('should return true for expired token', () => {
      // Create a token that expired in the past
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = { exp: pastTimestamp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;

      const result = authService.isTokenExpired(token);

      expect(result).toBe(true);
    });

    it('should return true for malformed token', () => {
      const result = authService.isTokenExpired('invalid-token');

      expect(result).toBe(true);
    });
  });
});