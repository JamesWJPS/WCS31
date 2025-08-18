import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import DashboardPage from '../DashboardPage';
import { AuthContext } from '../../../contexts/AuthContext';
import { contentService } from '../../../services/contentService';

// Mock the contentService
vi.mock('../../../services/contentService', () => ({
  contentService: {
    getContentList: vi.fn(),
    deleteContent: vi.fn(),
    getContent: vi.fn(),
  },
}));

// Mock PageMenuSidebar
vi.mock('../../../components/layout/PageMenuSidebar', () => ({
  default: ({ isAdminMode, onPageSelect, loading }: any) => (
    <div data-testid="page-menu-sidebar">
      <div>Admin Mode: {isAdminMode ? 'true' : 'false'}</div>
      <div>Loading: {loading ? 'true' : 'false'}</div>
      <button onClick={() => onPageSelect({ id: '1', title: 'Test Page' })}>
        Select Test Page
      </button>
    </div>
  ),
}));

const mockUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'administrator' as const,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastLogin: '2024-01-01T00:00:00Z',
  isActive: true,
};

const mockAuthContext = {
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <DashboardPage />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contentService.getContentList).mockResolvedValue([]);
  });

  it('renders dashboard with two-column layout', async () => {
    renderDashboard();

    // Check for main dashboard elements
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, testuser. Manage your content and view site analytics.')).toBeInTheDocument();

    // Check for PageMenuSidebar
    expect(screen.getByTestId('page-menu-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Admin Mode: true')).toBeInTheDocument();

    // Check for admin tabs
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /content/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument();
  });

  it('displays overview tab content by default', async () => {
    renderDashboard();

    // Check for overview content
    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    expect(screen.getByText('Total Pages')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
  });

  it('loads content list on mount', async () => {
    renderDashboard();

    expect(contentService.getContentList).toHaveBeenCalledTimes(1);
  });

  it('shows loading state initially', async () => {
    renderDashboard();

    expect(screen.getByText('Loading: true')).toBeInTheDocument();
  });
});