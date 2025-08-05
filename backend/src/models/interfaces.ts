/**
 * Core data model interfaces for the Web Communication CMS
 */

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'administrator' | 'editor' | 'read-only';
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
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
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId: string;
  uploadedBy: string;
  createdAt: Date;
  metadata: {
    title?: string;
    description?: string;
    tags?: string[];
  };
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  isPublic: boolean;
  permissions: {
    read: string[];
    write: string[];
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'rich-text' | 'image' | 'link';
  required: boolean;
  validation: Record<string, any>;
}

// Database table interfaces (for Knex operations)
export interface UserTable {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'administrator' | 'editor' | 'read-only';
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
  is_active: boolean;
}

export interface ContentTable {
  id: string;
  title: string;
  slug: string;
  body: string;
  template_id: string;
  author_id: string;
  status: 'draft' | 'published' | 'archived';
  metadata: string; // JSON string
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
}

export interface DocumentTable {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  folder_id: string;
  uploaded_by: string;
  created_at: Date;
  updated_at: Date;
  metadata: string; // JSON string
}

export interface FolderTable {
  id: string;
  name: string;
  parent_id: string | null;
  is_public: boolean;
  permissions: string; // JSON string
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface TemplateTable {
  id: string;
  name: string;
  description: string;
  html_structure: string;
  css_styles: string;
  accessibility_features: string; // JSON string
  content_fields: string; // JSON string
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ContentVersionTable {
  id: string;
  content_id: string;
  version: number;
  title: string;
  body: string;
  metadata: string; // JSON string
  created_at: Date;
  created_by: string;
}