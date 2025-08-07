/**
 * Frontend type definitions for the Web Communication CMS
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'administrator' | 'editor' | 'read-only';
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  isActive: boolean;
}

export interface Content {
  id: string;
  title: string;
  slug: string;
  body: string;
  templateId: string;
  authorId: string;
  status: 'draft' | 'published' | 'archived';
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  htmlStructure: string;
  cssStyles: string;
  accessibilityFeatures: {
    skipLinks: boolean;
    headingStructure: boolean;
    altTextRequired: boolean;
    colorContrastCompliant: boolean;
  };
  contentFields: TemplateField[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'rich-text' | 'image' | 'link';
  required: boolean;
  validation: Record<string, any>;
}

export interface ContentFormData {
  title: string;
  slug: string;
  body: string;
  templateId: string;
  status: 'draft' | 'published' | 'archived';
  metadata: Record<string, any>;
}

export interface ContentListItem {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  templateName: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface ContentFilter {
  status?: 'draft' | 'published' | 'archived';
  templateId?: string;
  authorId?: string;
  search?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}