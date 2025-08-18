import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PageMenuSidebar from '../../components/layout/PageMenuSidebar';
import NotificationSystem from '../../components/common/NotificationSystem';
import { ContentItem, Content } from '../../types';
import { contentService } from '../../services/contentService';
import { useRealTimeContent } from '../../hooks/useRealTimeContent';
import { useNotifications } from '../../hooks/useNotifications';
import { ContentUpdateEvent } from '../../services/realTimeContentService';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [selectedContentDetails, setSelectedContentDetails] = useState<Content | null>(null);
  const [loadingContentDetails, setLoadingContentDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'analytics'>('overview');

  // Notification system
  const {
    notifications,
    removeNotification,
    addSuccessNotification,
    addErrorNotification,
    addWarningNotification,
    addInfoNotification
  } = useNotifications();

  // Use real-time content hook
  const {
    contents,
    loading,
    loadingState,
    error: contentError,
    errorState,
    lastUpdate,
    isMonitoring,
    isHealthy,
    optimisticUpdate,
    refreshContents,
    retryLastOperation,
    clearError
  } = useRealTimeContent({
    autoStart: true,
    pollingInterval: 5000,
    onContentUpdate: handleContentUpdate
  });

  // Monitor real-time service health and show notifications
  useEffect(() => {
    if (contentError && errorState) {
      // Only show error notifications for retryable errors to avoid spam
      if (errorState.retryable && errorState.details?.retryCount === 1) {
        addWarningNotification(
          'Connection Issues',
          'Experiencing issues with live updates. Retrying automatically...',
          [
            {
              label: 'Retry Now',
              action: retryLastOperation,
              variant: 'primary'
            },
            {
              label: 'Refresh',
              action: refreshContents,
              variant: 'secondary'
            }
          ]
        );
      } else if (!errorState.retryable) {
        addErrorNotification(
          'Service Unavailable',
          'Unable to connect to the content service. Please refresh the page.',
          [
            {
              label: 'Refresh Page',
              action: () => window.location.reload(),
              variant: 'primary'
            }
          ]
        );
      }
    }
  }, [contentError, errorState, addWarningNotification, addErrorNotification, retryLastOperation, refreshContents]);

  // Show success notification when connection is restored
  useEffect(() => {
    if (isHealthy && !contentError && isMonitoring) {
      // Only show if we previously had an error
      const hadError = errorState !== null;
      if (hadError) {
        addSuccessNotification(
          'Connection Restored',
          'Live updates are working normally again.'
        );
      }
    }
  }, [isHealthy, contentError, isMonitoring, errorState, addSuccessNotification]);

  // Handle content updates from real-time service
  function handleContentUpdate(event: ContentUpdateEvent) {
    console.log('Content update received:', event);
    
    // If the currently selected content was updated, refresh its details
    if (selectedContent && event.contentId === selectedContent.id && event.type === 'updated') {
      loadContentDetails(selectedContent.id);
      
      // Show update notification
      addInfoNotification(
        'Content Updated',
        `"${selectedContent.title}" has been updated and refreshed.`,
        []
      );
    }
    
    // If the currently selected content was deleted, clear selection
    if (selectedContent && event.contentId === selectedContent.id && event.type === 'deleted') {
      setSelectedContent(null);
      setSelectedContentDetails(null);
      window.location.hash = '';
      
      // Show deletion notification
      addWarningNotification(
        'Content Deleted',
        `The selected page "${selectedContent.title}" has been deleted.`
      );
    }

    // Show general update notifications for other content changes
    if (!selectedContent || event.contentId !== selectedContent.id) {
      switch (event.type) {
        case 'created':
          if (event.content) {
            addSuccessNotification(
              'New Page Created',
              `"${event.content.title}" has been added to your site.`
            );
          }
          break;
        case 'updated':
          if (event.content) {
            addInfoNotification(
              'Page Updated',
              `"${event.content.title}" has been updated.`
            );
          }
          break;
        case 'reordered':
          addInfoNotification(
            'Menu Reordered',
            'The page menu order has been updated.'
          );
          break;
      }
    }
  }

  // Load content details for a specific content ID
  const loadContentDetails = async (contentId: string) => {
    try {
      setLoadingContentDetails(true);
      const fullContent = await contentService.getContent(contentId);
      setSelectedContentDetails(fullContent);
    } catch (error) {
      console.error('Failed to load content details:', error);
      setSelectedContentDetails(null);
      
      // Show error notification with retry option
      addErrorNotification(
        'Failed to Load Content',
        'Unable to load the selected page content. Please try again.',
        [
          {
            label: 'Retry',
            action: () => loadContentDetails(contentId),
            variant: 'primary'
          }
        ]
      );
    } finally {
      setLoadingContentDetails(false);
    }
  };

  // Convert ContentListItem[] to ContentItem[] for PageMenuSidebar
  const contentItems: ContentItem[] = contents.map(item => ({
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

  // Check for URL hash to load specific content after contents are loaded
  useEffect(() => {
    if (contents.length > 0) {
      const hash = window.location.hash.substring(1);
      if (hash) {
        loadContentByIdentifier(hash, contentItems);
      }
    }
  }, [contents]);

  // Listen for hash changes to support URL navigation in admin mode
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash && contentItems.length > 0) {
        loadContentByIdentifier(hash, contentItems);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [contentItems]);

  const loadContentByIdentifier = async (identifier: string, contentList: ContentItem[] = contentItems) => {
    try {
      // First try to find by slug, then by ID
      let targetContent = contentList.find(c => c.slug === identifier);
      if (!targetContent) {
        targetContent = contentList.find(c => c.id === identifier);
      }
      
      if (targetContent) {
        setSelectedContent(targetContent);
        setActiveTab('content');
        
        // Load full content details
        await loadContentDetails(targetContent.id);
      } else {
        console.error('Content not found:', identifier);
        // Clear hash if content not found
        window.location.hash = '';
      }
    } catch (error) {
      console.error('Error loading content by identifier:', error);
    }
  };

  const handlePageSelect = async (content: ContentItem) => {
    setSelectedContent(content);
    setActiveTab('content');
    
    // Update URL hash for navigation
    const identifier = content.slug || content.id;
    window.location.hash = identifier;
    
    // Load full content details
    await loadContentDetails(content.id);
  };

  const handleEditContent = (content: ContentItem) => {
    // Navigate to content editor - this will be implemented in future tasks
    console.log('Edit content:', content);
    // For now, we'll switch to content tab and select the item
    setSelectedContent(content);
    setActiveTab('content');
    loadContentDetails(content.id);
  };

  const handleQuickEdit = (content: ContentItem) => {
    // Quick edit functionality - opens inline editor or modal
    console.log('Quick edit content:', content);
    // For now, same as regular edit but could be enhanced with inline editing
    handleEditContent(content);
  };

  const handleDuplicateContent = async (content: ContentItem) => {
    try {
      console.log('Duplicate content:', content);
      // This would call the content service to duplicate the content
      // For now, just show a message
      addInfoNotification(
        'Feature Coming Soon',
        `Duplicate functionality for "${content.title}" will be implemented in future tasks.`
      );
    } catch (error) {
      console.error('Failed to duplicate content:', error);
      addErrorNotification(
        'Duplicate Failed',
        `Failed to duplicate "${content.title}". Please try again later.`
      );
    }
  };

  const handleDeleteContent = async (content: ContentItem) => {
    try {
      // Optimistic update - immediately remove from UI
      optimisticUpdate({
        type: 'deleted',
        contentId: content.id,
        timestamp: new Date()
      });

      // Perform actual deletion
      await contentService.deleteContent(content.id);
      
      // Clear selection if deleted content was selected
      if (selectedContent?.id === content.id) {
        setSelectedContent(null);
        setSelectedContentDetails(null);
        window.location.hash = '';
      }

      // Show success notification
      addSuccessNotification(
        'Page Deleted',
        `"${content.title}" has been successfully deleted.`
      );
    } catch (error) {
      console.error('Failed to delete content:', error);
      
      // Refresh contents to revert optimistic update on error
      refreshContents();
      
      // Show error notification with retry option
      addErrorNotification(
        'Delete Failed',
        `Failed to delete "${content.title}". Please try again.`,
        [
          {
            label: 'Retry',
            action: () => handleDeleteContent(content),
            variant: 'danger'
          }
        ]
      );
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="dashboard-overview">
            <h2>Dashboard Overview</h2>
            <div className="dashboard-stats">
              <div className="stat-card">
                <h3>Total Pages</h3>
                <p className="stat-number">{contentItems.length}</p>
              </div>
              <div className="stat-card">
                <h3>Published</h3>
                <p className="stat-number">
                  {contentItems.filter(c => c.status === 'published').length}
                </p>
              </div>
              <div className="stat-card">
                <h3>Drafts</h3>
                <p className="stat-number">
                  {contentItems.filter(c => c.status === 'draft').length}
                </p>
              </div>
            </div>
            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="real-time-status">
                <p>
                  <i className={`bi ${isMonitoring ? 'bi-broadcast text-success' : 'bi-broadcast-off text-muted'}`}></i>
                  Real-time updates: {isMonitoring ? 'Active' : 'Inactive'}
                </p>
                {lastUpdate && (
                  <p>
                    <i className="bi bi-clock text-muted"></i>
                    Last update: {lastUpdate.toLocaleString()}
                  </p>
                )}
                {contentError && (
                  <p className="text-danger">
                    <i className="bi bi-exclamation-triangle"></i>
                    Error loading content: {contentError}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      case 'content':
        return (
          <div className="dashboard-content">
            {selectedContent ? (
              <div className="selected-content">
                <div className="content-header">
                  <h2>{selectedContent.title}</h2>
                  <div className="content-meta">
                    <span className={`status-badge ${selectedContent.status}`}>
                      {selectedContent.status}
                    </span>
                    <span className="last-updated">
                      Last updated: {selectedContent.updated_at ? new Date(selectedContent.updated_at).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                </div>
                
                {loadingContentDetails ? (
                  <div className="content-loading">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading content...</span>
                    </div>
                    <p>Loading content details...</p>
                  </div>
                ) : selectedContentDetails ? (
                  <>
                    <div className="content-body">
                      <div dangerouslySetInnerHTML={{ __html: selectedContentDetails.body || '' }} />
                    </div>
                    <div className="content-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleEditContent(selectedContent)}
                      >
                        Edit Content
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="content-error">
                    <p>Failed to load content details. Please try again.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-content-selected">
                <h2>Select a Page</h2>
                <p>Choose a page from the menu to view and edit its content.</p>
              </div>
            )}
          </div>
        );
      case 'analytics':
        return (
          <div className="dashboard-analytics">
            <h2>Analytics</h2>
            <p>Analytics dashboard will be implemented in future tasks</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-page">
      {/* Notification System */}
      <NotificationSystem
        notifications={notifications}
        onDismiss={removeNotification}
        position="top-right"
        maxVisible={5}
      />
      
      <div className="dashboard-layout">
        {/* Left column: Page Menu Sidebar */}
        <div className="dashboard-menu-sidebar">
          <PageMenuSidebar
            isAdminMode={true}
            onPageSelect={handlePageSelect}
            selectedContentId={selectedContent?.id}
            showAdminControls={true}
            contents={contentItems}
            loading={loading}
            loadingState={loadingState}
            error={contentError}
            errorState={errorState}
            onEditContent={handleEditContent}
            onDeleteContent={handleDeleteContent}
            onQuickEdit={handleQuickEdit}
            onDuplicateContent={handleDuplicateContent}
            onContentUpdate={handleContentUpdate}
            lastUpdate={lastUpdate}
            isRealTimeEnabled={isMonitoring}
            isHealthy={isHealthy}
            onRetry={retryLastOperation}
            onRefresh={refreshContents}
            onClearError={clearError}
          />
        </div>

        {/* Right column: Admin Content Area */}
        <div className="dashboard-content-area">
          <div className="dashboard-header">
            <h1>Dashboard</h1>
            <p className="dashboard-subtitle">
              Welcome back, {user?.username}. Manage your content and view site analytics.
            </p>
          </div>

          {/* Admin Tabs */}
          <div className="dashboard-tabs">
            <nav className="tab-nav" role="tablist">
              <button
                className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
                role="tab"
                aria-selected={activeTab === 'overview'}
                aria-controls="overview-panel"
              >
                📊 Overview
              </button>
              <button
                className={`tab-button ${activeTab === 'content' ? 'active' : ''}`}
                onClick={() => setActiveTab('content')}
                role="tab"
                aria-selected={activeTab === 'content'}
                aria-controls="content-panel"
              >
                📝 Content
              </button>
              <button
                className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
                role="tab"
                aria-selected={activeTab === 'analytics'}
                aria-controls="analytics-panel"
              >
                📈 Analytics
              </button>
            </nav>

            {/* Tab Content */}
            <div className="tab-content">
              <div
                id="tab-panel"
                role="tabpanel"
                aria-labelledby={`${activeTab}-tab`}
              >
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;