import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, AuthContext } from '../AuthContext';
import { useContext } from 'react';

// Mock authService
vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getStoredToken: vi.fn(),
    setStoredToken: vi.fn(),
    removeStoredToken: vi.fn(),
    isTokenExpired: vi.fn(),
    getProfile: vi.fn(),
  },
}));

// Import the mocked service
import { authService } from '../../services/authService';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test component to access auth context
const TestComponent = () => {
  const auth = useContext(AuthContext);
  if (!auth) return <div>No auth context</div>;

  return (
    <div>
      <div data-testid="user">{auth.user ? auth.user.username : 'No user'}</div>
      <div data-testid="authenticated">{auth.isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="loading">{auth.isLoading ? 'true' : 'false'}</div>
      <div data-testid="error">{auth.error || 'No error'}</div>
      <button onClick={() => auth.login('testuser', 'password')}>Login</button>
      <button onClick={() => auth.logout()}>Logout</button>
      <button onClick={() => auth.clearError()}>Clear Error</button>
    </div>
  );
};

const renderWithAuthProvider = () => {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    (authService.getStoredToken as any).mockReturnValue(null);
    (authService.isTokenExpired as any).mockReturnValue(false);
  });

  it('should provide initial auth state', async () => {
    renderWithAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });
  });

  it('should handle successful login', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'editor' as const,
      isActive: true,
    };

    (authService.login as any).mockResolvedValue({
      user: mockUser,
      token: 'test-token',
    });

    renderWithAuthProvider();

    const loginButton = screen.getByText('Login');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(authService.login).toHaveBeenCalledWith({ username: 'testuser', password: 'password' });
    expect(authService.setStoredToken).toHaveBeenCalledWith('test-token');
  });

  it('should handle login failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Invalid credentials';

    (authService.login as any).mockRejectedValue(new Error(errorMessage));

    renderWithAuthProvider();

    const loginButton = screen.getByText('Login');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(errorMessage);
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
  });

  it('should clear error', async () => {
    const user = userEvent.setup();
    
    // First cause an error
    (authService.login as any).mockRejectedValue(new Error('Test error'));

    renderWithAuthProvider();

    const loginButton = screen.getByText('Login');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Test error');
    });

    // Then clear the error
    const clearErrorButton = screen.getByText('Clear Error');
    await user.click(clearErrorButton);

    expect(screen.getByTestId('error')).toHaveTextContent('No error');
  });
});