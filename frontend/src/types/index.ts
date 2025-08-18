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
  // Menu-related properties
  menu_title?: string;
  parent_id?: string | null;
  menu_order?: number;
  show_in_menu?: boolean | number;
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
  // Menu-related properties
  menu_title?: string;
  parent_id?: string | null;
  menu_order?: number;
  show_in_menu?: boolean | number;
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
  // Menu-related properties
  menu_title?: string;
  parent_id?: string | null;
  menu_order?: number;
  show_in_menu?: boolean | number;
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

export interface UserFilter {
  search?: string;
  role?: 'administrator' | 'editor' | 'read-only';
  isActive?: boolean;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role: 'administrator' | 'editor' | 'read-only';
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  password?: string;
  role?: 'administrator' | 'editor' | 'read-only';
  isActive?: boolean;
}

export interface ContentItem {
  id: string;
  title: string;
  slug?: string;
  menu_title?: string;
  parent_id?: string | null;
  menu_order?: number;
  show_in_menu?: boolean | number;
  status?: 'draft' | 'published' | 'archived';
  updated_at?: string;
  children?: ContentItem[];
}

export interface ErrorState {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  retryable: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
}

export interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}