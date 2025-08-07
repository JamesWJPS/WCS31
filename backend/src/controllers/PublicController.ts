import { Request, Response } from 'express';
import { ContentService } from '../services/ContentService';
import { TemplateService } from '../services/TemplateService';
import { TemplateRenderer } from '../utils/templateRenderer';

export class PublicController {
  private contentService: ContentService;
  private templateService: TemplateService;

  constructor() {
    this.contentService = new ContentService();
    this.templateService = new TemplateService();
  }

  /**
   * Render public content page by slug
   */
  async renderContentPage(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      if (!slug) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SLUG',
            message: 'Slug parameter is required',
          },
        });
        return;
      }

      // Get published content by slug
      const contentResult = await this.contentService.getContentBySlug(slug);
      
      if (!contentResult.success || !contentResult.data) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PAGE_NOT_FOUND',
            message: 'Page not found',
          },
        });
        return;
      }

      const content = contentResult.data;

      // Get template for rendering
      const template = await this.templateService.getTemplateById(content.templateId);
      
      if (!template) {
        res.status(500).json({
          success: false,
          error: {
            code: 'TEMPLATE_ERROR',
            message: 'Template not found',
          },
        });
        return;
      }

      // Parse content body as template data
      let templateData: Record<string, any> = {};
      try {
        templateData = JSON.parse(content.body);
      } catch (error) {
        // If body is not JSON, treat as plain text
        templateData = { content: content.body };
      }

      // Render template with content
      const renderResult = TemplateRenderer.render(template, content, templateData);

      if (renderResult.errors.length > 0) {
        console.error('Template rendering errors:', renderResult.errors);
        res.status(500).json({
          success: false,
          error: {
            code: 'RENDER_ERROR',
            message: 'Failed to render page',
            details: { errors: renderResult.errors },
          },
        });
        return;
      }

      // Set appropriate headers for HTML response
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
      
      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');

      res.send(renderResult.html);
    } catch (error) {
      console.error('Error rendering content page:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  /**
   * Get public content metadata (for API access)
   */
  async getContentMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      if (!slug) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SLUG',
            message: 'Slug parameter is required',
          },
        });
        return;
      }

      const contentResult = await this.contentService.getContentBySlug(slug);
      
      if (!contentResult.success || !contentResult.data) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Content not found',
          },
        });
        return;
      }

      const content = contentResult.data;

      // Return public metadata only
      res.json({
        success: true,
        data: {
          id: content.id,
          title: content.title,
          slug: content.slug,
          metadata: content.metadata,
          publishedAt: content.publishedAt,
          templateId: content.templateId,
        },
      });
    } catch (error) {
      console.error('Error getting content metadata:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  /**
   * List all published content (for sitemap generation)
   */
  async listPublishedContent(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = Math.min(100, parseInt(req.query['limit'] as string) || 50);

      const contentResult = await this.contentService.getContent(
        {
          page,
          limit,
          status: 'published',
          sortBy: 'publishedAt',
          sortOrder: 'desc',
        },
        'administrator', // Use admin role to bypass restrictions
        'system'
      );

      if (!contentResult.success) {
        res.status(500).json({
          success: false,
          error: {
            code: 'CONTENT_FETCH_ERROR',
            message: 'Failed to fetch content',
          },
        });
        return;
      }

      // Return public data only
      const publicContent = contentResult.data!.content.map(content => ({
        id: content.id,
        title: content.title,
        slug: content.slug,
        publishedAt: content.publishedAt,
        metadata: content.metadata,
      }));

      res.json({
        success: true,
        data: {
          content: publicContent,
          pagination: contentResult.data!.pagination,
        },
      });
    } catch (error) {
      console.error('Error listing published content:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  /**
   * Access public document by ID
   */
  async getPublicDocument(_req: Request, res: Response): Promise<void> {
    try {
      // For now, return a simple response indicating the feature is not fully implemented
      // This would need to be implemented with proper file serving logic
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Document serving not yet implemented',
        },
      });
    } catch (error) {
      console.error('Error serving public document:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  /**
   * List public documents in a folder
   */
  async listPublicDocuments(_req: Request, res: Response): Promise<void> {
    try {
      // For now, return a simple response indicating the feature is not fully implemented
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Document listing not yet implemented',
        },
      });
    } catch (error) {
      console.error('Error listing public documents:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  /**
   * Generate sitemap.xml for SEO
   */
  async generateSitemap(req: Request, res: Response): Promise<void> {
    try {
      const baseUrl = req.protocol + '://' + req.get('host');

      // Get all published content
      const contentResult = await this.contentService.getContent(
        {
          status: 'published',
          limit: 1000, // Get all published content
          sortBy: 'publishedAt',
          sortOrder: 'desc',
        },
        'administrator',
        'system'
      );

      if (!contentResult.success) {
        res.status(500).json({
          success: false,
          error: {
            code: 'SITEMAP_ERROR',
            message: 'Failed to generate sitemap',
          },
        });
        return;
      }

      // Generate XML sitemap
      let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
      sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      // Add homepage
      sitemap += '  <url>\n';
      sitemap += `    <loc>${baseUrl}/</loc>\n`;
      sitemap += `    <changefreq>daily</changefreq>\n`;
      sitemap += `    <priority>1.0</priority>\n`;
      sitemap += '  </url>\n';

      // Add content pages
      contentResult.data!.content.forEach(content => {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}/page/${content.slug}</loc>\n`;
        if (content.publishedAt) {
          sitemap += `    <lastmod>${content.publishedAt.toISOString().split('T')[0]}</lastmod>\n`;
        }
        sitemap += `    <changefreq>weekly</changefreq>\n`;
        sitemap += `    <priority>0.8</priority>\n`;
        sitemap += '  </url>\n';
      });

      sitemap += '</urlset>';

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
      res.send(sitemap);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  /**
   * Generate robots.txt for SEO
   */
  async generateRobotsTxt(req: Request, res: Response): Promise<void> {
    try {
      const baseUrl = req.protocol + '://' + req.get('host');
      
      let robotsTxt = 'User-agent: *\n';
      robotsTxt += 'Allow: /\n';
      robotsTxt += 'Disallow: /api/\n';
      robotsTxt += 'Disallow: /admin/\n';
      robotsTxt += '\n';
      robotsTxt += `Sitemap: ${baseUrl}/sitemap.xml\n`;

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours cache
      res.send(robotsTxt);
    } catch (error) {
      console.error('Error generating robots.txt:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }
}