import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Content, ContentFormData, Template } from '../../types';
import { contentService } from '../../services/contentService';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Form, 
  FormField, 
  Input, 
  Select, 
  Button, 
  LoadingSpinner, 
  ErrorMessage,
  Notification 
} from '../ui';
import RichTextEditor from '../ui/RichTextEditor';
import TemplateSelector from './TemplateSelector';
import ContentPreview from './ContentPreview';
import './ContentEditor.css';

interface ContentEditorProps {
  mode: 'create' | 'edit';
}

const ContentEditor: React.FC<ContentEditorProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [content, setContent] = useState<Content | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [formData, setFormData] = useState<ContentFormData>({
    title: '',
    slug: '',
    body: '',
    templateId: '',
    status: 'draft',
    metadata: {},
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load content and templates on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load templates
        const templatesData = await contentService.getTemplates();
        setTemplates(templatesData);

        // Load content if editing
        if (mode === 'edit' && id) {
          const contentData = await contentService.getContent(id);
          setContent(contentData);
          setFormData({
            title: contentData.title,
            slug: contentData.slug,
            body: contentData.body,
            templateId: contentData.templateId,
            status: contentData.status,
            metadata: contentData.metadata,
          });
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setNotification({
          type: 'error',
          message: 'Failed to load content data',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [mode, id]);

  // Auto-generate slug from title
  useEffect(() => {
    if (formData.title && (mode === 'create' || !formData.slug)) {
      const slug = contentService.generateSlug(formData.title);
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.title, mode]);

  const handleInputChange = (field: keyof ContentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = contentService.validateContent(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      if (mode === 'create') {
        const newContent = await contentService.createContent(formData);
        setNotification({
          type: 'success',
          message: 'Content created successfully',
        });
        navigate(`/content/edit/${newContent.id}`);
      } else if (mode === 'edit' && id) {
        await contentService.updateContent(id, formData);
        setNotification({
          type: 'success',
          message: 'Content updated successfully',
        });
      }
    } catch (error) {
      console.error('Failed to save content:', error);
      setNotification({
        type: 'error',
        message: 'Failed to save content',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !content) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete this content? This action cannot be undone.'
    );
    
    if (!confirmed) return;

    try {
      await contentService.deleteContent(id);
      setNotification({
        type: 'success',
        message: 'Content deleted successfully',
      });
      navigate('/content');
    } catch (error) {
      console.error('Failed to delete content:', error);
      setNotification({
        type: 'error',
        message: 'Failed to delete content',
      });
    }
  };

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ];

  if (isLoading) {
    return (
      <div className="content-editor-loading">
        <LoadingSpinner />
        <p>Loading content editor...</p>
      </div>
    );
  }

  return (
    <div className="content-editor">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="content-editor-header">
        <h1>{mode === 'create' ? 'Create New Content' : 'Edit Content'}</h1>
        <div className="header-actions">
          <Button
            variant="secondary"
            onClick={() => setShowPreview(!showPreview)}
            aria-pressed={showPreview}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/content')}
          >
            Cancel
          </Button>
        </div>
      </div>

      <div className={`content-editor-layout ${showPreview ? 'with-preview' : ''}`}>
        <div className="editor-form">
          <Form onSubmit={handleSubmit}>
            <FormField
              label="Title"
              required
              error={errors.title}
            >
              <Input
                value={formData.title}
                onChange={(value) => handleInputChange('title', value)}
                placeholder="Enter content title..."
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
            </FormField>

            <FormField
              label="Slug"
              required
              error={errors.slug}
              helpText="URL-friendly version of the title"
            >
              <Input
                value={formData.slug}
                onChange={(value) => handleInputChange('slug', value)}
                placeholder="content-slug"
                aria-describedby={errors.slug ? 'slug-error' : undefined}
              />
            </FormField>

            <FormField
              label="Template"
              required
              error={errors.templateId}
            >
              <TemplateSelector
                templates={templates}
                selectedTemplateId={formData.templateId}
                onTemplateChange={(templateId) => handleInputChange('templateId', templateId)}
                error={errors.templateId}
              />
            </FormField>

            <FormField
              label="Status"
              required
            >
              <Select
                value={formData.status}
                onChange={(value) => handleInputChange('status', value)}
                options={statusOptions}
                aria-label="Content status"
              />
            </FormField>

            <FormField
              label="Content"
              required
              error={errors.body}
            >
              <RichTextEditor
                value={formData.body}
                onChange={(value) => handleInputChange('body', value)}
                placeholder="Enter your content here..."
                aria-label="Content body"
                aria-describedby={errors.body ? 'body-error' : undefined}
              />
            </FormField>

            <div className="form-actions">
              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
                loading={isSaving}
              >
                {mode === 'create' ? 'Create Content' : 'Update Content'}
              </Button>
              
              {mode === 'edit' && user?.role === 'administrator' && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDelete}
                  disabled={isSaving}
                >
                  Delete Content
                </Button>
              )}
            </div>
          </Form>
        </div>

        {showPreview && (
          <div className="editor-preview">
            <ContentPreview
              contentId={mode === 'edit' ? id : undefined}
              title={formData.title}
              body={formData.body}
              templateId={formData.templateId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentEditor;