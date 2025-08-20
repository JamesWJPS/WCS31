import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DragDropMenuManager from '../DragDropMenuManager';
import { ContentItem } from '../../../types';

// Mock data for integration testing
const mockContents: ContentItem[] = [
  {
    id: '1',
    title: 'Home',
    slug: 'home',
    content: 'Home content',
    status: 'published',
    show_in_menu: 1,
    menu_order: 0,
    parent_id: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '2',
    title: 'About',
    slug: 'about',
    content: 'About content',
    status: 'published',
    show_in_menu: 1,
    menu_order: 1,
    parent_id: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '3',
    title: 'Services',
    slug: 'services',
    content: 'Services content',
    status: 'published',
    show_in_menu: 1,
    menu_order: 2,
    parent_id: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '4',
    title: 'Web Development',
    slug: 'web-development',
    content: 'Web dev content',
    status: 'published',
    show_in_menu: 1,
    menu_order: 0,
    parent_id: '3',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '5',
    title: 'Contact',
    slug: 'contact',
    content: 'Contact content',
    status: 'draft',
    show_in_menu: 0,
    menu_order: 3,
    parent_id: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
];

describe('DragDropMenuManager - Integration Tests', () => {
  let mockOnMenuUpdate: jest.Mock;
  let mockOnClose: jest.Mock;

  beforeEach(() => {
    mockOnMenuUpdate = jest.fn().mockResolvedValue(undefined);
    mockOnClose = jest.fn();
  });

  describe('Complete Menu Management Workflow', () => {
    it('allows user to reorder items and save changes', async () => {
      render(
        <DragDropMenuManager
          contents={mockContents}
          onMenuUpdate={mockOnMenuUpdate}
          onClose={mockOnClose}
          loading={false}
        />
      );

      // Verify initial state
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();

      // Make a visibility change to trigger hasChanges
      const eyeButtons = screen.getAllByTitle(/Show in menu|Hide from menu/);
      const contactEyeButton = eyeButtons.find(button => 
        button.closest('.menu-manager-item')?.textContent?.includes('Contact')
      );
      
      fireEvent.click(contactEyeButton!);

      // Verify changes are detected
      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
      
      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).not.toBeDisabled();

      // Save changes
      fireEvent.click(saveButton);

      // Verify save was called
      await waitFor(() => {
        expect(mockOnMenuUpdate).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: '5',
              show_in_menu: 1 // Should be toggled from 0 to 1
            })
          ])
        );
      });

      // Verify UI updates after save
      await waitFor(() => {
        expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
      });
    });

    it('handles multiple visibility toggles correctly', () => {
      render(
        <DragDropMenuManager
          contents={mockContents}
          onMenuUpdate={mockOnMenuUpdate}
          onClose={mockOnClose}
          loading={false}
        />
      );

      // Toggle multiple items
      const eyeButtons = screen.getAllByTitle(/Show in menu|Hide from menu/);
      
      // Toggle first visible item (should hide it)
      const homeEyeButton = eyeButtons.find(button => 
        button.closest('.menu-manager-item')?.textContent?.includes('Home')
      );
      fireEvent.click(homeEyeButton!);

      // Toggle hidden item (should show it)
      const contactEyeButton = eyeButtons.find(button => 
        button.closest('.menu-manager-item')?.textContent?.includes('Contact')
      );
      fireEvent.click(contactEyeButton!);

      // Verify changes indicator
      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();

      // Verify button states changed
      expect(homeEyeButton).toHaveTitle('Show in menu');
      expect(contactEyeButton).toHaveTitle('Hide from menu');
    });

    it('handles save errors gracefully', async () => {
      const mockOnMenuUpdateError = jest.fn().mockRejectedValue(new Error('Save failed'));
      
      // Mock console.error to avoid error output in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <DragDropMenuManager
          contents={mockContents}
          onMenuUpdate={mockOnMenuUpdateError}
          onClose={mockOnClose}
          loading={false}
        />
      );

      // Make a change
      const eyeButton = screen.getAllByTitle(/Show in menu|Hide from menu/)[0];
      fireEvent.click(eyeButton);

      // Try to save
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      // Wait for error handling
      await waitFor(() => {
        expect(mockOnMenuUpdateError).toHaveBeenCalled();
      });

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save menu changes:', expect.any(Error));

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('Menu Structure Validation', () => {
    it('correctly handles nested menu structures', () => {
      render(
        <DragDropMenuManager
          contents={mockContents}
          onMenuUpdate={mockOnMenuUpdate}
          onClose={mockOnClose}
          loading={false}
        />
      );

      // Verify parent item is rendered
      expect(screen.getByText('Services')).toBeInTheDocument();
      
      // Verify child item is rendered with proper nesting
      expect(screen.getByText('Web Development')).toBeInTheDocument();
      
      // Check that child has proper indentation
      const webDevItem = screen.getByText('Web Development').closest('.menu-manager-item');
      expect(webDevItem).toHaveStyle({ paddingLeft: '30px' });
    });

    it('displays correct order information for nested items', () => {
      render(
        <DragDropMenuManager
          contents={mockContents}
          onMenuUpdate={mockOnMenuUpdate}
          onClose={mockOnClose}
          loading={false}
        />
      );

      // Check parent item order
      const servicesItem = screen.getByText('Services').closest('.menu-manager-item');
      expect(servicesItem?.textContent).toContain('Order: 2');

      // Check child item order and parent indicator
      const webDevItem = screen.getByText('Web Development').closest('.menu-manager-item');
      expect(webDevItem?.textContent).toContain('Order: 0');
      expect(webDevItem?.textContent).toContain('Child');
    });
  });

  describe('Status and Visibility Indicators', () => {
    it('correctly displays all status indicators', () => {
      render(
        <DragDropMenuManager
          contents={mockContents}
          onMenuUpdate={mockOnMenuUpdate}
          onClose={mockOnClose}
          loading={false}
        />
      );

      // Check draft status
      const contactItem = screen.getByText('Contact').closest('.menu-manager-item');
      expect(contactItem).toHaveClass('draft');
      expect(screen.getByText('Draft')).toBeInTheDocument();

      // Check hidden status
      expect(contactItem).toHaveClass('hidden');

      // Check published items don't have draft class
      const homeItem = screen.getByText('Home').closest('.menu-manager-item');
      expect(homeItem).not.toHaveClass('draft');
      expect(homeItem).not.toHaveClass('hidden');
    });

    it('shows correct eye icon states for visibility', () => {
      render(
        <DragDropMenuManager
          contents={mockContents}
          onMenuUpdate={mockOnMenuUpdate}
          onClose={mockOnClose}
          loading={false}
        />
      );

      const eyeButtons = screen.getAllByTitle(/Show in menu|Hide from menu/);
      
      // Find buttons for visible and hidden items
      const visibleItemButton = eyeButtons.find(button => 
        button.closest('.menu-manager-item')?.textContent?.includes('Home')
      );
      const hiddenItemButton = eyeButtons.find(button => 
        button.closest('.menu-manager-item')?.textContent?.includes('Contact')
      );

      expect(visibleItemButton).toHaveTitle('Hide from menu');
      expect(hiddenItemButton).toHaveTitle('Show in menu');
    });
  });

  describe('Loading and Error States', () => {
    it('displays loading state correctly', () => {
      render(
        <DragDropMenuManager
          contents={[]}
          onMenuUpdate={mockOnMenuUpdate}
          onClose={mockOnClose}
          loading={true}
        />
      );

      expect(screen.getByText('Loading menu items...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
      
      // Menu items should not be visible during loading
      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });

    it('handles empty content array gracefully', () => {
      render(
        <DragDropMenuManager
          contents={[]}
          onMenuUpdate={mockOnMenuUpdate}
          onClose={mockOnClose}
          loading={false}
        />
      );

      // Should render without errors
      expect(screen.getByText('Manage Menu Order')).toBeInTheDocument();
      expect(screen.getByText(/Drag and drop pages to reorder them/)).toBeInTheDocument();
      
      // Save button should be disabled with no content
      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('provides proper ARIA labels and roles', () => {
      render(
        <DragDropMenuManager
          contents={mockContents}
          onMenuUpdate={mockOnMenuUpdate}
          onClose={mockOnClose}
          loading={false}
        />
      );

      // Check close button has proper aria-label
      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();

      // Check loading spinner has proper role when loading
      render(
        <DragDropMenuManager
          contents={mockContents}
          onMenuUpdate={mockOnMenuUpdate}
          onClose={mockOnClose}
          loading={true}
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('maintains focus management during interactions', () => {
      render(
        <DragDropMenuManager
          contents={mockContents}
          onMenuUpdate={mockOnMenuUpdate}
          onClose={mockOnClose}
          loading={false}
        />
      );

      // Test that buttons are focusable
      const eyeButton = screen.getAllByTitle(/Show in menu|Hide from menu/)[0];
      eyeButton.focus();
      expect(document.activeElement).toBe(eyeButton);

      const saveButton = screen.getByText('Save Changes');
      saveButton.focus();
      expect(document.activeElement).toBe(saveButton);
    });
  });
});