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
    await db('content_versions').del();
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

  describe('archive', () => {
    it('should archive content', async () => {
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

      const archived = await contentRepository.archive(testContent.id);
      
      expect(archived).not.toBeNull();
      expect(archived!.status).toBe('archived');
    });
  });

  describe('unpublish', () => {
    it('should unpublish content and clear published date', async () => {
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

      const unpublished = await contentRepository.unpublish(testContent.id);
      
      expect(unpublished).not.toBeNull();
      expect(unpublished!.status).toBe('draft');
      expect(unpublished!.publishedAt).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // Create multiple test content items
      await contentRepository.create({
        id: 'content-1',
        title: 'First Article',
        slug: 'first-article',
        body: 'This is the first article about testing',
        template_id: testTemplateId,
        author_id: testUserId,
        status: 'published',
        metadata: JSON.stringify({ tags: ['test', 'first'] }),
        published_at: new Date(),
      });

      await contentRepository.create({
        id: 'content-2',
        title: 'Second Article',
        slug: 'second-article',
        body: 'This is the second article about development',
        template_id: testTemplateId,
        author_id: testUserId,
        status: 'draft',
        metadata: JSON.stringify({ tags: ['development', 'second'] }),
        published_at: null,
      });

      await contentRepository.create({
        id: 'content-3',
        title: 'Third Article',
        slug: 'third-article',
        body: 'This is the third article about production',
        template_id: testTemplateId,
        author_id: testUserId,
        status: 'archived',
        metadata: JSON.stringify({ tags: ['production'] }),
        published_at: null,
      });
    });

    it('should search by text query in title and body', async () => {
      const result = await contentRepository.search({ query: 'first' });
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.title).toBe('First Article');
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      const publishedResult = await contentRepository.search({ status: 'published' });
      const draftResult = await contentRepository.search({ status: 'draft' });
      
      expect(publishedResult.content).toHaveLength(1);
      expect(publishedResult.content[0]?.status).toBe('published');
      expect(draftResult.content).toHaveLength(1);
      expect(draftResult.content[0]?.status).toBe('draft');
    });

    it('should filter by author', async () => {
      const result = await contentRepository.search({ authorId: testUserId });
      
      expect(result.content).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should filter by template', async () => {
      const result = await contentRepository.search({ templateId: testTemplateId });
      
      expect(result.content).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should search by tags in metadata', async () => {
      const result = await contentRepository.search({ tags: ['test'] });
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.title).toBe('First Article');
    });

    it('should apply pagination', async () => {
      const result = await contentRepository.search({ limit: 2, offset: 1 });
      
      expect(result.content).toHaveLength(2);
      expect(result.total).toBe(3);
    });

    it('should sort results', async () => {
      const result = await contentRepository.search({ 
        sortBy: 'title', 
        sortOrder: 'asc' 
      });
      
      expect(result.content).toHaveLength(3);
      expect(result.content[0]?.title).toBe('First Article');
      expect(result.content[1]?.title).toBe('Second Article');
      expect(result.content[2]?.title).toBe('Third Article');
    });

    it('should filter by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await contentRepository.search({ 
        dateFrom: yesterday,
        dateTo: tomorrow 
      });
      
      expect(result.content).toHaveLength(3);
      expect(result.total).toBe(3);
    });
  });

  describe('versioning', () => {
    beforeEach(async () => {
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
    });

    it('should create a version of content', async () => {
      const version = await contentRepository.createVersion(testContent.id, testUserId);
      
      expect(version).not.toBeNull();
      expect(version!.contentId).toBe(testContent.id);
      expect(version!.version).toBe(1);
      expect(version!.title).toBe(testContent.title);
      expect(version!.body).toBe(testContent.body);
      expect(version!.createdBy).toBe(testUserId);
    });

    it('should increment version numbers', async () => {
      const version1 = await contentRepository.createVersion(testContent.id, testUserId);
      const version2 = await contentRepository.createVersion(testContent.id, testUserId);
      
      expect(version1!.version).toBe(1);
      expect(version2!.version).toBe(2);
    });

    it('should get all versions for content', async () => {
      await contentRepository.createVersion(testContent.id, testUserId);
      await contentRepository.createVersion(testContent.id, testUserId);
      
      const versions = await contentRepository.getVersions(testContent.id);
      
      expect(versions).toHaveLength(2);
      expect(versions[0]?.version).toBe(2); // Most recent first
      expect(versions[1]?.version).toBe(1);
    });

    it('should restore content from a version', async () => {
      // Create initial version
      await contentRepository.createVersion(testContent.id, testUserId);
      
      // Update content
      await contentRepository.update(testContent.id, {
        title: 'Updated Title',
        body: 'Updated Body',
      });
      
      // Restore from version 1
      const restored = await contentRepository.restoreVersion(testContent.id, 1, testUserId);
      
      expect(restored).not.toBeNull();
      expect(restored!.title).toBe(testContent.title);
      expect(restored!.body).toBe(testContent.body);
      
      // Should have created a new version during restore
      const versions = await contentRepository.getVersions(testContent.id);
      expect(versions).toHaveLength(2); // Original + backup before restore
    });

    it('should return null when creating version for non-existent content', async () => {
      const version = await contentRepository.createVersion('non-existent', testUserId);
      expect(version).toBeNull();
    });

    it('should return null when restoring non-existent version', async () => {
      const restored = await contentRepository.restoreVersion(testContent.id, 999, testUserId);
      expect(restored).toBeNull();
    });
  });
});