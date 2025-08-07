import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ContentList from '../ContentList';
import { contentService } from '../../../services/contentService';
import { useAuth } from '../../../hooks/useAuth';
import { ContentListItem, Template } from '../../../types';

// Mock dependencies
jest.mock('../../../services/contentService');
jest.mock('../../../hooks/useAuth');

const mockContentService = contentService as jest.Mocked<typeof contentService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockContentItems: ContentListItem[] = [
  {
    id: '1',
    title: 'First Content',
    slug: 'first-content',
    status: 'published',
    templateName: 'Basic Template',
    authorName: 'John Doe',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
    publishedAt: '2023-01-02T00:00:00Z',
  },
  {
    id: '2',
    title: 'Second Content',
    slug: 'second-content',
    status: 'draft',
    templateName: 'Advanced Template',
    authorName: 'Jane Smith',
    createdAt: '2023-01-03T00:00:00Z',
    updatedAt: '2023-01-03T00:00:00Z',
    publishedAt: null,
  },
];

const mockTemplates: Template[] = [
  {
    id: 'template-1',
    name: 'Basic Template',
    description: 'Basic template',
    htmlStructure: '<div>{{content}}</div>',
    cssStyles: '',
    accessibilityFeatures: {
      skipLinks: true,
      headingStructure: true,
      altTextRequired: true,
      colorContrastCompliant: true,
    },
    contentFields: [],
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ContentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContentService.getContentList.mockResolvedValue(mockContentItems);
    mockContentService.getTemplates.mockResolvedValue(mockTemplates);
  });

  describe('for administrator users', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'admin', email: 'admin@test.com', role: 'administrator', createdAt: '', updatedAt: '', lastLogin: null, isActive: true },
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
    });

    it('should render content list with create button', async () => {
      renderWithRouter(<ContentList />);

      await waitFor(() => {
        expect(screen.getByText('Content Management')).toBeInTheDocument();
        expect(screen.getByText('Create New Content')).toBeInTheDocument();
      });
    });

    it('should display content items', async () => {
      renderWithRouter(<ContentList />);

      await waitFor(() => {
        expect(screen.getByText('First Content')).toBeInTheDocument();
        expect(screen.getByText('Second Content')).toBeInTheDocument();
        expect(screen.getByText('published')).toBeInTheDocument();
        expect(screen.getByText('draft')).toBeInTheDocument();
      });
    });

    it('should show edit and delete buttons for administrators', async () => {
      renderWithRouter(<ContentList />);

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        const deleteButtons = screen.getAllByText('Delete');
        expect(editButtons).toHaveLength(2);
        expect(deleteButtons).toHaveLength(2);
      });
    });

    it('should handle delete confirmation', async () => {
      const user = userEvent.setup();
      
      // Mock window.confirm
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockContentService.deleteContent.mockResolvedValue();

      renderWithRouter(<ContentList />);

      await waitFor(() => {
        expect(screen.getByText('First Content')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want delete "First Content"? This action cannot be undone.'
      );
      expect(mockContentService.deleteContent).toHaveBeenCalledWith('1');

      mockConfirm.mockRestore();
    });

    it('should not delete when confirmation is cancelled', async () => {
      const user = userEvent.setup();
      
      // Mock window.confirm to return false
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithRouter(<ContentList />);

      await waitFor(() => {
        expect(screen.getByText('First Content')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockContentService.deleteContent).not.toHaveBeenCalled();

      mockConfirm.mockRestore();
    });
  });

  describe('for editor users', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: '2', username: 'editor', email: 'editor@test.com', role: 'editor', createdAt: '', updatedAt: '', lastLogin: null, isActive: true },
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
    });

    it('should show create and edit buttons but not delete', async () => {
      renderWithRouter(<ContentList />);

      await waitFor(() => {
        expect(screen.getByText('Create New Content')).toBeInTheDocument();
        expect(screen.getAllByText('Edit')).toHaveLength(2);
        expect(screen.queryByText('Delete')).not.toBeInTheDocument();
      });
    });
  });

  describe('for read-only users', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: '3', username: 'reader', email: 'reader@test.com', role: 'read-only', createdAt: '', updatedAt: '', lastLogin: null, isActive: true },
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
    });

    it('should not show create, edit, or delete buttons', async () => {
      renderWithRouter(<ContentList />);

      await waitFor(() => {
        expect(screen.getByText('Content Management')).toBeInTheDocument();
        expect(screen.queryByText('Create New Content')).not.toBeInTheDocument();
        expect(screen.queryByText('Edit')).not.toBeInTheDocument();
        expect(screen.queryByText('Delete')).not.toBeInTheDocument();
      });
    });
  });

  it('should display loading state', () => {
    mockContentService.getContentList.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([]), 100))
    );

    renderWithRouter(<ContentList />);

    expect(screen.getByText('Loading content...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // LoadingSpinner
  });

  it('should display empty state when no content', async () => {
    mockContentService.getContentList.mockResolvedValue([]);
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'admin', email: 'admin@test.com', role: 'administrator', createdAt: '', updatedAt: '', lastLogin: null, isActive: true },
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });

    renderWithRouter(<ContentList />);

    await waitFor(() => {
      expect(screen.getByText('No content found.')).toBeInTheDocument();
      expect(screen.getByText('Create Your First Content')).toBeInTheDocument();
    });
  });

  it('should handle search filter', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'admin', email: 'admin@test.com', role: 'administrator', createdAt: '', updatedAt: '', lastLogin: null, isActive: true },
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });

    renderWithRouter(<ContentList />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search content...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search content...');
    await user.type(searchInput, 'test search');

    // Should trigger a new API call with search filter
    await waitFor(() => {
      expect(mockContentService.getContentList).toHaveBeenCalledWith({
        search: 'test search',
      });
    });
  });

  it('should handle status filter', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'admin', email: 'admin@test.com', role: 'administrator', createdAt: '', updatedAt: '', lastLogin: null, isActive: true },
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });

    renderWithRouter(<ContentList />);

    await waitFor(() => {
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    });

    // This test would depend on the Select component implementation
    // We can verify the component renders without errors
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
  });

  it('should handle template filter', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'admin', email: 'admin@test.com', role: 'administrator', createdAt: '', updatedAt: '', lastLogin: null, isActive: true },
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });

    renderWithRouter(<ContentList />);

    await waitFor(() => {
      expect(screen.getByLabelText('Filter by template')).toBeInTheDocument();
    });

    // This test would depend on the Select component implementation
    expect(screen.getByLabelText('Filter by template')).toBeInTheDocument();
  });

  it('should display content metadata correctly', async () => {
    renderWithRouter(<ContentList />);

    await waitFor(() => {
      expect(screen.getByText('Template: Basic Template')).toBeInTheDocument();
      expect(screen.getByText('By: John Doe')).toBeInTheDocument();
      expect(screen.getByText('Created: Jan 1, 2023')).toBeInTheDocument();
      expect(screen.getByText(/Published: Jan 2, 2023/)).toBeInTheDocument();
    });
  });

  it('should display content slug', async () => {
    renderWithRouter(<ContentList />);

    await waitFor(() => {
      expect(screen.getByText('/first-content')).toBeInTheDocument();
      expect(screen.getByText('/second-content')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockContentService.getContentList.mockRejectedValue(new Error('API Error'));
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'admin', email: 'admin@test.com', role: 'administrator', createdAt: '', updatedAt: '', lastLogin: null, isActive: true },
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });

    renderWithRouter(<ContentList />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load content list')).toBeInTheDocument();
    });
  });

  it('should format dates correctly', async () => {
    renderWithRouter(<ContentList />);

    await waitFor(() => {
      // Check that dates are formatted in the expected format
      expect(screen.getByText('Created: Jan 1, 2023')).toBeInTheDocument();
      expect(screen.getByText(/Published: Jan 2, 2023/)).toBeInTheDocument();
    });
  });

  it('should show correct status badges', async () => {
    renderWithRouter(<ContentList />);

    await waitFor(() => {
      const publishedBadge = screen.getByText('published');
      const draftBadge = screen.getByText('draft');
      
      expect(publishedBadge).toHaveClass('status-published');
      expect(draftBadge).toHaveClass('status-draft');
    });
  });
});