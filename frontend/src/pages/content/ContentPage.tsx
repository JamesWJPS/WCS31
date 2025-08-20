import React, { useState, useEffect } from 'react';
import { contentService } from '../../services/contentService';
import { ContentListItem, ContentFormData, Template, ContentItem, MenuUpdate } from '../../types';
import DragDropMenuManager from '../../components/layout/DragDropMenuManager';
import './ContentPage.css';

const ContentPage: React.FC = () => {
  const [contentItems, setContentItems] = useState<ContentListItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentListItem | null>(null);
  const [showMenuManager, setShowMenuManager] = useState(false);
  const [menuManagerLoading, setMenuManagerLoading] = useState(false);
  const [formData, setFormData] = useState<ContentFormData>({
    title: '',
    slug: '',
    body: '',
    templateId: 'default',
    status: 'draft',
    metadata: {},
    menu_title: '',
    parent_id: null,
    menu_order: 0,
    show_in_menu: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading content...');
      const items = await contentService.getContentList();
      console.log('Content loaded:', items);
      
      setContentItems(items);
      
      // Set default templates since the backend doesn't have a templates endpoint yet
      setTemplates([
        { id: 'default', name: 'Default Template', description: 'Standard page template' }
      ]);
    } catch (err) {
      console.error('Failed to load content:', err);
      setError(`Failed to load content: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingContent(null);
    setFormData({
      title: '',
      slug: '',
      body: '',
      templateId: templates[0]?.id || 'default',
      status: 'draft',
      metadata: {},
      menu_title: '',
      parent_id: null,
      menu_order: 0,
      show_in_menu: true
    });
    setShowModal(true);
  };

  const handleEdit = async (item: ContentListItem) => {
    try {
      const content = await contentService.getContent(item.id);
      setEditingContent(item);
      setFormData({
        title: content.title,
        slug: content.slug || '',
        body: content.body,
        templateId: content.template_id || 'default',
        status: content.status,
        metadata: content.metadata || {},
        menu_title: content.menu_title || '',
        parent_id: content.parent_id || null,
        menu_order: content.menu_order || 0,
        show_in_menu: content.show_in_menu || true
      });
      setShowModal(true);
    } catch (err) {
      console.error('Failed to load content for editing:', err);
      alert('Failed to load content for editing');
    }
  };

  const handleDelete = async (item: ContentListItem) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    
    try {
      await contentService.deleteContent(item.id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete content:', err);
      alert('Failed to delete content');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingContent) {
        await contentService.updateContent(editingContent.id, formData);
      } else {
        await contentService.createContent(formData);
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save content:', err);
      alert('Failed to save content');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'title' && !editingContent ? { slug: contentService.generateSlug(value) } : {})
    }));
  };

  const handleManageMenuOrder = () => {
    setShowMenuManager(true);
  };

  const handleMenuUpdate = async (updates: MenuUpdate[]) => {
    try {
      console.log('ContentPage: handleMenuUpdate called with updates:', updates);
      setMenuManagerLoading(true);
      await contentService.bulkUpdateMenuOrder(updates);
      console.log('ContentPage: bulkUpdateMenuOrder completed successfully');
      // Refresh the content list to show updated order
      await loadData();
      console.log('ContentPage: content list refreshed');
    } catch (err) {
      console.error('Failed to update menu order:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        statusCode: err && typeof err === 'object' && 'statusCode' in err ? (err as any).statusCode : undefined
      });
      throw new Error('Failed to update menu order');
    } finally {
      setMenuManagerLoading(false);
    }
  };

  const handleCloseMenuManager = () => {
    setShowMenuManager(false);
  };

  // Convert ContentListItem[] to ContentItem[] for the menu manager
  const getContentItemsForMenu = (): ContentItem[] => {
    return contentItems.map(item => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      menu_title: item.menu_title,
      parent_id: item.parent_id,
      menu_order: item.menu_order,
      show_in_menu: item.show_in_menu,
      status: item.status,
      updated_at: item.updatedAt
    }));
  };

  if (loading) {
    return (
      <div className="content-page">
        <div className="page-header">
          <h1>Content Management</h1>
          <p className="page-description">
            Create, edit, and manage your website content. Organize pages and control what visitors see.
          </p>
        </div>
        <div className="loading-state">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span>Loading content...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-page">
        <div className="page-header">
          <h1>Content Management</h1>
          <p className="page-description">
            Create, edit, and manage your website content. Organize pages and control what visitors see.
          </p>
        </div>
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="content-page">
      <div className="page-header">
        <h1>Content Management</h1>
        <p className="page-description">
          Create, edit, and manage your website content. Organize pages and control what visitors see.
        </p>
      </div>
      
      <div className="content-list">
        <div className="content-actions mb-3">
          <button className="btn btn-primary" onClick={handleCreate}>
            <i className="bi bi-plus me-2"></i>
            Create New Content
          </button>
          {contentItems.length > 0 && (
            <button 
              className="btn btn-outline-secondary ms-2" 
              onClick={handleManageMenuOrder}
              disabled={loading}
            >
              <i className="bi bi-list-ul me-2"></i>
              Manage Menu Order
            </button>
          )}
        </div>
        
        {contentItems.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contentItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      {item.slug && <div className="text-muted small">/{item.slug}</div>}
                    </td>
                    <td>
                      <span className={`badge ${item.status === 'published' ? 'bg-success' : 'bg-warning'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>{new Date(item.updated_at).toLocaleDateString()}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button 
                          className="btn btn-outline-primary"
                          onClick={() => handleEdit(item)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button 
                          className="btn btn-outline-info"
                          title="View"
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        <button 
                          className="btn btn-outline-danger"
                          onClick={() => handleDelete(item)}
                          title="Delete"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state text-center py-5">
            <i className="bi bi-file-text display-1 text-muted"></i>
            <h3>No Content Found</h3>
            <p className="text-muted">Get started by creating your first piece of content.</p>
            <button className="btn btn-primary" onClick={handleCreate}>
              <i className="bi bi-plus me-2"></i>
              Create Content
            </button>
          </div>
        )}
      </div>

      {/* Content Form Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingContent ? 'Edit Content' : 'Create New Content'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-8">
                      <div className="mb-3">
                        <label className="form-label">Title *</label>
                        <input
                          type="text"
                          className="form-control"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <select
                          className="form-select"
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-8">
                      <div className="mb-3">
                        <label className="form-label">Slug</label>
                        <input
                          type="text"
                          className="form-control"
                          name="slug"
                          value={formData.slug}
                          onChange={handleInputChange}
                        />
                        <div className="form-text">URL-friendly version of the title</div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Template</label>
                        <select
                          className="form-select"
                          name="templateId"
                          value={formData.templateId}
                          onChange={handleInputChange}
                        >
                          {templates.map(template => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Menu Title</label>
                    <input
                      type="text"
                      className="form-control"
                      name="menu_title"
                      value={formData.menu_title}
                      onChange={handleInputChange}
                      placeholder="Title to show in navigation menu"
                    />
                  </div>

                  <div className="mb-3 form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      name="show_in_menu"
                      checked={!!formData.show_in_menu}
                      onChange={(e) => setFormData(prev => ({ ...prev, show_in_menu: e.target.checked }))}
                    />
                    <label className="form-check-label">
                      Show in Navigation Menu
                    </label>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Content *</label>
                    <textarea
                      className="form-control"
                      name="body"
                      value={formData.body}
                      onChange={handleInputChange}
                      rows={10}
                      required
                      placeholder="Enter your content here..."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingContent ? 'Update' : 'Create'} Content
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Menu Manager Modal */}
      {showMenuManager && (
        <DragDropMenuManager
          contents={getContentItemsForMenu()}
          onMenuUpdate={handleMenuUpdate}
          onClose={handleCloseMenuManager}
          loading={menuManagerLoading}
        />
      )}
    </div>
  );
};

// Simple content view component for viewing published content
const ContentView: React.FC = () => {
  return (
    <div className="content-view">
      <h1>Content View</h1>
      <p>Content viewing interface - to be implemented in future tasks</p>
    </div>
  );
};

export default ContentPage;