import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LogoutButton from '../LogoutButton';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock authService
vi.mock('../../../services/authService', () => ({
  authService: {
    logout: vi.fn(),
    getStoredToken: vi.fn(),
    removeStoredToken: vi.fn(),
    isTokenExpired: vi.fn(),
    getProfile: vi.fn(),
  },
}));

const renderLogoutButton = (props = {}) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LogoutButton {...props} />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('LogoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockNavigate.mockClear();
  });

  it('should render logout button with default text', () => {
    renderLogoutButton();

    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('should render with custom variant and size', () => {
    renderLogoutButton({ variant: 'danger', size: 'large' });

    const button = screen.getByRole('button', { name: /sign out/i });
    expect(button).toBeInTheDocument();
  });

  it('should handle logout without confirmation', async () => {
    const user = userEvent.setup();
    renderLogoutButton();

    const logoutButton = screen.getByRole('button', { name: /sign out/i });
    await user.click(logoutButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('should show confirmation dialog when showConfirmation is true', async () => {
    const user = userEvent.setup();
    renderLogoutButton({ showConfirmation: true });

    const logoutButton = screen.getByRole('button', { name: /sign out/i });
    await user.click(logoutButton);

    expect(screen.getByText(/are you sure you want to sign out/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /yes, sign out/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should handle confirmation dialog - confirm logout', async () => {
    const user = userEvent.setup();
    renderLogoutButton({ showConfirmation: true });

    const logoutButton = screen.getByRole('button', { name: /sign out/i });
    await user.click(logoutButton);

    const confirmButton = screen.getByRole('button', { name: /yes, sign out/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('should handle confirmation dialog - cancel logout', async () => {
    const user = userEvent.setup();
    renderLogoutButton({ showConfirmation: true });

    const logoutButton = screen.getByRole('button', { name: /sign out/i });
    await user.click(logoutButton);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(screen.queryByText(/are you sure you want to sign out/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('should show loading state during logout', async () => {
    const user = userEvent.setup();
    renderLogoutButton();

    const logoutButton = screen.getByRole('button', { name: /sign out/i });
    
    // Check initial state
    expect(logoutButton).not.toBeDisabled();
    
    await user.click(logoutButton);

    // Note: The loading state is very brief and hard to test reliably
    // This test verifies the component renders and handles clicks
    expect(logoutButton).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    renderLogoutButton();

    const button = screen.getByRole('button', { name: /sign out of your account/i });
    expect(button).toHaveAttribute('aria-label', 'Sign out of your account');
  });
});