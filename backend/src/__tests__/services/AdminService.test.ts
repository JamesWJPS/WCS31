import { AdminService } from '../../services/AdminService';
import { UserRepository } from '../../models/UserRepository';
import { ContentRepository } from '../../models/ContentRepository';
import { DocumentRepository } from '../../models/DocumentRepository';
import { FolderRepository } from '../../models/FolderRepository';
import { TemplateRepository } from '../../models/TemplateRepository';
import { db } from '../../utils/database';

// Mock the repositories
jest.mock('../../models/UserRepository');
jest.mock('../../models/ContentRepository');
jest.mock('../../models/DocumentRepository');
jest.mock('../../models/FolderRepository');
jest.mock('../../models/TemplateRepository');
jest.mock('../../utils/database', () => ({
  db: {
    query: jest.fn()
  }
}));

describe('AdminService', () => {
  let adminService: AdminService;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockContentRepo: jest.Mocked<ContentRepository>;
  let mockDocumentRepo: jest.Mocked<DocumentRepository>;
  let mockFolderRepo: jest.Mocked<FolderRepository>;
  let mockTemplateRepo: jest.Mocked<TemplateRepository>;
  let mockDb: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create service instance
    adminService = new AdminService();

    // Get mocked repository instances
    mockUserRepo = UserRepository.prototype as jest.Mocked<UserRepository>;
    mockContentRepo = ContentRepository.prototype as jest.Mocked<ContentRepository>;
    mockDocumentRepo = DocumentRepository.prototype as jest.Mocked<DocumentRepository>;
    mockFolderRepo = FolderRepository.prototype as jest.Mocked<FolderRepository>;
    mockTemplateRepo = TemplateRepository.prototype as jest.Mocked<TemplateRepository>;

    // Mock database connection
    mockDb = db as jest.Mocked<typeof db>;
  });

  describe('getSystemOverview', () => {
    it('should return comprehensive system overview', async () => {
      // Mock repository data
      const mockUsers = [
        { id: '1', role: 'administrator', isActive: true },
        { id: '2', role: 'editor', isActive: true },
        { id: '3', role: 'read-only', isActive: false }
      ];

      const mockContent = [
        { id: '1', status: 'published' },
        { id: '2', status: 'draft' },
        { id: '3', status: 'published' }
      ];

      const mockDocuments = [
        { id: '1', filename: 'doc1.pdf', size: 1024 },
        { id: '2', filename: 'doc2.docx', size: 2048 }
      ];

      const mockFolders = [
        { id: '1', isPublic: true },
        { id: '2', isPublic: false }
      ];

      const mockTemplates = [
        { id: '1', isActive: true },
        { id: '2', isActive: false }
      ];

      mockUserRepo.findAll.mockResolvedValue(mockUsers as any);
      mockContentRepo.findAll.mockResolvedValue(mockContent as any);
      mockDocumentRepo.findAll.mockResolvedValue(mockDocuments as any);
      mockFolderRepo.findAll.mockResolvedValue(mockFolders as any);
      mockTemplateRepo.findAll.mockResolvedValue(mockTemplates as any);

      const result = await adminService.getSystemOverview();

      expect(result).toEqual({
        users: {
          total: 3,
          active: 2,
          byRole: {
            administrator: 1,
            editor: 1,
            'read-only': 1
          }
        },
        content: {
          total: 3,
          published: 2,
          drafts: 1
        },
        documents: {
          total: 2,
          totalSize: 3072,
          byType: {
            pdf: 1,
            docx: 1
          }
        },
        folders: {
          total: 2,
          public: 1,
          private: 1
        },
        templates: {
          total: 2,
          active: 1
        },
        system: {
          uptime: expect.any(Number),
          version: expect.any(String),
          environment: expect.any(String)
        }
      });

      expect(mockUserRepo.findAll).toHaveBeenCalledTimes(1);
      expect(mockContentRepo.findAll).toHaveBeenCalledTimes(1);
      expect(mockDocumentRepo.findAll).toHaveBeenCalledTimes(1);
      expect(mockFolderRepo.findAll).toHaveBeenCalledTimes(1);
      expect(mockTemplateRepo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDatabaseStats', () => {
    it('should return database statistics', async () => {
      const mockTableStats = [
        { name: 'users', rowCount: 10, size: 1.5, lastUpdated: new Date() },
        { name: 'content', rowCount: 25, size: 3.2, lastUpdated: new Date() }
      ];

      const mockConnectionStats = [
        { Variable_name: 'Threads_running', Value: '5' },
        { Variable_name: 'Threads_cached', Value: '2' },
        { Variable_name: 'Threads_connected', Value: '7' }
      ];

      const mockSlowQueryStats = [{ Value: '3' }];
      const mockQueryStats = [{ Value: '1000' }];

      mockDb.query
        .mockResolvedValueOnce(mockTableStats)
        .mockResolvedValueOnce(mockConnectionStats)
        .mockResolvedValueOnce(mockSlowQueryStats)
        .mockResolvedValueOnce(mockQueryStats);

      const result = await adminService.getDatabaseStats();

      expect(result).toEqual({
        tables: [
          { name: 'users', rowCount: 10, size: '1.5 MB', lastUpdated: expect.any(Date) },
          { name: 'content', rowCount: 25, size: '3.2 MB', lastUpdated: expect.any(Date) }
        ],
        connections: {
          active: 5,
          idle: 2,
          total: 7
        },
        performance: {
          slowQueries: 3,
          avgQueryTime: 0,
          cacheHitRatio: 95
        }
      });

      expect(mockDb.query).toHaveBeenCalledTimes(4);
    });
  });

  describe('runMaintenanceTasks', () => {
    it('should run optimize_tables task successfully', async () => {
      mockDb.query.mockResolvedValue({ affectedRows: 5 });

      const result = await adminService.runMaintenanceTasks(['optimize_tables']);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        task: 'optimize_tables',
        success: true,
        message: 'Optimized 5 tables',
        affectedRows: 5,
        duration: expect.any(Number)
      });
    });

    it('should run cleanup_logs task successfully', async () => {
      mockDb.query.mockResolvedValue({ affectedRows: 100 });

      const result = await adminService.runMaintenanceTasks(['cleanup_logs']);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        task: 'cleanup_logs',
        success: true,
        message: 'Cleaned up old log entries',
        affectedRows: 100,
        duration: expect.any(Number)
      });
    });

    it('should handle unknown maintenance task', async () => {
      const result = await adminService.runMaintenanceTasks(['unknown_task']);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        task: 'unknown_task',
        success: false,
        message: 'Unknown maintenance task: unknown_task',
        duration: expect.any(Number)
      });
    });

    it('should handle task execution errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      const result = await adminService.runMaintenanceTasks(['optimize_tables']);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        task: 'optimize_tables',
        success: false,
        message: 'Error executing optimize_tables: Database connection failed',
        duration: expect.any(Number)
      });
    });

    it('should run multiple tasks', async () => {
      mockDb.query.mockResolvedValue({ affectedRows: 1 });

      const result = await adminService.runMaintenanceTasks(['optimize_tables', 'cleanup_logs', 'rebuild_indexes']);

      expect(result).toHaveLength(3);
      expect(result.every(r => r.success)).toBe(true);
    });
  });

  describe('exportData', () => {
    it('should export data in JSON format', async () => {
      const mockUserData = [
        { id: '1', username: 'admin', email: 'admin@test.com' }
      ];
      const mockContentData = [
        { id: '1', title: 'Test Content', status: 'published' }
      ];

      mockDb.query
        .mockResolvedValueOnce(mockUserData)
        .mockResolvedValueOnce(mockContentData);

      const result = await adminService.exportData(['users', 'content'], 'json');

      expect(result).toBeInstanceOf(Buffer);
      
      const exportedData = JSON.parse(result.toString());
      expect(exportedData).toEqual({
        users: mockUserData,
        content: mockContentData
      });
    });

    it('should export data in CSV format', async () => {
      const mockUserData = [
        { id: '1', username: 'admin', email: 'admin@test.com' },
        { id: '2', username: 'editor', email: 'editor@test.com' }
      ];

      mockDb.query.mockResolvedValue(mockUserData);

      const result = await adminService.exportData(['users'], 'csv');

      expect(result).toBeInstanceOf(Buffer);
      
      const csvContent = result.toString();
      expect(csvContent).toContain('=== users ===');
      expect(csvContent).toContain('id,username,email');
      expect(csvContent).toContain('"1","admin","admin@test.com"');
      expect(csvContent).toContain('"2","editor","editor@test.com"');
    });

    it('should handle export errors gracefully', async () => {
      mockDb.query
        .mockResolvedValueOnce([{ id: '1', username: 'admin' }])
        .mockRejectedValueOnce(new Error('Table not found'));

      const result = await adminService.exportData(['users', 'invalid_table'], 'json');

      const exportedData = JSON.parse(result.toString());
      expect(exportedData.users).toEqual([{ id: '1', username: 'admin' }]);
      expect(exportedData.invalid_table).toEqual({ error: 'Failed to export invalid_table' });
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        adminService.exportData(['users'], 'xml')
      ).rejects.toThrow('Unsupported export format: xml');
    });
  });
});