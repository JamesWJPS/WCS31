import { apiService } from './api';
import { Content, ContentFormData, ContentListItem, ContentFilter, Template, ApiResponse } from '../types';

export class ContentService {
  /**
   * Get all content items with optional filtering
   */
  async getContentList(filter?: ContentFilter): Promise<ContentListItem[]> {
    const params = new URLSearchParams();
    
    if (filter?.status) params.append('status', filter.status);
    if (filter?.templateId) params.append('templateId', filter.templateId);
    if (filter?.authorId) params.append('authorId', filter.authorId);
    if (filter?.search) params.append('search', filter.search);

    const queryString = params.toString();
    const url = queryString ? `/content?${queryString}` : '/content';
    
    const response = await apiService.get<ContentListItem[]>(url);
    return response.data || [];
  }

  /**
   * Get a single content item by ID
   */
  async getContent(id: string): Promise<Content> {
    const response = await apiService.get<Content>(`/content/${id}`);
    if (!response.data) {
      throw new Error('Content not found');
    }
    return response.data;
  }

  /**
   * Create new content
   */
  async createContent(contentData: ContentFormData): Promise<Content> {
    const response = await apiService.post<Content>('/content', contentData);
    if (!response.data) {
      throw new Error('Failed to create content');
    }
    return response.data;
  }

  /**
   * Update existing content
   */
  async updateContent(id: string, contentData: Partial<ContentFormData>): Promise<Content> {
    const response = await apiService.put<Content>(`/content/${id}`, contentData);
    if (!response.data) {
      throw new Error('Failed to update content');
    }
    return response.data;
  }

  /**
   * Delete content
   */
  async deleteContent(id: string): Promise<void> {
    await apiService.delete(`/content/${id}`);
  }

  /**
   * Get content preview
   */
  async getContentPreview(id: string): Promise<string> {
    const response = await apiService.get<{ html: string }>(`/content/${id}/preview`);
    return response.data?.html || '';
  }

  /**
   * Get all available templates
   */
  async getTemplates(): Promise<Template[]> {
    const response = await apiService.get<Template[]>('/templates');
    return response.data || [];
  }

  /**
   * Generate slug from title
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim();
  }

  /**
   * Validate content data
   */
  validateContent(data: ContentFormData): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!data.title?.trim()) {
      errors.title = 'Title is required';
    }

    if (!data.slug?.trim()) {
      errors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
      errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    if (!data.body?.trim()) {
      errors.body = 'Content body is required';
    }

    if (!data.templateId) {
      errors.templateId = 'Template selection is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

export const contentService = new ContentService();