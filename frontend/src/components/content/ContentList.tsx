import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ContentListItem, ContentFilter, Template } from '../../types';
import { contentService } from '../../services/contentService';
import { useAuth } from '../../hooks/useAuth';
import { 
  Button, 
  Input, 
  Select, 
  LoadingSpinner, 
  Card,
  Notification 
} from '../ui';
import './ContentList.css';

const ContentList: React.FC = () => {
  const { user } = useAuth();
  const [contentItems, setContentItems] = useState<ContentListItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ContentFilter>({});
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load content and templates
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [contentData, templatesData] = await Promise.all([
          contentService.getContentList(filter),
          contentService.getTemplates(),
        ]);
        
        setContentItems(contentData);
        setTemplates(templatesData);
      } catch (error) {
        console.error('Failed to load content:', error);
        setNotification({
          type: 'error',
          message: 'Failed to load content list',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [filter]);

  const handleFilterChange = (field: keyof ContentFilter, value: string) => {
    setFilter(prev => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      await contentService.deleteContent(id);
      setContentItems(prev => prev.filter(item => item.id !== id));
      setNotification({
        type: 'success',
        message: 'Content deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete content:', error);
      setNotification({
        type: 'error',
        message: 'Failed to delete content',
      });
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'published':
        return 'status-badge status-published';
      case 'draft':
        return 'status-badge status-draft';
      case 'archived':
        return 'status-badge status-archived';
      default:
        return 'status-badge';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ];

  const templateOptions = [
    { value: '', label: 'All Templates' },
    ...templates.map(template => ({
      value: template.id,
      label: template.name,
    })),
  ];

  const canEdit = user?.role === 'administrator' || user?.role === 'editor';
  const canDelete = user?.role === 'administrator';

  if (isLoading) {
    return (
      <div className="content-list-loading">
        <LoadingSpinner />
        <p>Loading content...</p>
      </div>
    );
  }

  return (
    <div className="content-list">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="content-list-header">
        <h1>Content Management</h1>
        {canEdit && (
          <Link to="/content/create">
            <Button variant="primary">
              Create New Content
            </Button>
          </Link>
        )}
      </div>

      <div className="content-filters">
        <div className="filter-group">
          <Input
            value={filter.search || ''}
            onChange={(value) => handleFilterChange('search', value)}
            placeholder="Search content..."
            aria-label="Search content"
          />
        </div>
        
        <div className="filter-group">
          <Select
            value={filter.status || ''}
            onChange={(value) => handleFilterChange('status', value)}
            options={statusOptions}
            aria-label="Filter by status"
          />
        </div>
        
        <div className="filter-group">
          <Select
            value={filter.templateId || ''}
            onChange={(value) => handleFilterChange('templateId', value)}
            options={templateOptions}
            aria-label="Filter by template"
          />
        </div>
      </div>

      {contentItems.length === 0 ? (
        <div className="content-list-empty">
          <p>No content found.</p>
          {canEdit && (
            <Link to="/content/create">
              <Button variant="primary">
                Create Your First Content
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="content-grid">
          {contentItems.map((item) => (
            <Card key={item.id} className="content-card">
              <div className="content-card-header">
                <h3 className="content-title">
                  <Link to={`/content/view/${item.id}`}>
                    {item.title}
                  </Link>
                </h3>
                <span className={getStatusBadgeClass(item.status)}>
                  {item.status}
                </span>
              </div>
              
              <div className="content-meta">
                <p className="content-template">
                  Template: {item.templateName}
                </p>
                <p className="content-author">
                  By: {item.authorName}
                </p>
                <p className="content-dates">
                  Created: {formatDate(item.createdAt)}
                  {item.publishedAt && (
                    <span> • Published: {formatDate(item.publishedAt)}</span>
                  )}
                </p>
              </div>
              
              <div className="content-slug">
                <code>/{item.slug}</code>
              </div>
              
              {canEdit && (
                <div className="content-actions">
                  <Link to={`/content/edit/${item.id}`}>
                    <Button variant="secondary" size="small">
                      Edit
                    </Button>
                  </Link>
                  
                  <Link to={`/content/view/${item.id}`}>
                    <Button variant="secondary" size="small">
                      View
                    </Button>
                  </Link>
                  
                  {canDelete && (
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleDelete(item.id, item.title)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentList;