import { initializeDatabase, closeDatabase } from '../../utils/database';
import db from '../../config/database';
import fs from 'fs';
import path from 'path';

describe('Database Utilities', () => {
  const testDbPath = path.join(__dirname, '../../../test-data/test.db');
  
  beforeAll(() => {
    // Set test database path
    process.env['DATABASE_PATH'] = testDbPath;
  });

  afterAll(async () => {
    await closeDatabase();
    // Clean up test database file
    const testDataDir = path.dirname(testDbPath);
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('initializeDatabase', () => {
    it('should create database directory if it does not exist', async () => {
      const testDataDir = path.dirname(testDbPath);
      
      // Ensure directory doesn't exist
      if (fs.existsSync(testDataDir)) {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      }

      await initializeDatabase();

      expect(fs.existsSync(testDataDir)).toBe(true);
    });

    it('should run migrations successfully', async () => {
      await initializeDatabase();

      // Check if tables exist
      const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table'");
      const tableNames = tables.map((table: any) => table.name);

      expect(tableNames).toContain('users');
      expect(tableNames).toContain('templates');
      expect(tableNames).toContain('content');
      expect(tableNames).toContain('folders');
      expect(tableNames).toContain('documents');
    });

    it('should create tables with correct schema', async () => {
      await initializeDatabase();

      // Test users table schema
      const usersInfo = await db.raw("PRAGMA table_info(users)");
      const userColumns = usersInfo.map((col: any) => col.name);
      
      expect(userColumns).toContain('id');
      expect(userColumns).toContain('username');
      expect(userColumns).toContain('email');
      expect(userColumns).toContain('password_hash');
      expect(userColumns).toContain('role');
      expect(userColumns).toContain('created_at');
      expect(userColumns).toContain('updated_at');
      expect(userColumns).toContain('last_login');
      expect(userColumns).toContain('is_active');

      // Test content table schema
      const contentInfo = await db.raw("PRAGMA table_info(content)");
      const contentColumns = contentInfo.map((col: any) => col.name);
      
      expect(contentColumns).toContain('id');
      expect(contentColumns).toContain('title');
      expect(contentColumns).toContain('slug');
      expect(contentColumns).toContain('body');
      expect(contentColumns).toContain('template_id');
      expect(contentColumns).toContain('author_id');
      expect(contentColumns).toContain('status');
      expect(contentColumns).toContain('metadata');
    });

    it('should handle foreign key constraints', async () => {
      await initializeDatabase();

      // Check foreign key constraints exist
      const foreignKeys = await db.raw("PRAGMA foreign_key_list(content)");
      expect(foreignKeys.length).toBeGreaterThan(0);
      
      const templateFk = foreignKeys.find((fk: any) => fk.table === 'templates');
      const userFk = foreignKeys.find((fk: any) => fk.table === 'users');
      
      expect(templateFk).toBeDefined();
      expect(userFk).toBeDefined();
    });
  });

  describe('closeDatabase', () => {
    it('should close database connection', async () => {
      await initializeDatabase();
      await closeDatabase();
      
      // Attempting to use db after closing should throw an error
      await expect(db.raw('SELECT 1')).rejects.toThrow();
    });
  });
});