import { UserRepository } from '../../models/UserRepository';
import { User } from '../../models/interfaces';
import db from '../../config/database';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let testUser: User;

  beforeAll(async () => {
    // Use in-memory database for testing
    await db.migrate.latest();
    userRepository = new UserRepository();
  });

  beforeEach(async () => {
    // Clean up before each test
    await db('users').del();
    
    testUser = {
      id: 'test-user-1',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword123',
      role: 'editor',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
      isActive: true,
    };
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const created = await userRepository.create({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        password_hash: testUser.passwordHash,
        role: testUser.role,
        is_active: testUser.isActive,
        last_login: testUser.lastLogin,
      });

      expect(created.id).toBe(testUser.id);
      expect(created.username).toBe(testUser.username);
      expect(created.email).toBe(testUser.email);
      expect(created.role).toBe(testUser.role);
      expect(created.isActive).toBe(true);
    });

    it('should throw error for duplicate username', async () => {
      await userRepository.create({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        password_hash: testUser.passwordHash,
        role: testUser.role,
        is_active: testUser.isActive,
        last_login: testUser.lastLogin,
      });

      await expect(userRepository.create({
        id: 'test-user-2',
        username: testUser.username, // Same username
        email: 'different@example.com',
        password_hash: testUser.passwordHash,
        role: testUser.role,
        is_active: testUser.isActive,
        last_login: testUser.lastLogin,
      })).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      await userRepository.create({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        password_hash: testUser.passwordHash,
        role: testUser.role,
        is_active: testUser.isActive,
        last_login: testUser.lastLogin,
      });

      const found = await userRepository.findById(testUser.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(testUser.id);
      expect(found!.username).toBe(testUser.username);
    });

    it('should return null for non-existent user', async () => {
      const found = await userRepository.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      await userRepository.create({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        password_hash: testUser.passwordHash,
        role: testUser.role,
        is_active: testUser.isActive,
        last_login: testUser.lastLogin,
      });

      const found = await userRepository.findByUsername(testUser.username);
      expect(found).not.toBeNull();
      expect(found!.username).toBe(testUser.username);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      await userRepository.create({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        password_hash: testUser.passwordHash,
        role: testUser.role,
        is_active: testUser.isActive,
        last_login: testUser.lastLogin,
      });

      const found = await userRepository.findByEmail(testUser.email);
      expect(found).not.toBeNull();
      expect(found!.email).toBe(testUser.email);
    });
  });

  describe('findByRole', () => {
    it('should find users by role', async () => {
      await userRepository.create({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        password_hash: testUser.passwordHash,
        role: testUser.role,
        is_active: testUser.isActive,
        last_login: testUser.lastLogin,
      });

      await userRepository.create({
        id: 'test-user-2',
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hashedpassword456',
        role: 'administrator',
        is_active: true,
        last_login: null,
      });

      const editors = await userRepository.findByRole('editor');
      const admins = await userRepository.findByRole('administrator');

      expect(editors).toHaveLength(1);
      expect(editors[0]?.role).toBe('editor');
      expect(admins).toHaveLength(1);
      expect(admins[0]?.role).toBe('administrator');
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      await userRepository.create({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        password_hash: testUser.passwordHash,
        role: testUser.role,
        is_active: testUser.isActive,
        last_login: testUser.lastLogin,
      });

      await userRepository.updateLastLogin(testUser.id);
      const updated = await userRepository.findById(testUser.id);
      
      expect(updated!.lastLogin).not.toBeNull();
      expect(updated!.lastLogin).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      await userRepository.create({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        password_hash: testUser.passwordHash,
        role: testUser.role,
        is_active: testUser.isActive,
        last_login: testUser.lastLogin,
      });

      const updated = await userRepository.update(testUser.id, {
        role: 'administrator',
        is_active: false,
      });

      expect(updated!.role).toBe('administrator');
      expect(updated!.isActive).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      await userRepository.create({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        password_hash: testUser.passwordHash,
        role: testUser.role,
        is_active: testUser.isActive,
        last_login: testUser.lastLogin,
      });

      const deleted = await userRepository.delete(testUser.id);
      expect(deleted).toBe(true);

      const found = await userRepository.findById(testUser.id);
      expect(found).toBeNull();
    });
  });
});