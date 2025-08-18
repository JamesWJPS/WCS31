import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PageMenuSidebar from '../PageMenuSidebar';
import { ContentItem } from '../../../types';

describe('PageMenuSidebar Real-time Features', () => {
  const mockContents: ContentItem[] = [
    {
      id: '1',
      title: 'Test Content 1',
      status: 'published',
      show_in_menu: 1,
      updated_at: '2024-01-01'
    },
    {
      id: '2',
      title: 'Test Content 2',
      status: 'draft',
      show_in_menu: 1,
      updated_at: '2024-01-02'
    }
  ];

  const defaultProps = {
    isAdminMode: true,
    onPageSelect: vi.fn(),
    selectedContentId: '1',
    showAdminControls: true,
    contents: mockContents,
    loading: false,
    onEditContent: vi.fn(),
    onDeleteContent: vi.fn(),
    isRealTimeEnabled: true,
    lastUpdate: new Date('2024-01-03T10:00:00Z')
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display real-time indicator when enabled', () => {
    render(<PageMenuSidebar {...defaultProps} />);
    
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByTitle(/Last updated:/)).toBeInTheDocument();
  });

  it('should not display real-time indicator when disabled', () => {
    render(<PageMenuSidebar {...defaultProps} isRealTimeEnabled={false} />);
    
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('should show update indicator when content is updated', () => {
    const initialDate = new Date('2024-01-03T10:00:00Z');
    const { rerender } = render(<PageMenuSidebar {...defaultProps} lastUpdate={initialDate} />);
    
    // Initially should show update indicator since lastUpdate is provided
    expect(screen.getByTitle('Content updated')).toBeInTheDocument();
    
    // Wait for indicator to disappear (it shows for 2 seconds)
    setTimeout(() => {
      expect(screen.queryByTitle('Content updated')).not.toBeInTheDocument();
    }, 2100);
    
    // Simulate new content update
    const newDate = new Date('2024-01-03T10:01:00Z');
    rerender(<PageMenuSidebar {...defaultProps} lastUpdate={newDate} />);
    
    // Should show update indicator again
    expect(screen.getByTitle('Content updated')).toBeInTheDocument();
  });

  it('should display admin mode indicators', () => {
    render(<PageMenuSidebar {...defaultProps} />);
    
    expect(screen.getByText('Admin View')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('should show draft and published status correctly', () => {
    render(<PageMenuSidebar {...defaultProps} />);
    
    // Should show draft badge for draft content
    expect(screen.getByText('Draft')).toBeInTheDocument();
    
    // Published content should not have a draft badge
    const publishedItem = screen.getByText('Test Content 1');
    expect(publishedItem.closest('.page-menu-button')).not.toHaveClass('draft');
  });

  it('should handle content selection', () => {
    const mockOnPageSelect = vi.fn();
    render(<PageMenuSidebar {...defaultProps} onPageSelect={mockOnPageSelect} />);
    
    const contentButton = screen.getByText('Test Content 2');
    fireEvent.click(contentButton);
    
    expect(mockOnPageSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '2',
        title: 'Test Content 2'
      })
    );
  });

  it('should show admin controls when enabled', () => {
    render(<PageMenuSidebar {...defaultProps} />);
    
    // Admin controls should be present (though may be hidden by CSS)
    const editButtons = screen.getAllByTitle(/Edit/);
    const deleteButtons = screen.getAllByTitle(/Delete/);
    
    expect(editButtons.length).toBeGreaterThan(0);
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('should handle edit and delete actions', () => {
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();
    
    render(
      <PageMenuSidebar 
        {...defaultProps} 
        onEditContent={mockOnEdit}
        onDeleteContent={mockOnDelete}
      />
    );
    
    const editButtons = screen.getAllByTitle(/Edit/);
    const deleteButtons = screen.getAllByTitle(/Delete/);
    
    // Test edit action
    fireEvent.click(editButtons[0]);
    expect(mockOnEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        title: 'Test Content 1'
      })
    );
    
    // Mock window.confirm for delete action
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    
    fireEvent.click(deleteButtons[0]);
    expect(mockOnDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        title: 'Test Content 1'
      })
    );
    
    window.confirm = originalConfirm;
  });

  it('should display loading state', () => {
    render(<PageMenuSidebar {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Loading pages...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display empty state', () => {
    render(<PageMenuSidebar {...defaultProps} contents={[]} loading={false} />);
    
    expect(screen.getByText('No pages available')).toBeInTheDocument();
    expect(screen.getByText('Create your first page to get started')).toBeInTheDocument();
  });

  it('should handle hierarchical content structure', () => {
    const hierarchicalContents: ContentItem[] = [
      {
        id: '1',
        title: 'Parent Page',
        status: 'published',
        show_in_menu: 1,
        updated_at: '2024-01-01'
      },
      {
        id: '2',
        title: 'Child Page',
        status: 'published',
        show_in_menu: 1,
        parent_id: '1',
        updated_at: '2024-01-02'
      }
    ];

    render(<PageMenuSidebar {...defaultProps} contents={hierarchicalContents} />);
    
    expect(screen.getByText('Parent Page')).toBeInTheDocument();
    
    // Child should be initially hidden (collapsed)
    expect(screen.queryByText('Child Page')).not.toBeInTheDocument();
    
    // Click expand button
    const expandButton = screen.getByLabelText('Expand');
    fireEvent.click(expandButton);
    
    // Child should now be visible
    expect(screen.getByText('Child Page')).toBeInTheDocument();
  });
});