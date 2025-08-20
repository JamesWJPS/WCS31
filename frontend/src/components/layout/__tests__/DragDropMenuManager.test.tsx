import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DragDropMenuManager from '../DragDropMenuManager';
import { ContentItem } from '../../../types';

// Mock data for testing
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

const mockProps = {
  contents: mockContents,
  onMenuUpdate: jest.fn(),
  onClose: jest.fn(),
  loading: false
};

describe('DragDropMenuManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the menu manager modal with correct title', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      expect(screen.getByText('Manage Menu Order')).toBeInTheDocument();
      expect(screen.getByText(/Drag and drop pages to reorder them/)).toBeInTheDocument();
    });

    it('renders all menu items in hierarchical structure', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.getByText('Web Development')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    it('shows draft badge for draft content', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const contactItem = screen.getByText('Contact').closest('.menu-manager-item');
      expect(contactItem).toHaveClass('draft');
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('shows hidden items with appropriate styling', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const contactItem = screen.getByText('Contact').closest('.menu-manager-item');
      expect(contactItem).toHaveClass('hidden');
    });

    it('displays loading state when loading prop is true', () => {
      render(<DragDropMenuManager {...mockProps} loading={true} />);
      
      expect(screen.getByText('Loading menu items...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Menu Item Controls', () => {
    it('toggles visibility when eye button is clicked', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const eyeButtons = screen.getAllByTitle(/Show in menu|Hide from menu/);
      const contactEyeButton = eyeButtons.find(button => 
        button.closest('.menu-manager-item')?.textContent?.includes('Contact')
      );
      
      expect(contactEyeButton).toHaveTitle('Show in menu');
      
      fireEvent.click(contactEyeButton!);
      
      expect(contactEyeButton).toHaveTitle('Hide from menu');
    });

    it('shows unsaved changes indicator when changes are made', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const eyeButton = screen.getAllByTitle(/Show in menu|Hide from menu/)[0];
      fireEvent.click(eyeButton);
      
      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('enables save button when there are changes', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).toBeDisabled();
      
      const eyeButton = screen.getAllByTitle(/Show in menu|Hide from menu/)[0];
      fireEvent.click(eyeButton);
      
      expect(saveButton).not.toBeDisabled();
    });

    it('calls onMenuUpdate when save button is clicked', async () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      // Make a change
      const eyeButton = screen.getAllByTitle(/Show in menu|Hide from menu/)[0];
      fireEvent.click(eyeButton);
      
      // Click save
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockProps.onMenuUpdate).toHaveBeenCalled();
      });
    });

    it('shows saving state during save operation', async () => {
      const slowOnMenuUpdate = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<DragDropMenuManager {...mockProps} onMenuUpdate={slowOnMenuUpdate} />);
      
      // Make a change
      const eyeButton = screen.getAllByTitle(/Show in menu|Hide from menu/)[0];
      fireEvent.click(eyeButton);
      
      // Click save
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Modal Controls', () => {
    it('calls onClose when close button is clicked', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);
      
      expect(mockProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when cancel button is clicked', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });
});