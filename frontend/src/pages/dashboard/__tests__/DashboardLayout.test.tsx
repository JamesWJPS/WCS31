import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Mock PageMenuSidebar with more realistic behavior
vi.mock('../../../components/layout/PageMenuSidebar', () => ({
  default: ({ isAdminMode, onPageSelect, showAdminControls, onEditContent, onDeleteContent }: any) => (
    <div data-testid="page-menu-sidebar" className="dashboard-menu-sidebar">
      <div>Admin Mode: {isAdminMode ? 'true' : 'false'}</div>
      <div>Show Admin Controls: {showAdminControls ? 'true' : 'false'}</div>
      <button 
        onClick={() => onPageSelect({ id: '1', title: 'Test Page', status: 'published' })}
        data-testid="select-page-btn"
      >
        Select Test Page
      </button>
      <button 
        onClick={() => onEditContent({ id: '1', title: 'Test Page' })}
        data-testid="edit-page-btn"
      >
        Edit Page
      </button>
      <button 
        onClick={() => onDeleteContent({ id: '1', title: 'Test Page' })}
        data-testid="delete-page-btn"
      >
        Delete Page
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

const mockContentList = [
  {
    id: '1',
    title: 'Test Page 1',
    slug: 'test-page-1',
    status: 'published' as const,
    templateName: 'Basic',
    authorName: 'Test User',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    publishedAt: '2024-01-01T00:00:00Z',
    menu_title: 'Test Page 1',
    show_in_menu: true,
    menu_order: 1,
  },
  {
    id: '2',
    title: 'Draft Page',
    slug: 'draft-page',
    status: 'draft' as const,
    templateName: 'Basic',
    authorName: 'Test User',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    publishedAt: null,
    menu_title: 'Draft Page',
    show_in_menu: true,
    menu_order: 2,
  },
];

const mockContent = {
  id: '1',
  title: 'Test Page 1',
  slug: 'test-page-1',
  body: '<p>This is test content</p>',
  templateId: 'template-1',
  authorId: 'user-1',
  status: 'published' as const,
  metadata: {},
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  publishedAt: '2024-01-01T00:00:00Z',
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

describe('Dashboard Layout Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contentService.getContentList).mockResolvedValue(mockContentList);
    vi.mocked(contentService.getContent).mockResolvedValue(mockContent);
    vi.mocked(contentService.deleteContent).mockResolvedValue();
  });

  it('renders two-column layout with menu sidebar and content area', async () => {
    renderDashboard();

    // Check for two-column layout structure
    const dashboardLayout = document.querySelector('.dashboard-layout');
    expect(dashboardLayout).toBeInTheDocument();

    const menuSidebar = document.querySelector('.dashboard-menu-sidebar');
    expect(menuSidebar).toBeInTheDocument();

    const contentArea = document.querySelector('.dashboard-content-area');
    expect(contentArea).toBeInTheDocument();

    // Verify PageMenuSidebar is configured for admin mode
    expect(screen.getByText('Admin Mode: true')).toBeInTheDocument();
    expect(screen.getByText('Show Admin Controls: true')).toBeInTheDocument();
  });

  it('displays content statistics based on loaded content', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Total pages
    });

    // Check for published and draft counts
    const statNumbers = screen.getAllByText('1');
    expect(statNumbers).toHaveLength(2); // Published: 1, Drafts: 1
  });

  it('switches to content tab when page is selected', async () => {
    renderDashboard();

    // Initially on overview tab
    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();

    // Select a page from the menu
    const selectPageBtn = screen.getByTestId('select-page-btn');
    fireEvent.click(selectPageBtn);

    // Should switch to content tab and load content details
    await waitFor(() => {
      expect(screen.getByText('Test Page')).toBeInTheDocument();
    });

    // Should show content details
    await waitFor(() => {
      expect(screen.getByText('This is test content')).toBeInTheDocument();
    });
  });

  it('handles tab navigation correctly', async () => {
    renderDashboard();

    // Click on content tab
    const contentTab = screen.getByRole('tab', { name: /content/i });
    fireEvent.click(contentTab);

    expect(screen.getByText('Select a Page')).toBeInTheDocument();

    // Click on analytics tab
    const analyticsTab = screen.getByRole('tab', { name: /analytics/i });
    fireEvent.click(analyticsTab);

    expect(screen.getByText('Analytics dashboard will be implemented in future tasks')).toBeInTheDocument();

    // Click back to overview tab
    const overviewTab = screen.getByRole('tab', { name: /overview/i });
    fireEvent.click(overviewTab);

    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
  });

  it('handles content deletion and refreshes the list', async () => {
    renderDashboard();

    // Mock updated content list after deletion
    vi.mocked(contentService.getContentList).mockResolvedValueOnce([mockContentList[1]]); // Only draft page remains

    const deleteBtn = screen.getByTestId('delete-page-btn');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(contentService.deleteContent).toHaveBeenCalledWith('1');
    });

    await waitFor(() => {
      expect(contentService.getContentList).toHaveBeenCalledTimes(2); // Initial load + refresh after delete
    });
  });

  it('maintains existing admin functionality', async () => {
    renderDashboard();

    // Check that user info is displayed
    expect(screen.getByText('Welcome back, testuser. Manage your content and view site analytics.')).toBeInTheDocument();

    // Check that all admin tabs are present
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /content/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument();

    // Check that tab navigation works
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
  });
});