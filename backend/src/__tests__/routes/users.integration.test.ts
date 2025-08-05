import request from 'supertest';
import express from 'express';
import userRoutes from '../../routes/users';
import { initializeDatabase } from '../../utils/database';
import { UserRepository } from '../../models/UserRepository';
import { PasswordUtils } from '../../utils/password';
import { JWTUtils } from '../../utils/jwt';
import { User } from '../../models/interfaces';

// Test app setup
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  return app;
};

describe('User Routes Integration Tests', () => {
  let app: express.Application;
  let userRepository: UserRepository;
  let adminToken: string;
  let editorToken: string;
  let adminUser: User;
  let editorUser: User;

  beforeAll(async () => {
    // Initialize test database
    await initializeDatabase();
    
    app = createTestApp();
    userRepository = new UserRepository();

    // Create test users
    const adminPasswordHash = await PasswordUtils.hashPassword('AdminPass123!');
    const editorPasswordHash = await PasswordUtils.hashPassword('EditorPass123!');

    adminUser = await userRepository.create({
      id: 'admin-test-id',
      username: 'testadmin',
      email: 'admin@test.com',
      password_hash: adminPasswordHash,
      role: 'administrator',
      is_active: true,
      last_login: null
    });

    editorUser = await userRepository.create({
      id: 'editor-test-id',
      username: 'testeditor',
      email: 'editor@test.com',
      password_hash: editorPasswordHash,
      role: 'editor',
      is_active: true,
      last_login: null
    });

    // Generate tokens
    adminToken = JWTUtils.generateAccessToken(adminUser);
    editorToken = JWTUtils.generateAccessToken(editorUser);
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await userRepository.delete(adminUser.id);
      await userRepository.delete(editorUser.id);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('GET /api/users', () => {
    it('should return paginated list of users for admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('totalPages');
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'testadmin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support role filtering', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ role: 'administrator' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by ID for admin', async () => {
      const response = await request(app)
        .get(`/api/users/${editorUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(editorUser.id);
      expect(response.body.data.username).toBe('testeditor');
      expect(response.body.data).not.toHaveProperty('passwordHash');
    });

    it('should allow users to access their own profile', async () => {
      const response = await request(app)
        .get(`/api/users/${editorUser.id}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(editorUser.id);
    });

    it('should deny access for non-admin accessing other user', async () => {
      const response = await request(app)
        .get(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/users', () => {
    let createdUserId: string;

    afterEach(async () => {
      // Clean up created user
      if (createdUserId) {
        try {
          await userRepository.delete(createdUserId);
        } catch (error) {
          // Ignore cleanup errors
        }
        createdUserId = '';
      }
    });

    it('should create new user for admin', async () => {
      const newUser = {
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'NewUserPass123!',
        role: 'editor'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('newuser');
      expect(response.body.data.email).toBe('newuser@test.com');
      expect(response.body.data.role).toBe('editor');
      expect(response.body.data).not.toHaveProperty('passwordHash');

      createdUserId = response.body.data.id;
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          username: 'unauthorized',
          email: 'unauthorized@test.com',
          password: 'Pass123!',
          role: 'editor'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'incomplete'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should prevent duplicate usernames', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'testadmin', // Already exists
          email: 'duplicate@test.com',
          password: 'Pass123!',
          role: 'editor'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USERNAME_EXISTS');
    });
  });

  describe('PUT /api/users/:id', () => {
    let testUserId: string;

    beforeEach(async () => {
      // Create a test user for updating
      const testUser = await userRepository.create({
        id: 'update-test-id',
        username: 'updatetest',
        email: 'updatetest@test.com',
        password_hash: await PasswordUtils.hashPassword('TestPass123!'),
        role: 'editor',
        is_active: true,
        last_login: null
      });
      testUserId = testUser.id;
    });

    afterEach(async () => {
      // Clean up test user
      try {
        await userRepository.delete(testUserId);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should update user for admin', async () => {
      const updateData = {
        username: 'updateduser',
        email: 'updated@test.com',
        role: 'administrator',
        isActive: false
      };

      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('updateduser');
      expect(response.body.data.email).toBe('updated@test.com');
      expect(response.body.data.role).toBe('administrator');
      expect(response.body.data.isActive).toBe(false);
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ username: 'hacker' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/users/:id/profile', () => {
    it('should allow users to update their own profile', async () => {
      const profileData = {
        username: 'updatedusername',
        email: 'updatedemail@test.com'
      };

      const response = await request(app)
        .patch(`/api/users/${editorUser.id}/profile`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send(profileData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('updatedusername');
      expect(response.body.data.email).toBe('updatedemail@test.com');

      // Restore original data
      await userRepository.update(editorUser.id, {
        username: 'testeditor',
        email: 'editor@test.com',
        updated_at: new Date()
      });
    });

    it('should allow admin to update any user profile', async () => {
      const profileData = {
        username: 'adminupdated',
        email: 'adminupdated@test.com'
      };

      const response = await request(app)
        .patch(`/api/users/${editorUser.id}/profile`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(profileData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Restore original data
      await userRepository.update(editorUser.id, {
        username: 'testeditor',
        email: 'editor@test.com',
        updated_at: new Date()
      });
    });

    it('should deny access for non-admin updating other user', async () => {
      const response = await request(app)
        .patch(`/api/users/${adminUser.id}/profile`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ username: 'hacker' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/users/:id/password', () => {
    it('should allow users to change their own password', async () => {
      const passwordData = {
        currentPassword: 'EditorPass123!',
        newPassword: 'NewEditorPass123!'
      };

      const response = await request(app)
        .patch(`/api/users/${editorUser.id}/password`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send(passwordData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Password changed successfully');

      // Restore original password
      const originalHash = await PasswordUtils.hashPassword('EditorPass123!');
      await userRepository.update(editorUser.id, {
        password_hash: originalHash,
        updated_at: new Date()
      });
    });

    it('should reject incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword',
        newPassword: 'NewEditorPass123!'
      };

      const response = await request(app)
        .patch(`/api/users/${editorUser.id}/password`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send(passwordData);

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('should validate new password strength', async () => {
      const passwordData = {
        currentPassword: 'EditorPass123!',
        newPassword: 'weak'
      };

      const response = await request(app)
        .patch(`/api/users/${editorUser.id}/password`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send(passwordData);

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WEAK_PASSWORD');
    });
  });

  describe('DELETE /api/users/:id', () => {
    let testUserId: string;

    beforeEach(async () => {
      // Create a test user for deletion
      const testUser = await userRepository.create({
        id: 'delete-test-id',
        username: 'deletetest',
        email: 'deletetest@test.com',
        password_hash: await PasswordUtils.hashPassword('TestPass123!'),
        role: 'editor',
        is_active: true,
        last_login: null
      });
      testUserId = testUser.id;
    });

    it('should delete user for admin', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('User deleted successfully');

      // Verify user is deleted
      const deletedUser = await userRepository.findById(testUserId);
      expect(deletedUser).toBeNull();
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Clean up
      await userRepository.delete(testUserId);
    });
  });

  describe('PATCH /api/users/:id/activate', () => {
    let testUserId: string;

    beforeEach(async () => {
      // Create an inactive test user
      const testUser = await userRepository.create({
        id: 'activate-test-id',
        username: 'activatetest',
        email: 'activatetest@test.com',
        password_hash: await PasswordUtils.hashPassword('TestPass123!'),
        role: 'editor',
        is_active: false,
        last_login: null
      });
      testUserId = testUser.id;
    });

    afterEach(async () => {
      // Clean up test user
      try {
        await userRepository.delete(testUserId);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should activate user for admin', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUserId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(true);
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUserId}/activate`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/users/:id/deactivate', () => {
    let testUserId: string;

    beforeEach(async () => {
      // Create an active test user
      const testUser = await userRepository.create({
        id: 'deactivate-test-id',
        username: 'deactivatetest',
        email: 'deactivatetest@test.com',
        password_hash: await PasswordUtils.hashPassword('TestPass123!'),
        role: 'editor',
        is_active: true,
        last_login: null
      });
      testUserId = testUser.id;
    });

    afterEach(async () => {
      // Clean up test user
      try {
        await userRepository.delete(testUserId);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should deactivate user for admin', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUserId}/deactivate`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});