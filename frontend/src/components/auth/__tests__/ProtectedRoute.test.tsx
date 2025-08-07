import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import ProtectedRoute from '../ProtectedRoute';

// Mock the useAuth hook
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div>Navigate to {to}</div>,
}));

import { useAuth } from '../../../hooks/useAuth';

const TestComponent = () => <div>Protected Content</div>;

describe('ProtectedRoute', () => {
  it('should redirect to login when user is not authenticated', () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: false,
      user: null,
    });

    const { container } = render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(container.textContent).toContain('Navigate to /login');
  });

  it('should render children when user is authenticated', () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      user: { role: 'editor' },
    });

    const { container } = render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(container.textContent).toContain('Protected Content');
  });

  it('should redirect to dashboard when user lacks required role', () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      user: { role: 'read-only' },
    });

    const { container } = render(
      <ProtectedRoute requiredRole="administrator">
        <TestComponent />
      </ProtectedRoute>
    );

    expect(container.textContent).toContain('Navigate to /dashboard');
  });
});