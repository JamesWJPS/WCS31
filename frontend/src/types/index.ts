// API Response types
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

// Content types
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
  publishedAt?: string;
}

// Document types
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
  };
}

// Folder types
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

// Template types
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
}

export interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'rich-text' | 'image' | 'link';
  required: boolean;
  validation: Record<string, any>;
}