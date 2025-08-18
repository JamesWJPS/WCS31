import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import PageMenuSidebar from '../PageMenuSidebar';
import { ContentItem } from '../../../types';

// Mock data for testing
const mockContents: ContentItem[] = [
  {
    id: '1',
    title: 'Home',
    slug: 'home',
    menu_order: 1,
    show_in_menu: true,
    status: 'published',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    title: 'About',
    slug: 'about',
    menu_order: 2,
    show_in_menu: true,
    status: 'published',
    updated_at: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    title: 'Services',
    slug: 'services',
    menu_order: 3,
    show_in_menu: true,
    status: 'published',
    updated_at: '2024-01-03T00:00:00Z'
  },
  {
    id: '4',
    title: 'Web Development',
    slug: 'web-development',
    parent_id: '3',
    menu_order: 1,
    show_in_menu: true,
    status: 'published',
    updated_at: '2024-01-04T00:00:00Z'
  },
  {
    id: '5',
    title: 'Draft Page',
    slug: 'draft-page',
    menu_order: 4,
    show_in_menu: true,
    status: 'draft',
    updated_at: '2024-01-05T00:00:00Z'
  },
  {
    id: '6',
    title: 'Hidden Page',
    slug: 'hidden-page',
    menu_order: 5,
    show_in_menu: false,
    status: 'published',
    updated_at: '2024-01-06T00:00:00Z'
  }
];

describe('PageMenuSidebar', () => {
  const mockOnPageSelect = vi.fn();
  const mockOnEditContent = vi.fn();
  const mockOnDeleteContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders loading state correctly', () => {
      render(
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={mockOnPageSelect}
          loading={true}
        />
      );

      expect(screen.getByText('Loading pages...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders empty state correctly', () => {
      render(
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={mockOnPageSelect}
          contents={[]}
        />
      );

      expect(screen.getByText('No pages available')).toBeInTheDocument();
    });

    it('renders menu items correctly', () => {
      render(
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
    });
  });

  describe('Hierarchical Menu Structure', () => {
    it('builds hierarchical menu tree correctly', () => {
      render(
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      // Services should have an expand button
      const servicesButton = screen.getByText('Services').closest('button');
      expect(servicesButton).toBeInTheDocument();
      
      // Should have expand toggle for Services (parent item)
      const expandToggle = servicesButton?.querySelector('.expand-toggle');
      expect(expandToggle).toBeInTheDocument();
    });

    it('expands and collapses menu items correctly', async () => {
      render(
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      const expandToggle = screen.getByLabelText('Expand');
      
      // Initially collapsed - child should not be visible
      expect(screen.queryByText('Web Development')).not.toBeInTheDocument();
      
      // Click to expand
      fireEvent.click(expandToggle);
      
      await waitFor(() => {
        expect(screen.getByText('Web Development')).toBeInTheDocument();
      });
      
      // Click to collapse
      const collapseToggle = screen.getByLabelText('Collapse');
      fireEvent.click(collapseToggle);
      
      await waitFor(() => {
        expect(screen.queryByText('Web Development')).not.toBeInTheDocument();
      });
    });
  });

  describe('Page Selection', () => {
    it('calls onPageSelect when menu item is clicked', () => {
      render(
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      const homeButton = screen.getByText('Home').closest('button');
      fireEvent.click(homeButton!);

      expect(mockOnPageSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          title: 'Home',
          slug: 'home'
        })
      );
    });

    it('highlights selected menu item', () => {
      render(
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          selectedContentId="2"
        />
      );

      const aboutButton = screen.getByText('About').closest('button');
      expect(aboutButton).toHaveClass('selected');
    });
  });

  describe('Admin Mode Features', () => {
    it('shows admin mode indicator', () => {
      render(
        <PageMenuSidebar
          isAdminMode={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      expect(screen.getByText('Admin View')).toBeInTheDocument();
    });

    it('shows draft and hidden badges in admin mode', () => {
      render(
        <PageMenuSidebar
          isAdminMode={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Hidden')).toBeInTheDocument();
    });

    it('shows admin controls when enabled', () => {
      render(
        <PageMenuSidebar
          isAdminMode={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          showAdminControls={true}
          onEditContent={mockOnEditContent}
          onDeleteContent={mockOnDeleteContent}
        />
      );

      const editButtons = screen.getAllByLabelText(/Edit/);
      const deleteButtons = screen.getAllByLabelText(/Delete/);
      
      expect(editButtons.length).toBeGreaterThan(0);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('calls onEditContent when edit button is clicked', () => {
      render(
        <PageMenuSidebar
          isAdminMode={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          showAdminControls={true}
          onEditContent={mockOnEditContent}
          onDeleteContent={mockOnDeleteContent}
        />
      );

      const editButton = screen.getByLabelText('Edit Home');
      fireEvent.click(editButton);

      expect(mockOnEditContent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          title: 'Home'
        })
      );
    });

    it('shows confirmation dialog for delete', () => {
      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => true);

      render(
        <PageMenuSidebar
          isAdminMode={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          showAdminControls={true}
          onEditContent={mockOnEditContent}
          onDeleteContent={mockOnDeleteContent}
        />
      );

      const deleteButton = screen.getByLabelText('Delete Home');
      fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete "Home"?');
      expect(mockOnDeleteContent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          title: 'Home'
        })
      );

      // Restore original confirm
      window.confirm = originalConfirm;
    });
  });

  describe('Public Mode Features', () => {
    it('shows admin login link in public mode', () => {
      render(
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      expect(screen.getByText('Admin Login')).toBeInTheDocument();
    });

    it('does not show admin login link in admin mode', () => {
      render(
        <PageMenuSidebar
          isAdminMode={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      expect(screen.queryByText('Admin Login')).not.toBeInTheDocument();
    });

    it('shows last updated dates in public mode', () => {
      render(
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      // Should show formatted dates
      expect(screen.getByText('1/1/2024')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Page navigation');

      const tree = screen.getByRole('tree');
      expect(tree).toBeInTheDocument();
    });

    it('has proper button labels for screen readers', () => {
      render(
        <PageMenuSidebar
          isAdminMode={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          showAdminControls={true}
          onEditContent={mockOnEditContent}
          onDeleteContent={mockOnDeleteContent}
        />
      );

      expect(screen.getByLabelText('Edit Home')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete Home')).toBeInTheDocument();
    });
  });

  describe('Menu Title Override', () => {
    it('displays menu_title when available', () => {
      const contentsWithMenuTitle: ContentItem[] = [
        {
          id: '1',
          title: 'Very Long Page Title That Should Be Shortened',
          menu_title: 'Short Title',
          slug: 'page',
          menu_order: 1,
          show_in_menu: true,
          status: 'published'
        }
      ];

      render(
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={mockOnPageSelect}
          contents={contentsWithMenuTitle}
        />
      );

      expect(screen.getByText('Short Title')).toBeInTheDocument();
      expect(screen.queryByText('Very Long Page Title That Should Be Shortened')).not.toBeInTheDocument();
    });
  });
});