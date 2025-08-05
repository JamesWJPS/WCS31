import request from 'supertest';
import express from 'express';
import { contentRoutes } from '../../routes';
import { initializeDatabase } from '../../utils/database';
import { UserRepository } from '../../models/UserRepository';
import { ContentRepository } from '../../models/ContentRepository';
import { TemplateRepository } from '../../models/TemplateRepository';
import { JWTUtils } from '../../utils/jwt';
import { PasswordUtils } from '../../utils/password';
import { randomUUID } from 'crypto';

const app = express();
app.use(express.json());
app.use('/api/content', contentRoutes);

describe('Content API Integration Tests', () => {
  let userRepository: UserRepository;
  let contentRepository: ContentRepository;
  let templateRepository: TemplateRepository;
  let adminToken: string;
  let editorToken: string;
  let readOnlyToken: string;
  let adminUserId: string;
  let editorUserId: string;
  let readOnlyUserId: string;
  let templateId: string;
  let contentId: string;

  beforeAll(async () => {
    await initializeDatabase();
    userRepository = new UserRepository();
    contentRepository = new ContentRepository();
    templateRepository = new TemplateRepository();

    // Create test users
    const hashedPassword = await PasswordUtils.hashPassword('testpassword');
    
    adminUserId = randomUUID();
    await userRepository.create({
      id: adminUserId,
      username: 'admin',
      email: 'admin@test.com',
      password_hash: hashedPassword,
      role: 'administrator',
      last_login: null,
      is_active: true,
    });

    editorUserId = randomUUID();
    await userRepository.create({
      id: editorUserId,
      username: 'editor',
      email: 'editor@test.com',
      password_hash: hashedPassword,
      role: 'editor',
      last_login: null,
      is_active: true,
    });

    readOnlyUserId = randomUUID();
    await userRepository.create({
      id: readOnlyUserId,
      username: 'readonly',
      email: 'readonly@test.com',
      password_hash: hashedPassword,
      role: 'read-only',
      last_login: null,
      is_active: true,
    });

    // Create test template
    templateId = randomUUID();
    await templateRepository.create({
      id: templateId,
      name: 'Test Template',
      description: 'A test template',
      html_structure: '<div>{{content}}</div>',
      css_styles: 'div { color: black; }',
      accessibility_features: JSON.stringify({
        skipLinks: true,
        headingStructure: true,
        altTextRequired: true,
        colorContrastCompliant: true,
      }),
      content_fields: JSON.stringify([
        {
          id: 'content',
          name: 'Content',
          type: 'rich-text',
          required: true,
          validation: {},
        },
      ]),
      is_active: true,
    });

    // Generate tokens
    adminToken = JWTUtils.generateAccessToken({ id: adminUserId, username: 'admin', role: 'administrator' });
    editorToken = JWTUtils.generateAccessToken({ id: editorUserId, username: 'editor', role: 'editor' });
    readOnlyToken = JWTUtils.generateAccessToken({ id: readOnlyUserId, username: 'readonly', role: 'read-only' });
  });

  afterAll(async () => {
    // Clean up test data
    if (contentId) {
      await contentRepository.delete(contentId);
    }
    await templateRepository.delete(templateId);
    await userRepository.delete(adminUserId);
    await userRepository.delete(editorUserId);
    await userRepository.delete(readOnlyUserId);
  });

  describe('POST /api/content', () => {
    it('should create content as admin', async () => {
      const contentData = {
        title: 'Test Content',
        body: 'This is test content',
        templateId,
        metadata: { tags: ['test'] },
        status: 'draft',
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(contentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(contentData.title);
      expect(response.body.data.slug).toBe('test-content');
      expect(response.body.data.status).toBe('draft');
      
      contentId = response.body.data.id;
    });

    it('should create content as editor', async () => {
      const contentData = {
        title: 'Editor Content',
        body: 'This is editor content',
        templateId,
        metadata: { tags: ['editor'] },
        status: 'published',
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(contentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(contentData.title);
      expect(response.body.data.status).toBe('published');
      expect(response.body.data.publishedAt).toBeTruthy();

      // Clean up
      await contentRepository.delete(response.body.data.id);
    });

    it('should not allow read-only user to create content', async () => {
      const contentData = {
        title: 'Readonly Content',
        body: 'This should not be created',
        templateId,
      };

      await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send(contentData)
        .expect(403);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_FIELDS');
    });

    it('should validate template exists', async () => {
      const contentData = {
        title: 'Invalid Template Content',
        body: 'This has invalid template',
        templateId: 'invalid-template-id',
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(contentData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TEMPLATE');
    });

    it('should prevent duplicate slugs', async () => {
      const contentData = {
        title: 'Test Content', // Same title as first test
        body: 'This should fail due to duplicate slug',
        templateId,
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(contentData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SLUG_EXISTS');
    });
  });

  describe('GET /api/content', () => {
    it('should get content list as admin', async () => {
      const response = await request(app)
        .get('/api/content')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter content by status', async () => {
      const response = await request(app)
        .get('/api/content?status=draft')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.content.forEach((content: any) => {
        expect(content.status).toBe('draft');
      });
    });

    it('should search content by query', async () => {
      const response = await request(app)
        .get('/api/content?query=test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should find our test content
      expect(response.body.data.content.length).toBeGreaterThan(0);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/content?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should filter content for non-admin users', async () => {
      const response = await request(app)
        .get('/api/content')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Editor should only see their own content or published content
      response.body.data.content.forEach((content: any) => {
        expect(
          content.authorId === editorUserId || content.status === 'published'
        ).toBe(true);
      });
    });
  });

  describe('GET /api/content/:id', () => {
    it('should get content by ID as admin', async () => {
      const response = await request(app)
        .get(`/api/content/${contentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(contentId);
      expect(response.body.data.title).toBe('Test Content');
    });

    it('should get own content as editor', async () => {
      // Create content as editor first
      const editorContent = await contentRepository.create({
        id: randomUUID(),
        title: 'Editor Own Content',
        slug: 'editor-own-content',
        body: 'Editor content',
        template_id: templateId,
        author_id: editorUserId,
        status: 'draft',
        metadata: JSON.stringify({}),
        published_at: null,
      });

      const response = await request(app)
        .get(`/api/content/${editorContent.id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(editorContent.id);

      // Clean up
      await contentRepository.delete(editorContent.id);
    });

    it('should not allow editor to access other users draft content', async () => {
      const response = await request(app)
        .get(`/api/content/${contentId}`) // Admin's draft content
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should return 404 for non-existent content', async () => {
      const response = await request(app)
        .get('/api/content/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONTENT_NOT_FOUND');
    });
  });

  describe('GET /api/content/public/:slug', () => {
    it('should get published content by slug without authentication', async () => {
      // First publish the content
      await contentRepository.publish(contentId);

      const response = await request(app)
        .get('/api/content/public/test-content')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe('test-content');
      expect(response.body.data.status).toBe('published');
    });

    it('should not return draft content for public access', async () => {
      // Unpublish the content
      await contentRepository.unpublish(contentId);

      const response = await request(app)
        .get('/api/content/public/test-content')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONTENT_NOT_FOUND');
    });
  });

  describe('PUT /api/content/:id', () => {
    it('should update content as admin', async () => {
      const updateData = {
        title: 'Updated Test Content',
        body: 'This content has been updated',
        metadata: { tags: ['updated', 'test'] },
      };

      const response = await request(app)
        .put(`/api/content/${contentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.body).toBe(updateData.body);
      expect(response.body.data.slug).toBe('updated-test-content');
    });

    it('should not allow read-only user to update content', async () => {
      await request(app)
        .put(`/api/content/${contentId}`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ title: 'Should not update' })
        .expect(403);
    });

    it('should not allow editor to update other users content', async () => {
      const response = await request(app)
        .put(`/api/content/${contentId}`) // Admin's content
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Should not update' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('POST /api/content/:id/publish', () => {
    it('should publish content as admin', async () => {
      const response = await request(app)
        .post(`/api/content/${contentId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('published');
      expect(response.body.data.publishedAt).toBeTruthy();
    });

    it('should not allow read-only user to publish content', async () => {
      await request(app)
        .post(`/api/content/${contentId}/publish`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .expect(403);
    });
  });

  describe('POST /api/content/:id/unpublish', () => {
    it('should unpublish content as admin', async () => {
      const response = await request(app)
        .post(`/api/content/${contentId}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('draft');
      expect(response.body.data.publishedAt).toBeNull();
    });
  });

  describe('POST /api/content/:id/archive', () => {
    it('should archive content as admin', async () => {
      const response = await request(app)
        .post(`/api/content/${contentId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('archived');
    });
  });

  describe('GET /api/content/:id/preview', () => {
    it('should get content preview as admin', async () => {
      const response = await request(app)
        .get(`/api/content/${contentId}/preview`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBeDefined();
      expect(response.body.data.preview).toBeDefined();
      expect(response.body.data.preview.title).toBeTruthy();
    });
  });

  describe('GET /api/content/:id/versions', () => {
    it('should get content versions as admin', async () => {
      const response = await request(app)
        .get(`/api/content/${contentId}/versions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should not allow read-only user to view versions', async () => {
      await request(app)
        .get(`/api/content/${contentId}/versions`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .expect(403);
    });
  });

  describe('POST /api/content/:id/restore', () => {
    it('should restore content version as admin', async () => {
      // First create a version by updating published content
      await contentRepository.publish(contentId);
      await contentRepository.update(contentId, { title: 'Version Test' });

      const response = await request(app)
        .post(`/api/content/${contentId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ version: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should validate version number', async () => {
      const response = await request(app)
        .post(`/api/content/${contentId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_VERSION');
    });
  });

  describe('DELETE /api/content/:id', () => {
    it('should delete content as admin', async () => {
      const response = await request(app)
        .delete(`/api/content/${contentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify content is deleted
      const deletedContent = await contentRepository.findById(contentId);
      expect(deletedContent).toBeNull();
      
      // Clear contentId so cleanup doesn't try to delete it again
      contentId = '';
    });

    it('should not allow read-only user to delete content', async () => {
      // Create content to delete
      const testContent = await contentRepository.create({
        id: randomUUID(),
        title: 'Delete Test',
        slug: 'delete-test',
        body: 'To be deleted',
        template_id: templateId,
        author_id: adminUserId,
        status: 'draft',
        metadata: JSON.stringify({}),
        published_at: null,
      });

      await request(app)
        .delete(`/api/content/${testContent.id}`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .expect(403);

      // Clean up
      await contentRepository.delete(testContent.id);
    });
  });

  describe('Authentication', () => {
    it('should require authentication for protected endpoints', async () => {
      await request(app)
        .get('/api/content')
        .expect(401);

      await request(app)
        .post('/api/content')
        .send({ title: 'Test' })
        .expect(401);
    });

    it('should reject invalid tokens', async () => {
      await request(app)
        .get('/api/content')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});