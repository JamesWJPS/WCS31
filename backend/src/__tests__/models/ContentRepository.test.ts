import { ContentRepository } from '../../models/ContentRepository';
import { UserRepository } from '../../models/UserRepository';
import { TemplateRepository } from '../../models/TemplateRepository';
import { Content } from '../../models/interfaces';
import db from '../../config/database';

describe('ContentRepository', () => {
  let contentRepository: ContentRepository;
  let userRepository: UserRepository;
  let templateRepository: TemplateRepository;
  let testContent: Content;
  let testUserId: string;
  let testTemplateId: string;

  beforeAll(async () => {
    await db.migrate.latest();
    contentRepository = new ContentRepository();
    userRepository = new UserRepository();
    templateRepository = new TemplateRepository();
  });

  beforeEach(async () => {
    // Clean up before each test
    await db('content').del();
    await db('users').del();
    await db('templates').del();

    // Create test user
    testUserId = 'test-user-1';
    await userRepository.create({
      id: testUserId,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword123',
      role: 'editor',
      is_active: true,
      last_login: null,
    });

    // Create test template
    testTemplateId = 'test-template-1';
    await templateRepository.create({
      id: testTemplateId,
      name: 'Test Template',
      description: 'A test template',
      html_structure: '<article>{{content}}</article>',
      css_styles: 'article { margin: 10px; }',
      accessibility_features: JSON.stringify({
        skipLinks: true,
        headingStructure: true,
        altTextRequired: true,
        colorContrastCompliant: true,
      }),
      content_fields: JSON.stringify([]),
      is_active: true,
    });

    testContent = {
      id: 'test-content-1',
      title: 'Test Article',
      slug: 'test-article',
      body: 'This is test content',
      templateId: testTemplateId,
      authorId: testUserId,
      status: 'draft',
      metadata: { tags: ['test'] },
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: null,
    };
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('create', () => {
    it('should create new content', async () => {
      const created = await contentRepository.create({
        id: testContent.id,
        title: testContent.title,
        slug: testContent.slug,
        body: testContent.body,
        template_id: testContent.templateId,
        author_id: testContent.authorId,
        status: testContent.status,
        metadata: JSON.stringify(testContent.metadata),
        published_at: testContent.publishedAt,
      });

      expect(created.id).toBe(testContent.id);
      expect(created.title).toBe(testContent.title);
      expect(created.slug).toBe(testContent.slug);
      expect(created.status).toBe('draft');
      expect(created.metadata).toEqual({ tags: ['test'] });
    });

    it('should enforce unique slug constraint', async () => {
      await contentRepository.create({
        id: testContent.id,
        title: testContent.title,
        slug: testContent.slug,
        body: testContent.body,
        template_id: testContent.templateId,
        author_id: testContent.authorId,
        status: testContent.status,
        metadata: JSON.stringify(testContent.metadata),
        published_at: testContent.publishedAt,
      });

      await expect(contentRepository.create({
        id: 'test-content-2',
        title: 'Another Article',
        slug: testContent.slug, // Same slug
        body: 'Different content',
        template_id: testContent.templateId,
        author_id: testContent.authorId,
        status: 'draft',
        metadata: JSON.stringify({}),
        published_at: null,
      })).rejects.toThrow();
    });
  });

  describe('findBySlug', () => {
    it('should find content by slug', async () => {
      await contentRepository.create({
        id: testContent.id,
        title: testContent.title,
        slug: testContent.slug,
        body: testContent.body,
        template_id: testContent.templateId,
        author_id: testContent.authorId,
        status: testContent.status,
        metadata: JSON.stringify(testContent.metadata),
        published_at: testContent.publishedAt,
      });

      const found = await contentRepository.findBySlug(testContent.slug);
      expect(found).not.toBeNull();
      expect(found!.slug).toBe(testContent.slug);
      expect(found!.title).toBe(testContent.title);
    });

    it('should return null for non-existent slug', async () => {
      const found = await contentRepository.findBySlug('non-existent-slug');
      expect(found).toBeNull();
    });
  });

  describe('findByAuthor', () => {
    it('should find content by author', async () => {
      await contentRepository.create({
        id: testContent.id,
        title: testContent.title,
        slug: testContent.slug,
        body: testContent.body,
        template_id: testContent.templateId,
        author_id: testContent.authorId,
        status: testContent.status,
        metadata: JSON.stringify(testContent.metadata),
        published_at: testContent.publishedAt,
      });

      const found = await contentRepository.findByAuthor(testUserId);
      expect(found).toHaveLength(1);
      expect(found[0]?.authorId).toBe(testUserId);
    });
  });

  describe('findByStatus', () => {
    it('should find content by status', async () => {
      await contentRepository.create({
        id: testContent.id,
        title: testContent.title,
        slug: testContent.slug,
        body: testContent.body,
        template_id: testContent.templateId,
        author_id: testContent.authorId,
        status: 'published',
        metadata: JSON.stringify(testContent.metadata),
        published_at: new Date(),
      });

      const published = await contentRepository.findByStatus('published');
      const drafts = await contentRepository.findByStatus('draft');

      expect(published).toHaveLength(1);
      expect(published[0]?.status).toBe('published');
      expect(drafts).toHaveLength(0);
    });
  });

  describe('publish', () => {
    it('should publish content and set published date', async () => {
      await contentRepository.create({
        id: testContent.id,
        title: testContent.title,
        slug: testContent.slug,
        body: testContent.body,
        template_id: testContent.templateId,
        author_id: testContent.authorId,
        status: 'draft',
        metadata: JSON.stringify(testContent.metadata),
        published_at: null,
      });

      const published = await contentRepository.publish(testContent.id);
      
      expect(published).not.toBeNull();
      expect(published!.status).toBe('published');
      expect(published!.publishedAt).not.toBeNull();
      expect(published!.publishedAt).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('should update content fields', async () => {
      await contentRepository.create({
        id: testContent.id,
        title: testContent.title,
        slug: testContent.slug,
        body: testContent.body,
        template_id: testContent.templateId,
        author_id: testContent.authorId,
        status: testContent.status,
        metadata: JSON.stringify(testContent.metadata),
        published_at: testContent.publishedAt,
      });

      const updated = await contentRepository.update(testContent.id, {
        title: 'Updated Title',
        body: 'Updated content body',
        status: 'published',
      });

      expect(updated!.title).toBe('Updated Title');
      expect(updated!.body).toBe('Updated content body');
      expect(updated!.status).toBe('published');
    });
  });
});