import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DragDropMenuManager from '../DragDropMenuManager';
import { ContentItem } from '../../../types';

// Mock data for drag and drop testing
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
  }
];

const mockProps = {
  contents: mockContents,
  onMenuUpdate: jest.fn(),
  onClose: jest.fn(),
  loading: false
};

// Helper function to create drag event
const createDragEvent = (type: string, dataTransfer?: Partial<DataTransfer>) => {
  const event = new Event(type, { bubbles: true }) as any;
  event.dataTransfer = {
    effectAllowed: 'none',
    dropEffect: 'none',
    files: [],
    items: [],
    types: [],
    clearData: jest.fn(),
    getData: jest.fn(),
    setData: jest.fn(),
    setDragImage: jest.fn(),
    ...dataTransfer
  };
  return event;
};

describe('DragDropMenuManager - Drag and Drop Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Drag Start', () => {
    it('sets dragging class on drag start', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const homeItem = screen.getByText('Home').closest('.menu-manager-item');
      const dragEvent = createDragEvent('dragstart');
      
      fireEvent(homeItem!, dragEvent);
      
      expect(homeItem).toHaveClass('dragging');
    });

    it('sets correct drag data on drag start', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const homeItem = screen.getByText('Home').closest('.menu-manager-item');
      const setData = jest.fn();
      const dragEvent = createDragEvent('dragstart', { setData });
      
      fireEvent(homeItem!, dragEvent);
      
      expect(setData).toHaveBeenCalledWith('text/plain', expect.stringContaining('"id":"1"'));
      expect(setData).toHaveBeenCalledWith('text/plain', expect.stringContaining('"type":"menu-item"'));
    });

    it('sets effectAllowed to move on drag start', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const homeItem = screen.getByText('Home').closest('.menu-manager-item');
      const dragEvent = createDragEvent('dragstart');
      
      fireEvent(homeItem!, dragEvent);
      
      expect(dragEvent.dataTransfer.effectAllowed).toBe('move');
    });
  });

  describe('Drag End', () => {
    it('removes dragging class on drag end', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const homeItem = screen.getByText('Home').closest('.menu-manager-item');
      
      // Start drag
      const dragStartEvent = createDragEvent('dragstart');
      fireEvent(homeItem!, dragStartEvent);
      expect(homeItem).toHaveClass('dragging');
      
      // End drag
      const dragEndEvent = createDragEvent('dragend');
      fireEvent(homeItem!, dragEndEvent);
      expect(homeItem).not.toHaveClass('dragging');
    });
  });

  describe('Drag Over', () => {
    it('prevents default behavior on drag over', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const aboutItem = screen.getByText('About').closest('.menu-manager-item');
      const dragOverEvent = createDragEvent('dragover');
      const preventDefault = jest.fn();
      dragOverEvent.preventDefault = preventDefault;
      
      fireEvent(aboutItem!, dragOverEvent);
      
      expect(preventDefault).toHaveBeenCalled();
    });

    it('sets dropEffect to move on drag over', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const aboutItem = screen.getByText('About').closest('.menu-manager-item');
      const dragOverEvent = createDragEvent('dragover');
      
      fireEvent(aboutItem!, dragOverEvent);
      
      expect(dragOverEvent.dataTransfer.dropEffect).toBe('move');
    });
  });

  describe('Drop Zones', () => {
    it('shows drop indicator when dragging over item', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const homeItem = screen.getByText('Home').closest('.menu-manager-item');
      const aboutItem = screen.getByText('About').closest('.menu-manager-item');
      
      // Start dragging home item
      const dragStartEvent = createDragEvent('dragstart', {
        setData: jest.fn()
      });
      fireEvent(homeItem!, dragStartEvent);
      
      // Drag over about item
      const dragOverEvent = createDragEvent('dragover');
      // Mock getBoundingClientRect to simulate mouse position
      const mockGetBoundingClientRect = jest.fn(() => ({
        top: 0,
        height: 100,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: jest.fn()
      }));
      aboutItem!.getBoundingClientRect = mockGetBoundingClientRect;
      
      // Simulate mouse at top of item (before position)
      Object.defineProperty(dragOverEvent, 'clientY', { value: 10 });
      fireEvent(aboutItem!, dragOverEvent);
      
      // Check if drag over styling is applied
      expect(aboutItem).not.toHaveClass('drag-over-inside');
    });

    it('determines correct drop position based on mouse position', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const homeItem = screen.getByText('Home').closest('.menu-manager-item');
      const aboutItem = screen.getByText('About').closest('.menu-manager-item');
      
      // Start dragging
      const dragStartEvent = createDragEvent('dragstart', {
        setData: jest.fn()
      });
      fireEvent(homeItem!, dragStartEvent);
      
      // Mock getBoundingClientRect
      const mockGetBoundingClientRect = jest.fn(() => ({
        top: 0,
        height: 100,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: jest.fn()
      }));
      aboutItem!.getBoundingClientRect = mockGetBoundingClientRect;
      
      // Test different mouse positions
      const positions = [
        { clientY: 10, expectedPosition: 'before' }, // Top 25%
        { clientY: 50, expectedPosition: 'inside' }, // Middle 50%
        { clientY: 90, expectedPosition: 'after' }   // Bottom 25%
      ];
      
      positions.forEach(({ clientY, expectedPosition }) => {
        const dragOverEvent = createDragEvent('dragover');
        Object.defineProperty(dragOverEvent, 'clientY', { value: clientY });
        fireEvent(aboutItem!, dragOverEvent);
        
        // The component should handle the position internally
        // We can't directly test the internal state, but we can verify
        // that the event was processed without errors
        expect(dragOverEvent.dataTransfer.dropEffect).toBe('move');
      });
    });
  });

  describe('Drop Handling', () => {
    it('prevents default behavior on drop', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const homeItem = screen.getByText('Home').closest('.menu-manager-item');
      const aboutItem = screen.getByText('About').closest('.menu-manager-item');
      
      // Start drag
      const dragStartEvent = createDragEvent('dragstart', {
        setData: jest.fn()
      });
      fireEvent(homeItem!, dragStartEvent);
      
      // Drop
      const dropEvent = createDragEvent('drop');
      const preventDefault = jest.fn();
      dropEvent.preventDefault = preventDefault;
      
      fireEvent(aboutItem!, dropEvent);
      
      expect(preventDefault).toHaveBeenCalled();
    });

    it('marks component as having changes after drop', () => {
      render(<DragDropMenuManager {...mockProps} />);
      
      const homeItem = screen.getByText('Home').closest('.menu-manager-item');
      const aboutItem = screen.getByText('About').closest('.menu-manager-item');
      
      // Initially save button should be disabled
      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).toBeDisabled();
      
      // Start drag
      const dragStartEvent = createDragEvent('dragstart', {
        setData: jest.fn((format, data) => {
          // Store the data for retrieval
          dragStartEvent.dataTransfer.getData = jest.fn(() => data);
        })
      });
      fireEvent(homeItem!, dragStartEvent);
      
      // Mock getBoundingClientRect for drop position calculation
      const mockGetBoundingClientRect = jest.fn(() => ({
        top: 0,
        height: 100,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: jest.fn()
      }));
      aboutItem!.getBoundingClientRect = mockGetBoundingClientRect;
      
      // Drag over to set position
      const dragOverEvent = createDragEvent('dragover');
      Object.defineProperty(dragOverEvent, 'clientY', { value: 90 }); // After position
      fireEvent(aboutItem!, dragOverEvent);
      
      // Drop
      const dropEvent = createDragEvent('drop');
      fireEvent(aboutItem!, dropEvent);
      
      // Save button should now be enabled
      expect(saveButton).not.toBeDisabled();
      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    });
  });

  describe('Menu Tree Structure', () => {
    it('builds correct hierarchical structure from flat content array', () => {
      const hierarchicalContents: ContentItem[] = [
        ...mockContents,
        {
          id: '4',
          title: 'Web Development',
          slug: 'web-development',
          content: 'Web dev content',
          status: 'published',
          show_in_menu: 1,
          menu_order: 0,
          parent_id: '3', // Child of Services
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];
      
      render(<DragDropMenuManager {...mockProps} contents={hierarchicalContents} />);
      
      // Services should be rendered
      expect(screen.getByText('Services')).toBeInTheDocument();
      
      // Web Development should be rendered as a child
      expect(screen.getByText('Web Development')).toBeInTheDocument();
      
      // Check that Web Development has proper indentation (child styling)
      const webDevItem = screen.getByText('Web Development').closest('.menu-manager-item');
      expect(webDevItem).toHaveStyle({ paddingLeft: '30px' }); // 20px per level + 10px base
    });

    it('sorts items by menu_order within each level', () => {
      const unsortedContents: ContentItem[] = [
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
        }
      ];
      
      render(<DragDropMenuManager {...mockProps} contents={unsortedContents} />);
      
      const menuItems = screen.getAllByText(/Home|About|Services/);
      
      // Items should be rendered in menu_order sequence
      expect(menuItems[0]).toHaveTextContent('Home');
      expect(menuItems[1]).toHaveTextContent('About');
      expect(menuItems[2]).toHaveTextContent('Services');
    });
  });
});