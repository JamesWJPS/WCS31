import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  it('should throw error when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('should return auth context when used within AuthProvider', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toMatchObject({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: expect.any(Boolean),
      error: null,
      login: expect.any(Function),
      logout: expect.any(Function),
      clearError: expect.any(Function),
    });
  });
});