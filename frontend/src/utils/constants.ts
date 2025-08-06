// API endpoints
export const API_BASE_URL = '/api';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    REFRESH: `${API_BASE_URL}/auth/refresh`,
    PROFILE: `${API_BASE_URL}/auth/profile`,
  },
  CONTENT: {
    BASE: `${API_BASE_URL}/content`,
    PREVIEW: (id: string) => `${API_BASE_URL}/content/${id}/preview`,
  },
  DOCUMENTS: {
    BASE: `${API_BASE_URL}/documents`,
    UPLOAD: `${API_BASE_URL}/documents/upload`,
  },
  FOLDERS: {
    BASE: `${API_BASE_URL}/folders`,
    PERMISSIONS: (id: string) => `${API_BASE_URL}/folders/${id}/permissions`,
  },
  TEMPLATES: {
    BASE: `${API_BASE_URL}/templates`,
  },
  USERS: {
    BASE: `${API_BASE_URL}/users`,
  },
} as const;

// User roles
export const USER_ROLES = {
  ADMINISTRATOR: 'administrator',
  EDITOR: 'editor',
  READ_ONLY: 'read-only',
} as const;

// Content status
export const CONTENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

// File upload limits
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
} as const;

// Notification auto-dismiss time
export const NOTIFICATION_TIMEOUT = 5000;