import Joi from 'joi';

// User validation schemas
export const userCreateSchema = Joi.object({
  id: Joi.string().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  passwordHash: Joi.string().required(),
  role: Joi.string().valid('administrator', 'editor', 'read-only').required(),
  isActive: Joi.boolean().default(true),
});

export const userUpdateSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30),
  email: Joi.string().email(),
  role: Joi.string().valid('administrator', 'editor', 'read-only'),
  isActive: Joi.boolean(),
});

// Content validation schemas
export const contentCreateSchema = Joi.object({
  id: Joi.string().required(),
  title: Joi.string().min(1).max(255).required(),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).required(),
  body: Joi.string().required(),
  templateId: Joi.string().required(),
  authorId: Joi.string().required(),
  status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
  metadata: Joi.object().default({}),
});

export const contentUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(255),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/),
  body: Joi.string(),
  templateId: Joi.string(),
  status: Joi.string().valid('draft', 'published', 'archived'),
  metadata: Joi.object(),
});

// Document validation schemas
export const documentCreateSchema = Joi.object({
  id: Joi.string().required(),
  filename: Joi.string().required(),
  originalName: Joi.string().required(),
  mimeType: Joi.string().required(),
  size: Joi.number().integer().min(0).required(),
  folderId: Joi.string().required(),
  uploadedBy: Joi.string().required(),
  metadata: Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }).default({}),
});

// Folder validation schemas
export const folderCreateSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().min(1).max(255).required(),
  parentId: Joi.string().allow(null),
  isPublic: Joi.boolean().default(false),
  permissions: Joi.object({
    read: Joi.array().items(Joi.string()).default([]),
    write: Joi.array().items(Joi.string()).default([]),
  }).default({ read: [], write: [] }),
  createdBy: Joi.string().required(),
});

export const folderUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  parentId: Joi.string().allow(null),
  isPublic: Joi.boolean(),
  permissions: Joi.object({
    read: Joi.array().items(Joi.string()),
    write: Joi.array().items(Joi.string()),
  }),
});

// Template validation schemas
export const templateCreateSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().required(),
  htmlStructure: Joi.string().required(),
  cssStyles: Joi.string().required(),
  accessibilityFeatures: Joi.object({
    skipLinks: Joi.boolean().default(true),
    headingStructure: Joi.boolean().default(true),
    altTextRequired: Joi.boolean().default(true),
    colorContrastCompliant: Joi.boolean().default(true),
  }).required(),
  contentFields: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      type: Joi.string().valid('text', 'textarea', 'rich-text', 'image', 'link').required(),
      required: Joi.boolean().default(false),
      validation: Joi.object().default({}),
    })
  ).required(),
  isActive: Joi.boolean().default(true),
});

export const templateUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  description: Joi.string(),
  htmlStructure: Joi.string(),
  cssStyles: Joi.string(),
  accessibilityFeatures: Joi.object({
    skipLinks: Joi.boolean(),
    headingStructure: Joi.boolean(),
    altTextRequired: Joi.boolean(),
    colorContrastCompliant: Joi.boolean(),
  }),
  contentFields: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      type: Joi.string().valid('text', 'textarea', 'rich-text', 'image', 'link').required(),
      required: Joi.boolean().default(false),
      validation: Joi.object().default({}),
    })
  ),
  isActive: Joi.boolean(),
});