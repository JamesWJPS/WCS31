import {
  userCreateSchema,
  userUpdateSchema,
  contentCreateSchema,
  documentCreateSchema,
  folderCreateSchema,
  templateCreateSchema,
} from '../../models/validation';

describe('Validation Schemas', () => {
  describe('User Validation', () => {
    describe('userCreateSchema', () => {
      it('should validate valid user creation data', () => {
        const validUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          passwordHash: 'hashedpassword123',
          role: 'editor',
          isActive: true,
        };

        const { error } = userCreateSchema.validate(validUser);
        expect(error).toBeUndefined();
      });

      it('should reject invalid email', () => {
        const invalidUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'invalid-email',
          passwordHash: 'hashedpassword123',
          role: 'editor',
        };

        const { error } = userCreateSchema.validate(invalidUser);
        expect(error).toBeDefined();
        expect(error?.details[0]?.path).toContain('email');
      });

      it('should reject invalid role', () => {
        const invalidUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          passwordHash: 'hashedpassword123',
          role: 'invalid-role',
        };

        const { error } = userCreateSchema.validate(invalidUser);
        expect(error).toBeDefined();
        expect(error?.details[0]?.path).toContain('role');
      });

      it('should reject short username', () => {
        const invalidUser = {
          id: 'user-123',
          username: 'ab', // Too short
          email: 'test@example.com',
          passwordHash: 'hashedpassword123',
          role: 'editor',
        };

        const { error } = userCreateSchema.validate(invalidUser);
        expect(error).toBeDefined();
        expect(error?.details[0]?.path).toContain('username');
      });
    });

    describe('userUpdateSchema', () => {
      it('should validate partial user update', () => {
        const updateData = {
          role: 'administrator',
          isActive: false,
        };

        const { error } = userUpdateSchema.validate(updateData);
        expect(error).toBeUndefined();
      });

      it('should allow empty update object', () => {
        const { error } = userUpdateSchema.validate({});
        expect(error).toBeUndefined();
      });
    });
  });

  describe('Content Validation', () => {
    describe('contentCreateSchema', () => {
      it('should validate valid content creation data', () => {
        const validContent = {
          id: 'content-123',
          title: 'Test Article',
          slug: 'test-article',
          body: 'This is the content body',
          templateId: 'template-123',
          authorId: 'user-123',
          status: 'draft',
          metadata: { tags: ['test'] },
        };

        const { error } = contentCreateSchema.validate(validContent);
        expect(error).toBeUndefined();
      });

      it('should reject invalid slug format', () => {
        const invalidContent = {
          id: 'content-123',
          title: 'Test Article',
          slug: 'Test Article!', // Invalid characters
          body: 'This is the content body',
          templateId: 'template-123',
          authorId: 'user-123',
        };

        const { error } = contentCreateSchema.validate(invalidContent);
        expect(error).toBeDefined();
        expect(error?.details[0]?.path).toContain('slug');
      });

      it('should set default status to draft', () => {
        const content = {
          id: 'content-123',
          title: 'Test Article',
          slug: 'test-article',
          body: 'This is the content body',
          templateId: 'template-123',
          authorId: 'user-123',
        };

        const { value } = contentCreateSchema.validate(content);
        expect(value.status).toBe('draft');
      });
    });
  });

  describe('Document Validation', () => {
    describe('documentCreateSchema', () => {
      it('should validate valid document creation data', () => {
        const validDocument = {
          id: 'doc-123',
          filename: 'document.pdf',
          originalName: 'My Document.pdf',
          mimeType: 'application/pdf',
          size: 1024000,
          folderId: 'folder-123',
          uploadedBy: 'user-123',
          metadata: {
            title: 'Important Document',
            description: 'This is an important document',
            tags: ['important', 'council'],
          },
        };

        const { error } = documentCreateSchema.validate(validDocument);
        expect(error).toBeUndefined();
      });

      it('should reject negative file size', () => {
        const invalidDocument = {
          id: 'doc-123',
          filename: 'document.pdf',
          originalName: 'My Document.pdf',
          mimeType: 'application/pdf',
          size: -100, // Negative size
          folderId: 'folder-123',
          uploadedBy: 'user-123',
        };

        const { error } = documentCreateSchema.validate(invalidDocument);
        expect(error).toBeDefined();
        expect(error?.details[0]?.path).toContain('size');
      });
    });
  });

  describe('Folder Validation', () => {
    describe('folderCreateSchema', () => {
      it('should validate valid folder creation data', () => {
        const validFolder = {
          id: 'folder-123',
          name: 'Public Documents',
          parentId: null,
          isPublic: true,
          permissions: {
            read: ['user-1', 'user-2'],
            write: ['user-1'],
          },
          createdBy: 'user-123',
        };

        const { error } = folderCreateSchema.validate(validFolder);
        expect(error).toBeUndefined();
      });

      it('should set default values', () => {
        const folder = {
          id: 'folder-123',
          name: 'Test Folder',
          createdBy: 'user-123',
        };

        const { value } = folderCreateSchema.validate(folder);
        expect(value.isPublic).toBe(false);
        expect(value.permissions).toEqual({ read: [], write: [] });
      });
    });
  });

  describe('Template Validation', () => {
    describe('templateCreateSchema', () => {
      it('should validate valid template creation data', () => {
        const validTemplate = {
          id: 'template-123',
          name: 'Article Template',
          description: 'Template for news articles',
          htmlStructure: '<article><h1>{{title}}</h1><div>{{content}}</div></article>',
          cssStyles: 'article { margin: 20px; }',
          accessibilityFeatures: {
            skipLinks: true,
            headingStructure: true,
            altTextRequired: true,
            colorContrastCompliant: true,
          },
          contentFields: [
            {
              id: 'field-1',
              name: 'title',
              type: 'text',
              required: true,
              validation: { maxLength: 100 },
            },
            {
              id: 'field-2',
              name: 'content',
              type: 'rich-text',
              required: true,
              validation: {},
            },
          ],
          isActive: true,
        };

        const { error } = templateCreateSchema.validate(validTemplate);
        expect(error).toBeUndefined();
      });

      it('should reject invalid field type', () => {
        const invalidTemplate = {
          id: 'template-123',
          name: 'Article Template',
          description: 'Template for news articles',
          htmlStructure: '<article></article>',
          // Missing cssStyles - required field
          accessibilityFeatures: {
            skipLinks: true,
            headingStructure: true,
            altTextRequired: true,
            colorContrastCompliant: true,
          },
          contentFields: [
            {
              id: 'field-1',
              name: 'title',
              type: 'text',
              required: true,
              validation: {},
            },
          ],
        };

        const { error } = templateCreateSchema.validate(invalidTemplate);
        expect(error).toBeDefined();
        expect(error?.details[0]?.path).toContain('cssStyles');
      });
    });
  });
});