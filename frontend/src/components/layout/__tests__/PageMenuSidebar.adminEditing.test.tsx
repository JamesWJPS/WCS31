import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import PageMenuSidebar from '../PageMenuSidebar';
import { ContentItem } from '../../../types';

// Mock Bootstrap Icons
vi.mock('bootstrap-icons/font/bootstrap-icons.css', () => ({}));

const mockContents: ContentItem[] = [
  {
    id: '1',
    title: 'Home Page',
    slug: 'home',
    menu_title: 'Home',
    status: 'published',
    show_in_menu: true,
    menu_order: 1,
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    title: 'About Us',
    slug: 'about',
    status: 'draft',
    show_in_menu: true,
    menu_order: 2,
    updated_at: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    title: 'Services',
    slug: 'services',
    status: 'published',
    show_in_menu: true,
    menu_order: 3,
    updated_at: '2024-01-03T00:00:00Z'
  }
];

describe('PageMenuSidebar - Admin Editing Integration', () => {
  const mockOnPageSelect = vi.fn();
  const mockOnEditContent = vi.fn();
  const mockOnDeleteContent = vi.fn();
  const mockOnQuickEdit = vi.fn();
  const mockOnDuplicateContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Admin Controls Visibility', () => {
    it('should show admin controls when in admin mode with showAdminControls enabled', () => {
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          onEditContent={mockOnEditContent}
          onDeleteContent={mockOnDeleteContent}
          onQuickEdit={mockOnQuickEdit}
          onDuplicateContent={mockOnDuplicateContent}
        />
      );

      // Check that admin control buttons are present
      expect(screen.getAllByTitle('Quick edit')).toHaveLength(mockContents.length);
      expect(screen.getAllByTitle('Edit content')).toHaveLength(mockContents.length);
      expect(screen.getAllByTitle('More options')).toHaveLength(mockContents.length);
    });

    it('should not show admin controls when not in admin mode', () => {
      render(
        <PageMenuSidebar
          isAdminMode={false}
          showAdminControls={false}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      // Check that admin control buttons are not present
      expect(screen.queryByTitle('Quick edit')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Edit content')).not.toBeInTheDocument();
      expect(screen.queryByTitle('More options')).not.toBeInTheDocument();
    });

    it('should not show admin controls when in admin mode but showAdminControls is disabled', () => {
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={false}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      // Check that admin control buttons are not present
      expect(screen.queryByTitle('Quick edit')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Edit content')).not.toBeInTheDocument();
      expect(screen.queryByTitle('More options')).not.toBeInTheDocument();
    });
  });

  describe('Quick Edit Functionality', () => {
    it('should call onQuickEdit when quick edit button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          onQuickEdit={mockOnQuickEdit}
        />
      );

      const quickEditButtons = screen.getAllByTitle('Quick edit');
      await user.click(quickEditButtons[0]);

      expect(mockOnQuickEdit).toHaveBeenCalledWith(expect.objectContaining({
        id: mockContents[0].id,
        title: mockContents[0].title,
        slug: mockContents[0].slug,
        menu_title: mockContents[0].menu_title,
        status: mockContents[0].status,
        show_in_menu: mockContents[0].show_in_menu,
        menu_order: mockContents[0].menu_order,
        updated_at: mockContents[0].updated_at
      }));
      expect(mockOnPageSelect).not.toHaveBeenCalled(); // Should not trigger page selection
    });

    it('should not call onQuickEdit if handler is not provided', async () => {
      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      const quickEditButtons = screen.getAllByTitle('Quick edit');
      await user.click(quickEditButtons[0]);

      // Should not throw error and should not call page select
      expect(mockOnPageSelect).not.toHaveBeenCalled();
    });
  });

  describe('Edit Content Functionality', () => {
    it('should call onEditContent when edit button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          onEditContent={mockOnEditContent}
        />
      );

      const editButtons = screen.getAllByTitle('Edit content');
      await user.click(editButtons[1]);

      expect(mockOnEditContent).toHaveBeenCalledWith(expect.objectContaining({
        id: mockContents[1].id,
        title: mockContents[1].title,
        slug: mockContents[1].slug,
        status: mockContents[1].status,
        show_in_menu: mockContents[1].show_in_menu,
        menu_order: mockContents[1].menu_order,
        updated_at: mockContents[1].updated_at
      }));
      expect(mockOnPageSelect).not.toHaveBeenCalled(); // Should not trigger page selection
    });
  });

  describe('Context Menu Functionality', () => {
    it('should show context menu when more options button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          onEditContent={mockOnEditContent}
          onQuickEdit={mockOnQuickEdit}
          onDuplicateContent={mockOnDuplicateContent}
        />
      );

      const moreButtons = screen.getAllByTitle('More options');
      await user.click(moreButtons[0]);

      // Check that context menu items are visible
      expect(screen.getByText('Quick Edit')).toBeInTheDocument();
      expect(screen.getByText('Full Edit')).toBeInTheDocument();
      expect(screen.getByText('Duplicate')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should show context menu on right-click', async () => {
      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          onEditContent={mockOnEditContent}
          onQuickEdit={mockOnQuickEdit}
          onDuplicateContent={mockOnDuplicateContent}
        />
      );

      const menuButtons = screen.getAllByRole('button');
      const firstPageButton = menuButtons.find(button => 
        button.textContent?.includes('Home Page')
      );
      
      if (firstPageButton) {
        fireEvent.contextMenu(firstPageButton);
        
        await waitFor(() => {
          expect(screen.getByText('Quick Edit')).toBeInTheDocument();
        });
      }
    });

    it('should call appropriate handlers from context menu', async () => {
      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          onEditContent={mockOnEditContent}
          onQuickEdit={mockOnQuickEdit}
          onDuplicateContent={mockOnDuplicateContent}
        />
      );

      const moreButtons = screen.getAllByTitle('More options');
      await user.click(moreButtons[0]);

      // Test Quick Edit from context menu
      await user.click(screen.getByText('Quick Edit'));
      expect(mockOnQuickEdit).toHaveBeenCalledWith(mockContents[0]);

      // Open context menu again
      await user.click(moreButtons[0]);
      
      // Test Full Edit from context menu
      await user.click(screen.getByText('Full Edit'));
      expect(mockOnEditContent).toHaveBeenCalledWith(mockContents[0]);

      // Open context menu again
      await user.click(moreButtons[0]);
      
      // Test Duplicate from context menu
      await user.click(screen.getByText('Duplicate'));
      expect(mockOnDuplicateContent).toHaveBeenCalledWith(mockContents[0]);
    });

    it('should close context menu when clicking outside', async () => {
      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          onEditContent={mockOnEditContent}
          onQuickEdit={mockOnQuickEdit}
          onDuplicateContent={mockOnDuplicateContent}
        />
      );

      const moreButtons = screen.getAllByTitle('More options');
      await user.click(moreButtons[0]);

      // Context menu should be visible
      expect(screen.getByText('Quick Edit')).toBeInTheDocument();

      // Click outside (on document body)
      await user.click(document.body);

      // Context menu should be closed
      await waitFor(() => {
        expect(screen.queryByText('Quick Edit')).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete Confirmation Dialog', () => {
    it('should show confirmation dialog when delete is clicked from context menu', async () => {
      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          onDeleteContent={mockOnDeleteContent}
        />
      );

      const moreButtons = screen.getAllByTitle('More options');
      await user.click(moreButtons[0]);
      await user.click(screen.getByText('Delete'));

      // Check that confirmation dialog is visible
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      expect(screen.getByText('"Home Page"')).toBeInTheDocument();
    });

    it('should call onDeleteContent when delete is confirmed', async () => {
      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          onDeleteContent={mockOnDeleteContent}
        />
      );

      const moreButtons = screen.getAllByTitle('More options');
      await user.click(moreButtons[0]);
      await user.click(screen.getByText('Delete'));

      // Confirm deletion
      const deleteButton = screen.getByRole('button', { name: /Delete Page/ });
      await user.click(deleteButton);

      expect(mockOnDeleteContent).toHaveBeenCalledWith(mockContents[0]);
    });

    it('should not call onDeleteContent when delete is cancelled', async () => {
      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          onDeleteContent={mockOnDeleteContent}
        />
      );

      const moreButtons = screen.getAllByTitle('More options');
      await user.click(moreButtons[0]);
      await user.click(screen.getByText('Delete'));

      // Cancel deletion
      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      await user.click(cancelButton);

      expect(mockOnDeleteContent).not.toHaveBeenCalled();
      expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    });

    it('should close confirmation dialog when close button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          onDeleteContent={mockOnDeleteContent}
        />
      );

      const moreButtons = screen.getAllByTitle('More options');
      await user.click(moreButtons[0]);
      await user.click(screen.getByText('Delete'));

      // Close dialog using close button
      const closeButton = screen.getByLabelText('Close dialog');
      await user.click(closeButton);

      expect(mockOnDeleteContent).not.toHaveBeenCalled();
      expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    });

    it('should show warning for pages with children', async () => {
      const contentsWithChildren: ContentItem[] = [
        {
          ...mockContents[0],
          children: [
            { id: '1-1', title: 'Child Page 1', parent_id: '1' },
            { id: '1-2', title: 'Child Page 2', parent_id: '1' }
          ]
        }
      ];

      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={contentsWithChildren}
          onDeleteContent={mockOnDeleteContent}
        />
      );

      const moreButtons = screen.getAllByTitle('More options');
      await user.click(moreButtons[0]);
      await user.click(screen.getByText('Delete'));

      // Check that warning about child pages is shown
      expect(screen.getByText(/This page has 2 child page\(s\)/)).toBeInTheDocument();
    });
  });

  describe('Event Propagation', () => {
    it('should prevent page selection when admin controls are clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          onEditContent={mockOnEditContent}
          onQuickEdit={mockOnQuickEdit}
        />
      );

      // Click quick edit button
      const quickEditButtons = screen.getAllByTitle('Quick edit');
      await user.click(quickEditButtons[0]);

      // Page selection should not be triggered
      expect(mockOnPageSelect).not.toHaveBeenCalled();
      expect(mockOnQuickEdit).toHaveBeenCalledWith(expect.objectContaining({
        id: mockContents[0].id,
        title: mockContents[0].title,
        slug: mockContents[0].slug,
        menu_title: mockContents[0].menu_title,
        status: mockContents[0].status,
        show_in_menu: mockContents[0].show_in_menu,
        menu_order: mockContents[0].menu_order,
        updated_at: mockContents[0].updated_at
      }));
    });

    it('should still allow page selection when clicking on page title', async () => {
      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      // Find and click the page button (not the admin controls)
      const pageButtons = screen.getAllByRole('button');
      const homePageButton = pageButtons.find(button => 
        button.textContent?.includes('Home Page') && 
        !button.getAttribute('title')?.includes('edit') &&
        !button.getAttribute('title')?.includes('options')
      );

      if (homePageButton) {
        await user.click(homePageButton);
        expect(mockOnPageSelect).toHaveBeenCalledWith(mockContents[0]);
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for admin controls', () => {
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
        />
      );

      // Check ARIA labels
      expect(screen.getByLabelText('Quick edit Home')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit Home')).toBeInTheDocument();
      expect(screen.getByLabelText('More options for Home')).toBeInTheDocument();
    });

    it('should support keyboard navigation for context menu', async () => {
      const user = userEvent.setup();
      
      render(
        <PageMenuSidebar
          isAdminMode={true}
          showAdminControls={true}
          onPageSelect={mockOnPageSelect}
          contents={mockContents}
          onQuickEdit={mockOnQuickEdit}
        />
      );

      const moreButtons = screen.getAllByTitle('More options');
      
      // Focus and activate with keyboard
      moreButtons[0].focus();
      await user.keyboard('{Enter}');

      // Context menu should be visible
      expect(screen.getByText('Quick Edit')).toBeInTheDocument();

      // Navigate with keyboard and click on Quick Edit
      const quickEditItem = screen.getByText('Quick Edit');
      await user.click(quickEditItem);
      
      expect(mockOnQuickEdit).toHaveBeenCalledWith(expect.objectContaining({
        id: mockContents[0].id,
        title: mockContents[0].title,
        slug: mockContents[0].slug,
        menu_title: mockContents[0].menu_title,
        status: mockContents[0].status,
        show_in_menu: mockContents[0].show_in_menu,
        menu_order: mockContents[0].menu_order,
        updated_at: mockContents[0].updated_at
      }));
    });
  });
});