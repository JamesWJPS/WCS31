import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import PageMenuSidebar from '../../components/layout/PageMenuSidebar';
import { ContentItem } from '../../types';
import { contentService } from '../../services/contentService';
import { useRealTimeContent } from '../../hooks/useRealTimeContent';
import './SitePreviewPage.css';

const SitePreviewPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Use real-time content hook for live updates
  const {
    contents,
    loading: contentLoading,
    error: contentError
  } = useRealTimeContent({
    autoStart: true,
    pollingInterval: 5000
  });

  // Filter to only show published content for the public preview
  const publishedContents = contents.filter(content => content.status === 'published');

  useEffect(() => {
    // Auto-select first published content if none selected
    if (publishedContents.length > 0 && !selectedContent) {
      setSelectedContent(publishedContents[0]);
    }
  }, [publishedContents, selectedContent]);

  const handlePageSelect = (content: ContentItem) => {
    setSelectedContent(content);
  };

  if (contentLoading) {
    return (
      <div className="site-preview-page">
        <div className="page-header">
          <h1>Site Preview</h1>
          <p className="page-description">
            Preview how your published content appears to visitors on the public site.
          </p>
        </div>
        <div className="loading-state">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span>Loading site content...</span>
        </div>
      </div>
    );
  }

  if (contentError) {
    return (
      <div className="site-preview-page">
        <div className="page-header">
          <h1>Site Preview</h1>
          <p className="page-description">
            Preview how your published content appears to visitors on the public site.
          </p>
        </div>
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Failed to load site content: {contentError}
        </div>
      </div>
    );
  }

  return (
    <div className="site-preview-page">
      <div className="page-header">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h1>Site Preview</h1>
            <p className="page-description">
              Preview how your published content appears to visitors on the public site.
              <span className="admin-badge ms-2">
                <i className="bi bi-shield-check me-1"></i>
                Admin View
              </span>
            </p>
          </div>
          <div>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/public')}
            >
              <i className="bi bi-box-arrow-up-right me-2"></i>
              View Live Site
            </button>
          </div>
        </div>
      </div>

      <div className="preview-container">
        <div className="preview-sidebar">
          <div className="preview-sidebar-header">
            <h5>Published Pages</h5>
            <small className="text-muted">
              {publishedContents.length} page{publishedContents.length !== 1 ? 's' : ''} published
            </small>
          </div>
          
          <PageMenuSidebar
            isAdminMode={false}
            onPageSelect={handlePageSelect}
            selectedContentId={selectedContent?.id}
            showAdminControls={false}
            contents={publishedContents}
            loading={contentLoading}
          />
        </div>

        <div className="preview-content">
          {selectedContent ? (
            <div className="public-content-display">
              <div className="content-header">
                <h1>{selectedContent.title}</h1>
                {selectedContent.meta_description && (
                  <p className="content-description">{selectedContent.meta_description}</p>
                )}
                <div className="content-meta">
                  <small className="text-muted">
                    <i className="bi bi-calendar me-1"></i>
                    Published: {new Date(selectedContent.created_at).toLocaleDateString()}
                    {selectedContent.updated_at !== selectedContent.created_at && (
                      <>
                        {' • '}
                        <i className="bi bi-pencil me-1"></i>
                        Updated: {new Date(selectedContent.updated_at).toLocaleDateString()}
                      </>
                    )}
                  </small>
                </div>
              </div>
              
              <div 
                className="content-body"
                dangerouslySetInnerHTML={{ __html: selectedContent.body }}
              />
            </div>
          ) : (
            <div className="no-content-selected">
              <div className="empty-state">
                <i className="bi bi-file-text"></i>
                <h3>No Content Selected</h3>
                <p>Select a page from the sidebar to preview how it appears to visitors.</p>
                {publishedContents.length === 0 && (
                  <div className="alert alert-info mt-3">
                    <i className="bi bi-info-circle me-2"></i>
                    No published content found. Publish some content to see it here.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SitePreviewPage;