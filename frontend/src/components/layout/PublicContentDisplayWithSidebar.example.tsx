import React, { useState, useEffect } from 'react';
import PageMenuSidebar from './PageMenuSidebar';
import { ContentItem } from '../../types';

/**
 * Example showing how to integrate PageMenuSidebar into the existing PublicContentDisplay component
 * This demonstrates the extraction and replacement of the existing menu logic
 */
const PublicContentDisplayWithSidebar: React.FC = () => {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicContent();
    // Check for URL hash to load specific content
    const hash = window.location.hash.substring(1);
    if (hash) {
      loadContentByIdentifier(hash);
    }
  }, []);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        loadContentByIdentifier(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const loadPublicContent = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/content?public_only=true');
      const result = await response.json();
      if (result.success) {
        setContents(result.data);
        // Auto-select the first content if available and no hash
        if (result.data.length > 0 && !selectedContent && !window.location.hash) {
          setSelectedContent(result.data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading public content:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContentByIdentifier = async (identifier: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/content/${identifier}`);
      const result = await response.json();
      if (result.success) {
        setSelectedContent(result.data);
      } else {
        console.error('Content not found:', identifier);
        // Fallback to first available content
        if (contents.length > 0) {
          setSelectedContent(contents[0]);
          window.location.hash = '';
        }
      }
    } catch (error) {
      console.error('Error loading content by identifier:', error);
    }
  };

  const handlePageSelect = (content: ContentItem) => {
    setSelectedContent(content);
    // Update URL hash for navigation
    if (content.slug) {
      window.location.hash = content.slug;
    } else {
      window.location.hash = content.id;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="mt-3">Loading content...</div>
        </div>
      </div>
    );
  }

  if (contents.length === 0) {
    return (
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
    );
  }

  return (
    <div className="row">
      {/* BEFORE: Old inline menu sidebar */}
      {/* 
      <div className="col-md-3">
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="bi bi-list me-2"></i>
              Pages
            </h6>
          </div>
          <div className="list-group list-group-flush">
            {buildMenuTree(contents).map((item) => renderMenuItem(item))}
          </div>
        </div>
        
        <div className="card mt-3">
          <div className="card-body text-center">
            <small className="text-muted">
              <i className="bi bi-shield-lock me-1"></i>
              <a href="#" onClick={(e) => { e.preventDefault(); }} className="text-decoration-none">
                Admin Login
              </a>
            </small>
          </div>
        </div>
      </div>
      */}

      {/* AFTER: New PageMenuSidebar component */}
      <div className="col-md-3">
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={handlePageSelect}
          selectedContentId={selectedContent?.id}
          contents={contents}
          loading={loading}
        />
      </div>

      {/* Main Content Area - unchanged */}
      <div className="col-md-9">
        {selectedContent ? (
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h3 className="mb-0">{selectedContent.title}</h3>
                  <small className="text-muted">
                    Last updated: {selectedContent.updated_at ? new Date(selectedContent.updated_at).toLocaleDateString() : 'Unknown'}
                  </small>
                </div>
                <div className="text-end">
                  <small className="text-muted">
                    <i className="bi bi-link-45deg me-1"></i>
                    Direct link: #{selectedContent.slug || selectedContent.id}
                  </small>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div 
                className="content-display"
                dangerouslySetInnerHTML={{ __html: (selectedContent as any).body || '' }}
                style={{
                  lineHeight: '1.6',
                  fontSize: '16px'
                }}
              />
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body text-center py-5">
              <i className="bi bi-arrow-left fs-1 text-muted mb-3"></i>
              <h5>Select a page to view</h5>
              <p className="text-muted">Choose a page from the sidebar to display its content.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicContentDisplayWithSidebar;