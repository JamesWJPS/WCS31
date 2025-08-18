import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageMenuSidebar from '../../components/layout/PageMenuSidebar';
import { ContentItem } from '../../types';
import { contentService } from '../../services/contentService';
import { useRealTimeContent } from '../../hooks/useRealTimeContent';
import { ContentUpdateEvent } from '../../services/realTimeContentService';
import './PublicContentPage.css';

const PublicContentPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [selectedContentDetails, setSelectedContentDetails] = useState<any>(null);
  const [loadingContentDetails, setLoadingContentDetails] = useState(false);

  // Use real-time content hook for public content
  const {
    contents,
    loading,
    error: contentError,
    lastUpdate,
    isMonitoring
  } = useRealTimeContent({
    autoStart: true,
    pollingInterval: 10000, // Longer interval for public users
    onContentUpdate: handleContentUpdate
  });

  // Handle content updates from real-time service
  function handleContentUpdate(event: ContentUpdateEvent) {
    console.log('Public content update received:', event);
    
    // If the currently selected content was updated, refresh its details
    if (selectedContent && event.contentId === selectedContent.id && event.type === 'updated') {
      loadContentDetails(selectedContent.id);
    }
    
    // If the currently selected content was deleted, clear selection
    if (selectedContent && event.contentId === selectedContent.id && event.type === 'deleted') {
      setSelectedContent(null);
      setSelectedContentDetails(null);
      navigate('/');
    }
  }

  // Convert to ContentItem format for PageMenuSidebar
  const contentItems: ContentItem[] = contents
    .filter(item => item.status === 'published' && item.show_in_menu) // Only show published content in menu
    .map(item => ({
      id: item.id,
      title: item.title,
      ...(item.slug && { slug: item.slug }),
      ...(item.menu_title && { menu_title: item.menu_title }),
      ...(item.parent_id !== undefined && { parent_id: item.parent_id }),
      ...(item.menu_order !== undefined && { menu_order: item.menu_order }),
      ...(item.show_in_menu !== undefined && { show_in_menu: item.show_in_menu }),
      ...(item.status && { status: item.status }),
      ...(item.updatedAt && { updated_at: item.updatedAt })
    }));

  // Load content details for a specific content ID
  const loadContentDetails = async (contentId: string) => {
    try {
      setLoadingContentDetails(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/content/public/${contentId}`);
      const result = await response.json();
      if (result.success) {
        setSelectedContentDetails(result.data);
      } else {
        console.error('Content not found:', contentId);
        setSelectedContentDetails(null);
      }
    } catch (error) {
      console.error('Failed to load content details:', error);
      setSelectedContentDetails(null);
    } finally {
      setLoadingContentDetails(false);
    }
  };

  // Load content by slug
  const loadContentBySlug = async (targetSlug: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/content/public/${targetSlug}`);
      const result = await response.json();
      if (result.success) {
        // Find the content item in our list to get full details
        const contentItem = contentItems.find(c => c.slug === targetSlug || c.id === result.data.id);
        if (contentItem) {
          setSelectedContent(contentItem);
          setSelectedContentDetails(result.data);
        } else {
          // Content exists but might not be in menu, create a minimal content item
          setSelectedContent({
            id: result.data.id,
            title: result.data.title,
            slug: result.data.slug
          });
          setSelectedContentDetails(result.data);
        }
      } else {
        console.error('Content not found:', targetSlug);
        // Redirect to home if content not found
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to load content by slug:', error);
      navigate('/');
    }
  };

  // Handle URL slug changes
  useEffect(() => {
    if (slug && contentItems.length > 0) {
      loadContentBySlug(slug);
    } else if (!slug && contentItems.length > 0) {
      // Auto-select the first content if no slug provided
      const firstContent = contentItems[0];
      if (firstContent && firstContent.slug) {
        navigate(`/public/${firstContent.slug}`, { replace: true });
      } else if (firstContent) {
        setSelectedContent(firstContent);
        loadContentDetails(firstContent.id);
      }
    }
  }, [slug, contentItems, navigate]);

  const handlePageSelect = async (content: ContentItem) => {
    setSelectedContent(content);
    if (content.slug) {
      navigate(`/public/${content.slug}`);
    } else {
      await loadContentDetails(content.id);
    }
  };

  if (loading) {
    return (
      <div className="public-content-page">
        <div className="container-fluid">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <div className="mt-3">Loading content...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <div className="public-content-page">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-8">
              <div className="card">
                <div className="card-body text-center py-5">
                  <i className="bi bi-file-text fs-1 text-muted mb-3"></i>
                  <h4>Welcome to Our Website</h4>
                  <p className="text-muted">
                    No published content is currently available. Please check back later.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-content-page">
      <div className="container-fluid">
        {/* Admin access bar */}
        <div className="admin-access-bar">
          <div className="container-fluid">
            <div className="d-flex justify-content-end">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => navigate('/dashboard')}
              >
                <i className="bi bi-shield-lock me-1"></i>
                Admin Panel
              </button>
            </div>
          </div>
        </div>
        
        <div className="row">
          {/* Content Navigation Sidebar */}
          <div className="col-md-3">
            <PageMenuSidebar
              isAdminMode={false}
              onPageSelect={handlePageSelect}
              selectedContentId={selectedContent?.id}
              showAdminControls={false}
              contents={contentItems}
              loading={loading}
              lastUpdate={lastUpdate}
              isRealTimeEnabled={isMonitoring}
            />
          </div>

          {/* Main Content Area */}
          <div className="col-md-9">
            {selectedContent ? (
              <div className="card">
                <div className="card-header">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h1 className="mb-0">{selectedContent.title}</h1>
                      <small className="text-muted">
                        Last updated: {selectedContent.updated_at ? new Date(selectedContent.updated_at).toLocaleDateString() : 'Unknown'}
                      </small>
                    </div>
                    <div className="text-end">
                      <small className="text-muted">
                        <i className="bi bi-link-45deg me-1"></i>
                        Direct link: /public/{selectedContent.slug || selectedContent.id}
                      </small>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {loadingContentDetails ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading content...</span>
                      </div>
                      <p className="mt-2">Loading content details...</p>
                    </div>
                  ) : selectedContentDetails ? (
                    <div 
                      className="content-display"
                      dangerouslySetInnerHTML={{ __html: selectedContentDetails.body || '' }}
                      style={{
                        lineHeight: '1.6',
                        fontSize: '16px'
                      }}
                    />
                  ) : (
                    <div className="text-center py-4">
                      <i className="bi bi-exclamation-triangle fs-1 text-muted mb-3"></i>
                      <h5>Content not available</h5>
                      <p className="text-muted">Failed to load content details. Please try again.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-body text-center py-5">
                  <i className="bi bi-arrow-left fs-1 text-muted mb-3"></i>
                  <h5>Select a page to view</h5>
                  <p className="text-muted">Choose a page from the sidebar to display its content.</p>
                  {contentError && (
                    <div className="alert alert-warning mt-3">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Error loading content: {contentError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicContentPage;