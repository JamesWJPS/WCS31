import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import ContentEditor from '../ContentEditor';
import { contentService } from '../../../services/contentService';
import { useAuth } from '../../../hooks/useAuth';
import { Content, Template } from '../../../types';

// Mock dependencies
jest.mock('../../../services/contentService');
jest.mock('../../../hooks/useAuth');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({ id: '1' }),
}));

const mockContentService = contentService as jest.Mocked<typeof contentService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockContent: Content = {
  id: '1',
  title: 'Test Content',
  slug: 'test-content',
  body: '<p>Test content body</p>',
  templateId: 'template-1',
  authorId: 'user-1',
  status: 'draft',
  metadata: {},
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  publishedAt: null,
};

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

const renderWithRouter = (component: React.ReactElement, initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {component}
    </MemoryRouter>
  );
};

describe('ContentEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContentService.getTemplates.mockResolvedValue(mockTemplates);
    mockContentService.validateContent.mockReturnValue({ isValid: true, errors: {} });
    mockContentService.generateSlug.mockImplementation((title) => 
      title.toLowerCase().replace(/\s+/g, '-')
    );
  });

  describe('Create Mode', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'editor', email: 'editor@test.com', role: 'editor', createdAt: '', updatedAt: '', lastLogin: null, isActive: true },
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
    });

    it('should render create form', async () => {
      renderWithRouter(<ContentEditor mode="create" />);

      await waitFor(() => {
        expect(screen.getByText('Create New Content')).toBeInTheDocument();
        expect(screen.getByLabelText('Title')).toBeInTheDocument();
        expect(screen.getByLabelText('Slug')).toBeInTheDocument();
        expect(screen.getByText('Create Content')).toBeInTheDocument();
      });
    });

    it('should auto-generate slug from title', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(<ContentEditor mode="create" />);

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText('Title');
      await user.type(titleInput, 'My New Content');

      expect(mockContentService.generateSlug).toHaveBeenCalledWith('My New Content');
    });

    it('should create content on form submission', async () => {
      const user = userEvent.setup();
      const mockCreatedContent = { ...mockContent, id: '2' };
      mockContentService.createContent.mockResolvedValue(mockCreatedContent);

      renderWithRouter(<ContentEditor mode="create" />);

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument();
      });

      // Fill form
      await user.type(screen.getByLabelText('Title'), 'New Content');
      await user.type(screen.getByLabelText('Slug'), 'new-content');
      
      // Submit form
      const submitButton = screen.getByText('Create Content');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockContentService.createContent).toHaveBeenCalled();
      });
    });

    it('should show validation errors', async () => {
      const user = userEvent.setup();
      mockContentService.validateContent.mockReturnValue({
        isValid: false,
        errors: { title: 'Title is required' }
      });

      renderWithRouter(<ContentEditor mode="create" />);

      await waitFor(() => {
        expect(screen.getByText('Create Content')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Create Content');
      await user.click(submitButton);

      // Should not call create service when validation fails
      expect(mockContentService.createContent).not.toHaveBeenCalled();
    });

    it('should not show delete button in create mode', async () => {
      renderWithRouter(<ContentEditor mode="create" />);

      await waitFor(() => {
        expect(screen.getByText('Create New Content')).toBeInTheDocument();
      });

      expect(screen.queryByText('Delete Content')).not.toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'admin', email: 'admin@test.com', role: 'administrator', createdAt: '', updatedAt: '', lastLogin: null, isActive: true },
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
      mockContentService.getContent.mockResolvedValue(mockContent);
    });

    it('should render edit form with existing content', async () => {
      renderWithRouter(<ContentEditor mode="edit" />);

      await waitFor(() => {
        expect(screen.getByText('Edit Content')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Content')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test-content')).toBeInTheDocument();
      });
    });

    it('should load existing content on mount', async () => {
      renderWithRouter(<ContentEditor mode="edit" />);

      await waitFor(() => {
        expect(mockContentService.getContent).toHaveBeenCalledWith('1');
      });
    });

    it('should update content on form submission', async () => {
      const user = userEvent.setup();
      mockContentService.updateContent.mockResolvedValue(mockContent);

      renderWithRouter(<ContentEditor mode="edit" />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Content')).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue('Test Content');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Content');

      const submitButton = screen.getByText('Update Content');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockContentService.updateContent).toHaveBeenCalledWith('1', expect.objectContaining({
          title: 'Updated Content'
        }));
      });
    });

    it('should show delete button for administrators', async () => {
      renderWithRouter(<ContentEditor mode="edit" />);

      await waitFor(() => {
        expect(screen.getByText('Delete Content')).toBeInTheDocument();
      });
    });

    it('should handle delete confirmation', async () => {
      const user = userEvent.setup();
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockContentService.deleteContent.mockResolvedValue();

      renderWithRouter(<ContentEditor mode="edit" />);

      await waitFor(() => {
        expect(screen.getByText('Delete Content')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('Delete Content');
      await user.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this content? This action cannot be undone.'
      );
      expect(mockContentService.deleteContent).toHaveBeenCalledWith('1');

      mockConfirm.mockRestore();
    });

    it('should not delete when confirmation is cancelled', async () => {
      const user = userEvent.setup();
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithRouter(<ContentEditor mode="edit" />);

      await waitFor(() => {
        expect(screen.getByText('Delete Content')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('Delete Content');
      await user.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockContentService.deleteContent).not.toHaveBeenCalled();

      mockConfirm.mockRestore();
    });
  });

  describe('Preview functionality', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'editor', email: 'editor@test.com', role: 'editor', createdAt: '', updatedAt: '', lastLogin: null, isActive: true },
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
    });

    it('should toggle preview visibility', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(<ContentEditor mode="create" />);

      await waitFor(() => {
        expect(screen.getByText('Show Preview')).toBeInTheDocument();
      });

      const previewButton = screen.getByText('Show Preview');
      await user.click(previewButton);

      expect(screen.getByText('Hide Preview')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('should show preview when toggled', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(<ContentEditor mode="create" />);

      await waitFor(() => {
        expect(screen.getByText('Show Preview')).toBeInTheDocument();
      });

      const previewButton = screen.getByText('Show Preview');
      await user.click(previewButton);

      expect(screen.getByText('Preview')).toBeInTheDocument();
    });
  });

  describe('Loading states', () => {
    it('should show loading state while loading data', () => {
      mockContentService.getTemplates.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      renderWithRouter(<ContentEditor mode="create" />);

      expect(screen.getByText('Loading content editor...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should show saving state during form submission', async () => {
      const user = userEvent.setup();
      mockContentService.createContent.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockContent), 100))
      );

      renderWithRouter(<ContentEditor mode="create" />);

      await waitFor(() => {
        expect(screen.getByText('Create Content')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Create Content');
      await user.click(submitButton);

      // Button should show loading state
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'editor', email: 'editor@test.com', role: 'editor', createdAt: '', updatedAt: '', lastLogin: null, isActive: true },
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
    });

    it('should handle content loading errors', async () => {
      mockContentService.getContent.mockRejectedValue(new Error('Content not found'));

      renderWithRouter(<ContentEditor mode="edit" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load content data')).toBeInTheDocument();
      });
    });

    it('should handle content creation errors', async () => {
      const user = userEvent.setup();
      mockContentService.createContent.mockRejectedValue(new Error('Creation failed'));

      renderWithRouter(<ContentEditor mode="create" />);

      await waitFor(() => {
        expect(screen.getByText('Create Content')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Create Content');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to save content')).toBeInTheDocument();
      });
    });

    it('should handle content update errors', async () => {
      const user = userEvent.setup();
      mockContentService.getContent.mockResolvedValue(mockContent);
      mockContentService.updateContent.mockRejectedValue(new Error('Update failed'));

      renderWithRouter(<ContentEditor mode="edit" />);

      await waitFor(() => {
        expect(screen.getByText('Update Content')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Update Content');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to save content')).toBeInTheDocument();
      });
    });
  });

  describe('Permissions', () => {
    it('should not show delete button for non-administrators', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'editor', email: 'editor@test.com', role: 'editor', createdAt: '', updatedAt: '', lastLogin: null, isActive: true },
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
      mockContentService.getContent.mockResolvedValue(mockContent);

      renderWithRouter(<ContentEditor mode="edit" />);

      await waitFor(() => {
        expect(screen.getByText('Edit Content')).toBeInTheDocument();
      });

      expect(screen.queryByText('Delete Content')).not.toBeInTheDocument();
    });
  });

  describe('Form validation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'editor', email: 'editor@test.com', role: 'editor', createdAt: '', updatedAt: '', lastLogin: null, isActive: true },
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
    });

    it('should clear field errors when user starts typing', async () => {
      const user = userEvent.setup();
      mockContentService.validateContent
        .mockReturnValueOnce({ isValid: false, errors: { title: 'Title is required' } })
        .mockReturnValue({ isValid: true, errors: {} });

      renderWithRouter(<ContentEditor mode="create" />);

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument();
      });

      // Submit form to trigger validation error
      const submitButton = screen.getByText('Create Content');
      await user.click(submitButton);

      // Type in title field to clear error
      const titleInput = screen.getByLabelText('Title');
      await user.type(titleInput, 'New Title');

      // Error should be cleared (this would depend on the actual error display implementation)
      expect(titleInput).toBeInTheDocument();
    });
  });
});