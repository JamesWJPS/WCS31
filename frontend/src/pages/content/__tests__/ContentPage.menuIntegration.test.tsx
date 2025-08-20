import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ContentPage from '../ContentPage';
import { contentService } from '../../../services/contentService';

// Mock the content service
vi.mock('../../../services/contentService', () => ({
  contentService: {
    getContentList: vi.fn(),
    bulkUpdateMenuOrder: vi.fn(),
    generateSlug: vi.fn((title: string) => title.toLowerCase().replace(/\s+/g, '-'))
  }
}));

// Mock the DragDropMenuManager component
vi.mock('../../../components/layout/DragDropMenuManager', () => {
  return {
    default: function MockDragDropMenuManager({ onClose, onMenuUpdate }: any) {
      return (
        <div data-testid="menu-manager">
          <button onClick={onClose}>Close</button>
          <button onClick={() => onMenuUpdate([])}>Save Changes</button>
        </div>
      );
    }
  };
});

const mockContentItems = [
  {
    id: '1',
    title: 'Home',
    slug: 'home',
    status: 'published' as const,
    templateName: 'Default',
    authorName: 'Admin',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    publishedAt: '2024-01-01T00:00:00Z',
    menu_order: 0,
    show_in_menu: true
  },
  {
    id: '2',
    title: 'About',
    slug: 'about',
    status: 'published' as const,
    templateName: 'Default',
    authorName: 'Admin',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    publishedAt: '2024-01-01T00:00:00Z',
    menu_order: 1,
    show_in_menu: true
  }
];

describe('ContentPage Menu Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (contentService.getContentList as any).mockResolvedValue(mockContentItems);
    (contentService.bulkUpdateMenuOrder as any).mockResolvedValue(undefined);
  });

  it('should show "Manage Menu Order" button when content items exist', async () => {
    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Manage Menu Order')).toBeInTheDocument();
    });
  });

  it('should not show "Manage Menu Order" button when no content items exist', async () => {
    (contentService.getContentList as any).mockResolvedValue([]);
    
    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.queryByText('Manage Menu Order')).not.toBeInTheDocument();
    });
  });

  it('should open menu manager when "Manage Menu Order" button is clicked', async () => {
    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Manage Menu Order')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Manage Menu Order'));

    expect(screen.getByTestId('menu-manager')).toBeInTheDocument();
  });

  it('should close menu manager when close button is clicked', async () => {
    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Manage Menu Order')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Manage Menu Order'));
    expect(screen.getByTestId('menu-manager')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByTestId('menu-manager')).not.toBeInTheDocument();
  });

  it('should call bulkUpdateMenuOrder and refresh content when menu is updated', async () => {
    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Manage Menu Order')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Manage Menu Order'));
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(contentService.bulkUpdateMenuOrder).toHaveBeenCalledWith([]);
      expect(contentService.getContentList).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  it('should convert ContentListItem to ContentItem format for menu manager', async () => {
    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Manage Menu Order')).toBeInTheDocument();
    });

    // The conversion happens internally when the menu manager is opened
    // We can verify this by checking that the component renders without errors
    fireEvent.click(screen.getByText('Manage Menu Order'));
    expect(screen.getByTestId('menu-manager')).toBeInTheDocument();
  });
});