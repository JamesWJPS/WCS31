import React from 'react';
import PageMenuSidebar from './PageMenuSidebar';
import { ContentItem } from '../../types';

// Example usage of PageMenuSidebar component
const PageMenuSidebarExample: React.FC = () => {
  // Mock content data for demonstration
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
      title: 'About Us',
      slug: 'about',
      menu_title: 'About', // Shorter menu title
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
      parent_id: '3', // Child of Services
      menu_order: 1,
      show_in_menu: true,
      status: 'published',
      updated_at: '2024-01-04T00:00:00Z'
    },
    {
      id: '5',
      title: 'Mobile Apps',
      slug: 'mobile-apps',
      parent_id: '3', // Child of Services
      menu_order: 2,
      show_in_menu: true,
      status: 'published',
      updated_at: '2024-01-05T00:00:00Z'
    },
    {
      id: '6',
      title: 'Draft Page',
      slug: 'draft-page',
      menu_order: 4,
      show_in_menu: true,
      status: 'draft', // Draft status
      updated_at: '2024-01-06T00:00:00Z'
    },
    {
      id: '7',
      title: 'Hidden Page',
      slug: 'hidden-page',
      menu_order: 5,
      show_in_menu: false, // Hidden from menu
      status: 'published',
      updated_at: '2024-01-07T00:00:00Z'
    }
  ];

  const [selectedContentId, setSelectedContentId] = React.useState<string>('1');
  const [isAdminMode, setIsAdminMode] = React.useState<boolean>(false);

  const handlePageSelect = (content: ContentItem) => {
    setSelectedContentId(content.id);
    console.log('Selected page:', content.title);
  };

  const handleEditContent = (content: ContentItem) => {
    console.log('Edit content:', content.title);
  };

  const handleDeleteContent = (content: ContentItem) => {
    console.log('Delete content:', content.title);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px' }}>
      <h2>PageMenuSidebar Examples</h2>
      
      {/* Toggle between admin and public mode */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setIsAdminMode(!isAdminMode)}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: isAdminMode ? '#dc3545' : '#0d6efd',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isAdminMode ? 'Switch to Public Mode' : 'Switch to Admin Mode'}
        </button>
      </div>

      {/* Public Mode Example */}
      {!isAdminMode && (
        <div>
          <h3>Public Mode</h3>
          <PageMenuSidebar
            isAdminMode={false}
            onPageSelect={handlePageSelect}
            selectedContentId={selectedContentId}
            contents={mockContents}
          />
        </div>
      )}

      {/* Admin Mode Example */}
      {isAdminMode && (
        <div>
          <h3>Admin Mode</h3>
          <PageMenuSidebar
            isAdminMode={true}
            onPageSelect={handlePageSelect}
            selectedContentId={selectedContentId}
            showAdminControls={true}
            contents={mockContents}
            onEditContent={handleEditContent}
            onDeleteContent={handleDeleteContent}
          />
        </div>
      )}

      {/* Loading State Example */}
      <div style={{ marginTop: '40px' }}>
        <h3>Loading State</h3>
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={handlePageSelect}
          loading={true}
        />
      </div>

      {/* Empty State Example */}
      <div style={{ marginTop: '40px' }}>
        <h3>Empty State</h3>
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={handlePageSelect}
          contents={[]}
        />
      </div>
    </div>
  );
};

export default PageMenuSidebarExample;