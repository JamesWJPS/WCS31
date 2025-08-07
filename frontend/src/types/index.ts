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

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId: string;
  uploadedBy: string;
  createdAt: string;
  metadata: {
    title?: string;
    description?: string;
    tags?: string[];
    hash?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
  documentCount?: number;
  totalSize?: number;
}

export interface FolderContents {
  folder: Folder;
  folders: Folder[];
  documents: Document[];
}

export interface DocumentFilter {
  search?: string;
  folderId?: string;
  mimeType?: string;
  tags?: string[];
  uploadedBy?: string;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}