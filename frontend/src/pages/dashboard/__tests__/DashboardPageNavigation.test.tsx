import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  default: ({ isAdminMode, onPageSelect, selectedContentId, contents }: any) => (
    <div data-testid="page-menu-sidebar">
      <div>Admin Mode: {isAdminMode ? 'true' : 'false'}</div>
      <div>Selected: {selectedContentId || 'none'}</div>
      {contents.map((content: any) => (
        <button
          key={content.id}
          onClick={() => onPageSelect(content)}
          data-testid={`select-${content.id}`}
        >
          {content.title}
        </button>
      ))}
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
  refreshUser: vi.fn(),
};

const mockContents = [
  {
    id: '1',
    title: 'Home Page',
    slug: 'home',
    status: 'published' as const,
    templateName: 'Basic',
    authorName: 'Test User',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    publishedAt: '2024-01-01T00:00:00Z',
    show_in_menu: true,
    menu_order: 1,
  },
  {
    id: '2',
    title: 'About Page',
    slug: 'about',
    status: 'published' as const,
    templateName: 'Basic',
    authorName: 'Test User',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    publishedAt: '2024-01-01T00:00:00Z',
    show_in_menu: true,
    menu_order: 2,
  },
];

const mockContentDetails = {
  id: '1',
  title: 'Home Page',
  slug: 'home',
  body: '<h1>Welcome to Home Page</h1>',
  templateId: 'template1',
  authorId: 'user1',
  status: 'published' as const,
  metadata: {},
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  publishedAt: '2024-01-01T00:00:00Z',
  show_in_menu: true,
  menu_order: 1,
};

const renderDashboard = () => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <DashboardPage />
    </AuthContext.Provider>
  );
};

describe('DashboardPage Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear hash before each test
    window.location.hash = '';
    vi.mocked(contentService.getContentList).mockResolvedValue(mockContents);
    vi.mocked(contentService.getContent).mockResolvedValue(mockContentDetails);
  });

  it('should handle URL hash navigation on initial load', async () => {
    // Set hash before rendering
    window.location.hash = '#home';
    
    renderDashboard();

    await waitFor(() => {
      expect(contentService.getContentList).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(contentService.getContent).toHaveBeenCalledWith('1');
    });
  });

  it('should update URL hash when page is selected', async () => {
    const user = userEvent.setup();
    
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('page-menu-sidebar')).toBeInTheDocument();
    });

    const selectButton = screen.getByTestId('select-1');
    await user.click(selectButton);

    await waitFor(() => {
      expect(window.location.hash).toBe('#home');
    });
  });

  it('should handle hash changes after initial load', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(contentService.getContentList).toHaveBeenCalled();
    });

    // Simulate hash change
    window.location.hash = '#about';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    await waitFor(() => {
      expect(contentService.getContent).toHaveBeenCalledWith('2');
    });
  });

  it('should maintain admin interface context during navigation', async () => {
    const user = userEvent.setup();
    
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('page-menu-sidebar')).toBeInTheDocument();
    });

    // Verify admin mode is enabled
    expect(screen.getByText('Admin Mode: true')).toBeInTheDocument();

    // Select a page
    const selectButton = screen.getByTestId('select-1');
    await user.click(selectButton);

    // Admin mode should still be enabled
    expect(screen.getByText('Admin Mode: true')).toBeInTheDocument();
    
    // Content tab should be active
    await waitFor(() => {
      expect(screen.getByText('📝 Content')).toBeInTheDocument();
    });
  });

  it('should display selected content in admin interface', async () => {
    const user = userEvent.setup();
    
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('page-menu-sidebar')).toBeInTheDocument();
    });

    const selectButton = screen.getByTestId('select-1');
    await user.click(selectButton);

    // Check that the content is displayed in the content area (not just the sidebar)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Home Page', level: 2 })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Welcome to Home Page')).toBeInTheDocument();
    });
  });
});