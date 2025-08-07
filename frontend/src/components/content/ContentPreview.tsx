import React, { useState, useEffect } from 'react';
import { contentService } from '../../services/contentService';
import { LoadingSpinner } from '../ui';
import './ContentPreview.css';

interface ContentPreviewProps {
  contentId?: string;
  title: string;
  body: string;
  templateId: string;
  className?: string;
}

const ContentPreview: React.FC<ContentPreviewProps> = ({
  contentId,
  title,
  body,
  templateId,
  className = '',
}) => {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generatePreview = async () => {
      if (!templateId || !title || !body) {
        setPreviewHtml('');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (contentId) {
          // Use existing content preview endpoint
          const html = await contentService.getContentPreview(contentId);
          setPreviewHtml(html);
        } else {
          // For new content, we'll create a simple preview
          // In a real implementation, this would call a preview endpoint
          const simplePreview = `
            <div class="content-preview-wrapper">
              <h1>${title}</h1>
              <div class="content-body">${body}</div>
            </div>
          `;
          setPreviewHtml(simplePreview);
        }
      } catch (err) {
        console.error('Failed to generate preview:', err);
        setError('Failed to generate preview');
        setPreviewHtml('');
      } finally {
        setIsLoading(false);
      }
    };

    generatePreview();
  }, [contentId, title, body, templateId]);

  if (isLoading) {
    return (
      <div className={`content-preview ${className}`}>
        <div className="preview-header">
          <h3>Preview</h3>
        </div>
        <div className="preview-loading">
          <LoadingSpinner size="small" />
          <span>Generating preview...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`content-preview ${className}`}>
        <div className="preview-header">
          <h3>Preview</h3>
        </div>
        <div className="preview-error">
          <p>Unable to generate preview: {error}</p>
        </div>
      </div>
    );
  }

  if (!previewHtml) {
    return (
      <div className={`content-preview ${className}`}>
        <div className="preview-header">
          <h3>Preview</h3>
        </div>
        <div className="preview-empty">
          <p>Fill in the title, select a template, and add content to see a preview.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`content-preview ${className}`}>
      <div className="preview-header">
        <h3>Preview</h3>
        <button
          type="button"
          className="preview-refresh"
          onClick={() => {
            // Force refresh by updating a dependency
            setPreviewHtml('');
            setTimeout(() => {
              // This will trigger the useEffect
            }, 100);
          }}
          aria-label="Refresh preview"
        >
          🔄
        </button>
      </div>
      <div className="preview-content">
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Content Preview</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 1rem;
                }
                h1, h2, h3, h4, h5, h6 {
                  margin-top: 1.5rem;
                  margin-bottom: 0.5rem;
                  font-weight: 600;
                }
                h1 { font-size: 2rem; }
                h2 { font-size: 1.5rem; }
                h3 { font-size: 1.25rem; }
                p { margin: 1rem 0; }
                ul, ol { margin: 1rem 0; padding-left: 2rem; }
                li { margin: 0.25rem 0; }
                a { color: #3b82f6; text-decoration: underline; }
                a:hover { color: #1d4ed8; }
                .content-preview-wrapper {
                  background: white;
                  border-radius: 0.5rem;
                  padding: 1rem;
                }
              </style>
            </head>
            <body>
              ${previewHtml}
            </body>
            </html>
          `}
          title="Content Preview"
          className="preview-iframe"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
};

export default ContentPreview;