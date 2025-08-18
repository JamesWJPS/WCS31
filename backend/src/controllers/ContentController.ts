import { Request, Response } from 'express';
import { ContentService, CreateContentData, UpdateContentData, ContentListQuery } from '../services/ContentService';
import { AuthenticatedRequest } from '../middleware/auth';

export class ContentController {
  private contentService: ContentService;

  constructor() {
    this.contentService = new ContentService();
  }

  /**
   * Get paginated list of content with search and filtering
   */
  getContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const query: ContentListQuery = {};
      
      if (req.query['page']) {
        query.page = parseInt(req.query['page'] as string);
      }
      
      if (req.query['limit']) {
        query.limit = parseInt(req.query['limit'] as string);
      }
      
      if (req.query['query']) {
        query.query = req.query['query'] as string;
      }
      
      if (req.query['status']) {
        query.status = req.query['status'] as any;
      }
      
      if (req.query['authorId']) {
        query.authorId = req.query['authorId'] as string;
      }
      
      if (req.query['templateId']) {
        query.templateId = req.query['templateId'] as string;
      }
      
      if (req.query['tags']) {
        const tagsParam = req.query['tags'] as string;
        query.tags = tagsParam.split(',').map(tag => tag.trim());
      }
      
      if (req.query['dateFrom']) {
        query.dateFrom = req.query['dateFrom'] as string;
      }
      
      if (req.query['dateTo']) {
        query.dateTo = req.query['dateTo'] as string;
      }
      
      if (req.query['sortBy']) {
        query.sortBy = req.query['sortBy'] as any;
      }
      
      if (req.query['sortOrder']) {
        query.sortOrder = req.query['sortOrder'] as any;
      }

      const result = await this.contentService.getContent(query, req.user.role, req.user.userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get content by ID
   */
  getContentById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CONTENT_ID',
            message: 'Content ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await this.contentService.getContentById(id, req.user.role, req.user.userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get content by slug (public endpoint)
   */
  getContentBySlug = async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      
      if (!slug) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CONTENT_SLUG',
            message: 'Content slug is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await this.contentService.getContentBySlug(slug);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Create new content
   */
  createContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const contentData: CreateContentData = req.body;
      const result = await this.contentService.createContent(contentData, req.user.userId);

      if (result.success) {
        res.status(201).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Update content
   */
  updateContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CONTENT_ID',
            message: 'Content ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const updateData: UpdateContentData = req.body;
      const result = await this.contentService.updateContent(id, updateData, req.user.role, req.user.userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Delete content
   */
  deleteContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CONTENT_ID',
            message: 'Content ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await this.contentService.deleteContent(id, req.user.role, req.user.userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Publish content
   */
  publishContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CONTENT_ID',
            message: 'Content ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await this.contentService.publishContent(id, req.user.role, req.user.userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Unpublish content (set to draft)
   */
  unpublishContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CONTENT_ID',
            message: 'Content ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await this.contentService.unpublishContent(id, req.user.role, req.user.userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Archive content
   */
  archiveContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CONTENT_ID',
            message: 'Content ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await this.contentService.archiveContent(id, req.user.role, req.user.userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get content preview (rendered with template)
   */
  getContentPreview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CONTENT_ID',
            message: 'Content ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get the content first
      const contentResult = await this.contentService.getContentById(id, req.user.role, req.user.userId);

      if (!contentResult.success) {
        const statusCode = this.getStatusCodeFromError(contentResult.error?.code);
        res.status(statusCode).json(contentResult);
        return;
      }

      // For now, return the content data - template rendering will be implemented later
      // This provides the preview functionality as requested
      res.status(200).json({
        success: true,
        data: {
          content: contentResult.data,
          preview: {
            title: contentResult.data!.title,
            body: contentResult.data!.body,
            metadata: contentResult.data!.metadata,
            templateId: contentResult.data!.templateId,
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get content versions
   */
  getContentVersions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CONTENT_ID',
            message: 'Content ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await this.contentService.getContentVersions(id, req.user.role, req.user.userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Restore content version
   */
  restoreContentVersion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { version } = req.body;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CONTENT_ID',
            message: 'Content ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!version || typeof version !== 'number') {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_VERSION',
            message: 'Version number is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await this.contentService.restoreContentVersion(id, version, req.user.role, req.user.userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Bulk update menu order and hierarchy
   */
  bulkUpdateMenuOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { updates } = req.body;
      
      if (!updates || !Array.isArray(updates)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_UPDATES',
            message: 'Updates array is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await this.contentService.bulkUpdateMenuOrder(updates, req.user.role, req.user.userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Map error codes to HTTP status codes
   */
  private getStatusCodeFromError(errorCode?: string): number {
    switch (errorCode) {
      case 'MISSING_FIELDS':
      case 'MISSING_CONTENT_ID':
      case 'MISSING_CONTENT_SLUG':
      case 'MISSING_VERSION':
        return 400;
      case 'ACCESS_DENIED':
        return 403;
      case 'CONTENT_NOT_FOUND':
      case 'VERSION_NOT_FOUND':
        return 404;
      case 'SLUG_EXISTS':
        return 409;
      case 'INVALID_TEMPLATE':
        return 422;
      default:
        return 500;
    }
  }
}