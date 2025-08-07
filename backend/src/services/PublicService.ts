import { ContentService } from './ContentService';
import { TemplateService } from './TemplateService';
import { TemplateRenderer } from '../utils/templateRenderer';
import { validateAccessibility } from '../utils/accessibilityValidator';
import { Content, Document } from '../models/interfaces';

export interface PublicContentData {
  id: string;
  title: string;
  slug: string;
  publishedAt: Date | null;
  metadata: Record<string, any>;
}

export interface PublicDocumentData {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  metadata: Record<string, any>;
}

export interface PublicFolderData {
  id: string;
  name: string;
  documents: PublicDocumentData[];
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export class PublicService {
  private contentService: ContentService;
  private templateService: TemplateService;

  constructor() {
    this.contentService = new ContentService();
    this.templateService = new TemplateService();
  }

  /**
   * Get published content for public access
   */
  async getPublishedContent(slug: string): Promise<ServiceResponse<Content>> {
    try {
      const result = await this.contentService.getContentBySlug(slug);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Content not found',
          },
        };
      }

      // Ensure content is published
      if (result.data.status !== 'published') {
        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Content not found',
          },
        };
      }

      return result;
    } catch (error) {
      console.error('Error getting published content:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      };
    }
  }

  /**
   * Render content page with template
   */
  async renderContentPage(slug: string): Promise<ServiceResponse<{ html: string; accessibilityScore: number }>> {
    try {
      // Get published content
      const contentResult = await this.getPublishedContent(slug);
      if (!contentResult.success || !contentResult.data) {
        return {
          success: false,
          error: contentResult.error || {
            code: 'CONTENT_ERROR',
            message: 'Failed to get content',
          },
        };
      }

      const content = contentResult.data;

      // Get template
      const template = await this.templateService.getTemplateById(content.templateId);
      if (!template) {
        return {
          success: false,
          error: {
            code: 'TEMPLATE_ERROR',
            message: 'Template not found',
          },
        };
      }

      // Parse content body as template data
      let templateData: Record<string, any> = {};
      try {
        templateData = JSON.parse(content.body);
      } catch (error) {
        // If body is not JSON, treat as plain text
        templateData = { content: content.body };
      }

      // Render template
      const renderResult = TemplateRenderer.render(template, content, templateData);

      if (renderResult.errors.length > 0) {
        return {
          success: false,
          error: {
            code: 'RENDER_ERROR',
            message: 'Failed to render content',
            details: { errors: renderResult.errors },
          },
        };
      }

      return {
        success: true,
        data: {
          html: renderResult.html,
          accessibilityScore: renderResult.accessibilityReport?.score || 0,
        },
      };
    } catch (error) {
      console.error('Error rendering content page:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      };
    }
  }

  /**
   * Get public document if in public folder (placeholder implementation)
   */
  async getPublicDocument(_documentId: string): Promise<ServiceResponse<Document>> {
    // This would need to be implemented with proper document service integration
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Document access not yet implemented',
      },
    };
  }

  /**
   * List all published content for sitemap
   */
  async listAllPublishedContent(): Promise<ServiceResponse<PublicContentData[]>> {
    try {
      const result = await this.contentService.getContent(
        {
          status: 'published',
          limit: 1000, // Get all published content
          sortBy: 'publishedAt',
          sortOrder: 'desc',
        },
        'administrator', // Use admin role to bypass restrictions
        'system'
      );

      if (!result.success || !result.data) {
        return {
          success: false,
          error: {
            code: 'CONTENT_FETCH_ERROR',
            message: 'Failed to fetch content',
          },
        };
      }

      // Convert to public data format
      const publicContent: PublicContentData[] = result.data.content.map(content => ({
        id: content.id,
        title: content.title,
        slug: content.slug,
        publishedAt: content.publishedAt,
        metadata: content.metadata,
      }));

      return {
        success: true,
        data: publicContent,
      };
    } catch (error) {
      console.error('Error listing published content:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      };
    }
  }

  /**
   * Get public documents in a folder (placeholder implementation)
   */
  async getPublicFolderDocuments(_folderId: string): Promise<ServiceResponse<PublicFolderData>> {
    // This would need to be implemented with proper folder and document service integration
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Folder document listing not yet implemented',
      },
    };
  }

  /**
   * Validate page accessibility
   */
  async validatePageAccessibility(slug: string): Promise<ServiceResponse<{ score: number; issues: any[] }>> {
    try {
      const renderResult = await this.renderContentPage(slug);
      
      if (!renderResult.success || !renderResult.data) {
        return {
          success: false,
          error: renderResult.error || {
            code: 'RENDER_ERROR',
            message: 'Failed to render page',
          },
        };
      }

      const accessibilityReport = validateAccessibility(renderResult.data.html);

      return {
        success: true,
        data: {
          score: accessibilityReport.score,
          issues: accessibilityReport.issues,
        },
      };
    } catch (error) {
      console.error('Error validating page accessibility:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      };
    }
  }

  /**
   * Generate structured data for SEO
   */
  generateStructuredData(content: Content): Record<string, any> {
    const baseUrl = process.env['BASE_URL'] || 'http://localhost:3001';
    
    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: content.title,
      url: `${baseUrl}/page/${content.slug}`,
      datePublished: content.publishedAt?.toISOString(),
      dateModified: content.updatedAt.toISOString(),
      description: content.metadata?.['description'] || content.title,
      keywords: content.metadata?.['keywords'] || '',
      inLanguage: 'en-GB', // Default to UK English for councils
      isPartOf: {
        '@type': 'WebSite',
        name: content.metadata?.['siteName'] || 'Council Website',
        url: baseUrl,
      },
    };
  }
}