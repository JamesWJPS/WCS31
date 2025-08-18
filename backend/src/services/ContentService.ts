import { ContentRepository, ContentSearchOptions, ContentVersion } from '../models/ContentRepository';
import { TemplateRepository } from '../models/TemplateRepository';
import { Content } from '../models/interfaces';
import { randomUUID } from 'crypto';

export interface MenuUpdate {
  id: string;
  menu_order: number;
  parent_id?: string | null;
  show_in_menu?: boolean | number;
}

export interface CreateContentData {
  title: string;
  body: string;
  templateId: string;
  metadata?: Record<string, any>;
  status?: 'draft' | 'published';
}

export interface UpdateContentData {
  title?: string;
  body?: string;
  templateId?: string;
  metadata?: Record<string, any>;
  status?: 'draft' | 'published' | 'archived';
}

export interface ContentListQuery {
  page?: number;
  limit?: number;
  query?: string;
  status?: 'draft' | 'published' | 'archived';
  authorId?: string;
  templateId?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'publishedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ContentListResponse {
  content: Content[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

export class ContentService {
  private contentRepository: ContentRepository;
  private templateRepository: TemplateRepository;

  constructor() {
    this.contentRepository = new ContentRepository();
    this.templateRepository = new TemplateRepository();
  }

  /**
   * Get paginated list of content with search and filtering
   */
  async getContent(query: ContentListQuery, userRole: string, userId: string): Promise<ServiceResponse<ContentListResponse>> {
    try {
      const page = Math.max(1, query.page || 1);
      const limit = Math.min(100, Math.max(1, query.limit || 10));
      const offset = (page - 1) * limit;

      // Build search options
      const searchOptions: ContentSearchOptions = {
        limit,
        offset,
        sortBy: query.sortBy || 'updatedAt',
        sortOrder: query.sortOrder || 'desc',
      };

      if (query.query) {
        searchOptions.query = query.query;
      }

      if (query.status) {
        searchOptions.status = query.status;
      }

      if (query.templateId) {
        searchOptions.templateId = query.templateId;
      }

      if (query.tags && query.tags.length > 0) {
        searchOptions.tags = query.tags;
      }

      if (query.dateFrom) {
        searchOptions.dateFrom = new Date(query.dateFrom);
      }

      if (query.dateTo) {
        searchOptions.dateTo = new Date(query.dateTo);
      }

      // Role-based filtering
      if (userRole === 'editor' || userRole === 'read-only') {
        // Non-admin users can only see their own content or published content
        if (query.authorId) {
          searchOptions.authorId = query.authorId;
        } else {
          // If no specific author requested, show user's own content plus published content
          // This will be handled in the repository layer
        }
      } else if (query.authorId) {
        // Admins can filter by any author
        searchOptions.authorId = query.authorId;
      }

      const result = await this.contentRepository.search(searchOptions);
      
      // Filter results based on user permissions
      let filteredContent = result.content;
      if (userRole !== 'administrator') {
        filteredContent = result.content.filter(content => 
          content.authorId === userId || content.status === 'published'
        );
      }

      const totalPages = Math.ceil(result.total / limit);

      return {
        success: true,
        data: {
          content: filteredContent,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages,
          },
        },
      };
    } catch (error) {
      console.error('Error getting content:', error);
      return {
        success: false,
        error: {
          code: 'CONTENT_FETCH_ERROR',
          message: 'Failed to fetch content',
        },
      };
    }
  }

  /**
   * Get content by ID
   */
  async getContentById(id: string, userRole: string, userId: string): Promise<ServiceResponse<Content>> {
    try {
      const content = await this.contentRepository.findById(id);

      if (!content) {
        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Content not found',
          },
        };
      }

      // Check permissions
      if (userRole !== 'administrator' && content.authorId !== userId && content.status !== 'published') {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to access this content',
          },
        };
      }

      return {
        success: true,
        data: content,
      };
    } catch (error) {
      console.error('Error getting content by ID:', error);
      return {
        success: false,
        error: {
          code: 'CONTENT_FETCH_ERROR',
          message: 'Failed to fetch content',
        },
      };
    }
  }

  /**
   * Get content by slug (for public access)
   */
  async getContentBySlug(slug: string): Promise<ServiceResponse<Content>> {
    try {
      const content = await this.contentRepository.findBySlug(slug);

      if (!content) {
        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Content not found',
          },
        };
      }

      // Only return published content for public access
      if (content.status !== 'published') {
        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Content not found',
          },
        };
      }

      return {
        success: true,
        data: content,
      };
    } catch (error) {
      console.error('Error getting content by slug:', error);
      return {
        success: false,
        error: {
          code: 'CONTENT_FETCH_ERROR',
          message: 'Failed to fetch content',
        },
      };
    }
  }

  /**
   * Create new content
   */
  async createContent(contentData: CreateContentData, authorId: string): Promise<ServiceResponse<Content>> {
    try {
      // Validate required fields
      if (!contentData.title || !contentData.body || !contentData.templateId) {
        return {
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'Title, body, and template ID are required',
          },
        };
      }

      // Validate template exists and is active
      const template = await this.templateRepository.findById(contentData.templateId);
      if (!template || !template.isActive) {
        return {
          success: false,
          error: {
            code: 'INVALID_TEMPLATE',
            message: 'Invalid or inactive template',
          },
        };
      }

      // Generate slug from title
      const slug = this.generateSlug(contentData.title);
      
      // Check if slug already exists
      const existingContent = await this.contentRepository.findBySlug(slug);
      if (existingContent) {
        return {
          success: false,
          error: {
            code: 'SLUG_EXISTS',
            message: 'Content with this title already exists',
          },
        };
      }

      const now = new Date();
      const contentTableData = {
        id: randomUUID(),
        title: contentData.title,
        slug,
        body: contentData.body,
        template_id: contentData.templateId,
        author_id: authorId,
        status: contentData.status || 'draft',
        metadata: JSON.stringify(contentData.metadata || {}),
        published_at: contentData.status === 'published' ? now : null,
      };

      const createdContent = await this.contentRepository.create(contentTableData);

      return {
        success: true,
        data: createdContent,
      };
    } catch (error) {
      console.error('Error creating content:', error);
      return {
        success: false,
        error: {
          code: 'CONTENT_CREATE_ERROR',
          message: 'Failed to create content',
        },
      };
    }
  }

  /**
   * Update content
   */
  async updateContent(id: string, updateData: UpdateContentData, userRole: string, userId: string): Promise<ServiceResponse<Content>> {
    try {
      const existingContent = await this.contentRepository.findById(id);

      if (!existingContent) {
        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Content not found',
          },
        };
      }

      // Check permissions
      if (userRole !== 'administrator' && existingContent.authorId !== userId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to update this content',
          },
        };
      }

      // Validate template if provided
      if (updateData.templateId) {
        const template = await this.templateRepository.findById(updateData.templateId);
        if (!template || !template.isActive) {
          return {
            success: false,
            error: {
              code: 'INVALID_TEMPLATE',
              message: 'Invalid or inactive template',
            },
          };
        }
      }

      // Create version before updating if content is published
      if (existingContent.status === 'published') {
        await this.contentRepository.createVersion(id, userId);
      }

      const now = new Date();
      const updatedFields: Record<string, any> = {};

      if (updateData.title !== undefined) {
        updatedFields['title'] = updateData.title;
        // Update slug if title changed
        if (updateData.title !== existingContent.title) {
          const newSlug = this.generateSlug(updateData.title);
          const existingWithSlug = await this.contentRepository.findBySlug(newSlug);
          if (existingWithSlug && existingWithSlug.id !== id) {
            return {
              success: false,
              error: {
                code: 'SLUG_EXISTS',
                message: 'Content with this title already exists',
              },
            };
          }
          updatedFields['slug'] = newSlug;
        }
      }

      if (updateData.body !== undefined) {
        updatedFields['body'] = updateData.body;
      }

      if (updateData.templateId !== undefined) {
        updatedFields['template_id'] = updateData.templateId;
      }

      if (updateData.metadata !== undefined) {
        updatedFields['metadata'] = JSON.stringify(updateData.metadata);
      }

      if (updateData.status !== undefined) {
        updatedFields['status'] = updateData.status;
        // Set publishedAt when publishing
        if (updateData.status === 'published' && existingContent.status !== 'published') {
          updatedFields['published_at'] = now;
        }
        // Clear publishedAt when unpublishing
        if (updateData.status !== 'published' && existingContent.status === 'published') {
          updatedFields['published_at'] = null;
        }
      }

      const updatedContent = await this.contentRepository.update(id, updatedFields);

      return {
        success: true,
        data: updatedContent!,
      };
    } catch (error) {
      console.error('Error updating content:', error);
      return {
        success: false,
        error: {
          code: 'CONTENT_UPDATE_ERROR',
          message: 'Failed to update content',
        },
      };
    }
  }

  /**
   * Delete content
   */
  async deleteContent(id: string, userRole: string, userId: string): Promise<ServiceResponse<void>> {
    try {
      const existingContent = await this.contentRepository.findById(id);

      if (!existingContent) {
        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Content not found',
          },
        };
      }

      // Check permissions
      if (userRole !== 'administrator' && existingContent.authorId !== userId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to delete this content',
          },
        };
      }

      await this.contentRepository.delete(id);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting content:', error);
      return {
        success: false,
        error: {
          code: 'CONTENT_DELETE_ERROR',
          message: 'Failed to delete content',
        },
      };
    }
  }

  /**
   * Publish content
   */
  async publishContent(id: string, userRole: string, userId: string): Promise<ServiceResponse<Content>> {
    try {
      const existingContent = await this.contentRepository.findById(id);

      if (!existingContent) {
        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Content not found',
          },
        };
      }

      // Check permissions
      if (userRole !== 'administrator' && existingContent.authorId !== userId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to publish this content',
          },
        };
      }

      // Create version before publishing
      await this.contentRepository.createVersion(id, userId);

      const publishedContent = await this.contentRepository.publish(id);

      return {
        success: true,
        data: publishedContent!,
      };
    } catch (error) {
      console.error('Error publishing content:', error);
      return {
        success: false,
        error: {
          code: 'CONTENT_PUBLISH_ERROR',
          message: 'Failed to publish content',
        },
      };
    }
  }

  /**
   * Unpublish content (set to draft)
   */
  async unpublishContent(id: string, userRole: string, userId: string): Promise<ServiceResponse<Content>> {
    try {
      const existingContent = await this.contentRepository.findById(id);

      if (!existingContent) {
        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Content not found',
          },
        };
      }

      // Check permissions
      if (userRole !== 'administrator' && existingContent.authorId !== userId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to unpublish this content',
          },
        };
      }

      const unpublishedContent = await this.contentRepository.unpublish(id);

      return {
        success: true,
        data: unpublishedContent!,
      };
    } catch (error) {
      console.error('Error unpublishing content:', error);
      return {
        success: false,
        error: {
          code: 'CONTENT_UNPUBLISH_ERROR',
          message: 'Failed to unpublish content',
        },
      };
    }
  }

  /**
   * Archive content
   */
  async archiveContent(id: string, userRole: string, userId: string): Promise<ServiceResponse<Content>> {
    try {
      const existingContent = await this.contentRepository.findById(id);

      if (!existingContent) {
        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Content not found',
          },
        };
      }

      // Check permissions
      if (userRole !== 'administrator' && existingContent.authorId !== userId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to archive this content',
          },
        };
      }

      const archivedContent = await this.contentRepository.archive(id);

      return {
        success: true,
        data: archivedContent!,
      };
    } catch (error) {
      console.error('Error archiving content:', error);
      return {
        success: false,
        error: {
          code: 'CONTENT_ARCHIVE_ERROR',
          message: 'Failed to archive content',
        },
      };
    }
  }

  /**
   * Get content versions
   */
  async getContentVersions(id: string, userRole: string, userId: string): Promise<ServiceResponse<ContentVersion[]>> {
    try {
      const existingContent = await this.contentRepository.findById(id);

      if (!existingContent) {
        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Content not found',
          },
        };
      }

      // Check permissions
      if (userRole !== 'administrator' && existingContent.authorId !== userId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to view content versions',
          },
        };
      }

      const versions = await this.contentRepository.getVersions(id);

      return {
        success: true,
        data: versions,
      };
    } catch (error) {
      console.error('Error getting content versions:', error);
      return {
        success: false,
        error: {
          code: 'CONTENT_VERSIONS_ERROR',
          message: 'Failed to get content versions',
        },
      };
    }
  }

  /**
   * Restore content version
   */
  async restoreContentVersion(id: string, version: number, userRole: string, userId: string): Promise<ServiceResponse<Content>> {
    try {
      const existingContent = await this.contentRepository.findById(id);

      if (!existingContent) {
        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Content not found',
          },
        };
      }

      // Check permissions
      if (userRole !== 'administrator' && existingContent.authorId !== userId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to restore content versions',
          },
        };
      }

      const restoredContent = await this.contentRepository.restoreVersion(id, version, userId);

      if (!restoredContent) {
        return {
          success: false,
          error: {
            code: 'VERSION_NOT_FOUND',
            message: 'Content version not found',
          },
        };
      }

      return {
        success: true,
        data: restoredContent,
      };
    } catch (error) {
      console.error('Error restoring content version:', error);
      return {
        success: false,
        error: {
          code: 'CONTENT_RESTORE_ERROR',
          message: 'Failed to restore content version',
        },
      };
    }
  }

  /**
   * Bulk update menu order and hierarchy
   */
  async bulkUpdateMenuOrder(updates: MenuUpdate[], userRole: string, userId: string): Promise<ServiceResponse<void>> {
    try {
      // Validate updates array
      if (!updates || updates.length === 0) {
        return {
          success: false,
          error: {
            code: 'MISSING_UPDATES',
            message: 'Updates array is required',
          },
        };
      }

      // Validate each update
      for (const update of updates) {
        if (!update.id || typeof update.menu_order !== 'number') {
          return {
            success: false,
            error: {
              code: 'INVALID_UPDATE',
              message: 'Each update must have id and menu_order',
            },
          };
        }

        // Check permissions for each content item
        if (userRole !== 'administrator') {
          const content = await this.contentRepository.findById(update.id);
          if (!content || content.authorId !== userId) {
            return {
              success: false,
              error: {
                code: 'ACCESS_DENIED',
                message: 'You do not have permission to update menu order for some content',
              },
            };
          }
        }
      }

      // Perform bulk update
      await this.contentRepository.bulkUpdateMenuOrder(updates);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error bulk updating menu order:', error);
      return {
        success: false,
        error: {
          code: 'MENU_UPDATE_ERROR',
          message: 'Failed to update menu order',
        },
      };
    }
  }

  /**
   * Generate URL-friendly slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }
}