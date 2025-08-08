import request from 'supertest';
import express from 'express';
import { AdminController } from '../../controllers/AdminController';
import { AdminService } from '../../services/AdminService';
import { SystemMonitoringService } from '../../services/SystemMonitoringService';
import { DataIntegrityService } from '../../services/DataIntegrityService';
import { auth } from '../../middleware/auth';

// Mock the services
jest.mock('../../services/AdminService');
jest.mock('../../services/SystemMonitoringService');
jest.mock('../../services/DataIntegrityService');

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  auth: (req: any, res: any, next: any) => {
    req.user = { id: 'admin-user', role: 'administrator', isDeveloper: true };
    next();
  }
}));

describe('AdminController', () => {
  let app: express.Application;
  let adminController: AdminController;
  let mockAdminService: jest.Mocked<AdminService>;
  let mockMonitoringService: jest.Mocked<SystemMonitoringService>;
  let mockDataIntegrityService: jest.Mocked<DataIntegrityService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(auth);
    
    adminController = new AdminController();
    
    // Get mocked instances
    mockAdminService = AdminService.prototype as jest.Mocked<AdminService>;
    mockMonitoringService = SystemMonitoringService.prototype as jest.Mocked<SystemMonitoringService>;
    mockDataIntegrityService = DataIntegrityService.prototype as jest.Mocked<DataIntegrityService>;

    // Setup routes
    app.get('/admin/system/overview', (req, res, next) => {
      adminController.getSystemOverview(req, res).catch(next);
    });
    
    app.get('/admin/system/logs', (req, res, next) => {
      adminController.getSystemLogs(req, res).catch(next);
    });
    
    app.get('/admin/database/stats', (req, res, next) => {
      adminController.getDatabaseStats(req, res).catch(next);
    });
    
    app.get('/admin/integrity/check', (req, res, next) => {
      adminController.runDataIntegrityCheck(req, res).catch(next);
    });
    
    app.post('/admin/integrity/repair', (req, res, next) => {
      adminController.repairDataIntegrity(req, res).catch(next);
    });
    
    app.get('/admin/monitoring/performance', (req, res, next) => {
      adminController.getPerformanceMetrics(req, res).catch(next);
    });
    
    app.delete('/admin/logs/cleanup', (req, res, next) => {
      adminController.clearOldLogs(req, res).catch(next);
    });
    
    app.post('/admin/database/maintenance', (req, res, next) => {
      adminController.runDatabaseMaintenance(req, res).catch(next);
    });
    
    app.get('/admin/monitoring/errors', (req, res, next) => {
      adminController.getErrorAnalysis(req, res).catch(next);
    });
    
    app.post('/admin/export', (req, res, next) => {
      adminController.exportSystemData(req, res).catch(next);
    });

    // Error handler
    app.use((error: any, req: any, res: any, next: any) => {
      res.status(error.statusCode || 500).json({
        success: false,
        error: { message: error.message }
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /admin/system/overview', () => {
    it('should return system overview successfully', async () => {
      const mockOverview = {
        users: { total: 10, active: 8, byRole: { administrator: 2, editor: 6, 'read-only': 2 } },
        content: { total: 25, published: 20, drafts: 5 },
        documents: { total: 50, totalSize: 1024000, byType: { pdf: 30, docx: 20 } },
        folders: { total: 15, public: 10, private: 5 },
        templates: { total: 5, active: 4 },
        system: { uptime: 3600, version: '1.0.0', environment: 'test' }
      };

      mockAdminService.getSystemOverview.mockResolvedValue(mockOverview);

      const response = await request(app)
        .get('/admin/system/overview')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockOverview
      });
      expect(mockAdminService.getSystemOverview).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when getting system overview', async () => {
      mockAdminService.getSystemOverview.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/admin/system/overview')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Failed to get system overview');
    });
  });

  describe('GET /admin/system/logs', () => {
    it('should return system logs with default parameters', async () => {
      const mockLogs = {
        logs: [
          {
            id: 'log1',
            level: 'info' as const,
            message: 'Test log',
            timestamp: new Date(),
            source: 'test'
          }
        ],
        total: 1,
        page: 1,
        totalPages: 1
      };

      mockMonitoringService.getLogs.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/admin/system/logs')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockLogs
      });
      expect(mockMonitoringService.getLogs).toHaveBeenCalledWith({
        page: 1,
        limit: 50
      });
    });

    it('should return system logs with custom parameters', async () => {
      const mockLogs = {
        logs: [],
        total: 0,
        page: 2,
        totalPages: 0
      };

      mockMonitoringService.getLogs.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/admin/system/logs?level=error&page=2&limit=25&startDate=2023-01-01&endDate=2023-12-31')
        .expect(200);

      expect(mockMonitoringService.getLogs).toHaveBeenCalledWith({
        level: 'error',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        page: 2,
        limit: 25
      });
    });
  });

  describe('GET /admin/database/stats', () => {
    it('should return database statistics', async () => {
      const mockStats = {
        tables: [
          { name: 'users', rowCount: 10, size: '1.5 MB', lastUpdated: new Date() }
        ],
        connections: { active: 5, idle: 2, total: 7 },
        performance: { slowQueries: 0, avgQueryTime: 50, cacheHitRatio: 95 }
      };

      mockAdminService.getDatabaseStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/admin/database/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats
      });
    });
  });

  describe('GET /admin/integrity/check', () => {
    it('should run data integrity check', async () => {
      const mockResults = {
        totalIssues: 2,
        issuesBySeverity: { medium: 1, high: 1 },
        issuesByType: { orphaned_record: 2 },
        issues: [
          {
            id: 'issue1',
            type: 'orphaned_record' as const,
            severity: 'medium' as const,
            table: 'content',
            recordId: 'content1',
            description: 'Orphaned content',
            details: {},
            autoRepairable: true,
            detectedAt: new Date()
          }
        ],
        checkDuration: 1000,
        lastCheck: new Date()
      };

      mockDataIntegrityService.runIntegrityCheck.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/admin/integrity/check')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResults
      });
    });
  });

  describe('POST /admin/integrity/repair', () => {
    it('should repair data integrity issues', async () => {
      const issueIds = ['issue1', 'issue2'];
      const mockResults = [
        { issueId: 'issue1', success: true, message: 'Repaired successfully' },
        { issueId: 'issue2', success: false, message: 'Could not repair' }
      ];

      mockDataIntegrityService.repairIssues.mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/admin/integrity/repair')
        .send({ issueIds })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResults
      });
      expect(mockDataIntegrityService.repairIssues).toHaveBeenCalledWith(issueIds);
    });

    it('should return error for invalid issue IDs format', async () => {
      const response = await request(app)
        .post('/admin/integrity/repair')
        .send({ issueIds: 'not-an-array' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Issue IDs must be provided as an array');
    });
  });

  describe('GET /admin/monitoring/performance', () => {
    it('should return performance metrics with default time range', async () => {
      const mockMetrics = {
        cpu: { usage: 25.5, loadAverage: [1.2, 1.1, 1.0] },
        memory: { used: 512000000, total: 1024000000, percentage: 50 },
        database: { connections: 5, queryTime: 45, slowQueries: 0 },
        requests: { total: 1000, errors: 5, avgResponseTime: 120 },
        uptime: 3600
      };

      mockMonitoringService.getPerformanceMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/admin/monitoring/performance')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMetrics
      });
      expect(mockMonitoringService.getPerformanceMetrics).toHaveBeenCalledWith('1h');
    });

    it('should return performance metrics with custom time range', async () => {
      const mockMetrics = {
        cpu: { usage: 30.2, loadAverage: [1.5, 1.3, 1.2] },
        memory: { used: 600000000, total: 1024000000, percentage: 58.6 },
        database: { connections: 8, queryTime: 52, slowQueries: 1 },
        requests: { total: 5000, errors: 25, avgResponseTime: 135 },
        uptime: 86400
      };

      mockMonitoringService.getPerformanceMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/admin/monitoring/performance?timeRange=24h')
        .expect(200);

      expect(mockMonitoringService.getPerformanceMetrics).toHaveBeenCalledWith('24h');
    });
  });

  describe('DELETE /admin/logs/cleanup', () => {
    it('should clear old logs successfully', async () => {
      const beforeDate = '2023-01-01T00:00:00.000Z';
      const deletedCount = 150;

      mockMonitoringService.clearLogsBeforeDate.mockResolvedValue(deletedCount);

      const response = await request(app)
        .delete('/admin/logs/cleanup')
        .send({ beforeDate })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { deletedCount }
      });
      expect(mockMonitoringService.clearLogsBeforeDate).toHaveBeenCalledWith(new Date(beforeDate));
    });

    it('should return error when beforeDate is missing', async () => {
      const response = await request(app)
        .delete('/admin/logs/cleanup')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Before date is required');
    });
  });

  describe('POST /admin/database/maintenance', () => {
    it('should run database maintenance tasks', async () => {
      const tasks = ['optimize_tables', 'cleanup_logs'];
      const mockResults = [
        { task: 'optimize_tables', success: true, message: 'Optimized 5 tables', duration: 2000 },
        { task: 'cleanup_logs', success: true, message: 'Cleaned up old logs', duration: 1500 }
      ];

      mockAdminService.runMaintenanceTasks.mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/admin/database/maintenance')
        .send({ tasks })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResults
      });
      expect(mockAdminService.runMaintenanceTasks).toHaveBeenCalledWith(tasks);
    });
  });

  describe('GET /admin/monitoring/errors', () => {
    it('should return error analysis with default time range', async () => {
      const mockAnalysis = {
        totalErrors: 10,
        errorsByType: { 'auth': 5, 'database': 3, 'validation': 2 },
        errorsByEndpoint: { '/api/login': 5, '/api/content': 3 },
        errorTrends: [
          { date: '2023-01-01', count: 5 },
          { date: '2023-01-02', count: 5 }
        ],
        topErrors: [
          { message: 'Invalid credentials', count: 5, lastOccurred: new Date() }
        ]
      };

      mockMonitoringService.getErrorAnalysis.mockResolvedValue(mockAnalysis);

      const response = await request(app)
        .get('/admin/monitoring/errors')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAnalysis
      });
      expect(mockMonitoringService.getErrorAnalysis).toHaveBeenCalledWith('24h');
    });
  });

  describe('POST /admin/export', () => {
    it('should export system data in JSON format', async () => {
      const tables = ['users', 'content'];
      const mockExportData = Buffer.from(JSON.stringify({ users: [], content: [] }));

      mockAdminService.exportData.mockResolvedValue(mockExportData);

      const response = await request(app)
        .post('/admin/export')
        .send({ tables, format: 'json' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename=system-export-\d+\.json/);
      expect(mockAdminService.exportData).toHaveBeenCalledWith(tables, 'json');
    });

    it('should export system data in CSV format', async () => {
      const tables = ['users'];
      const mockExportData = Buffer.from('id,username,email\n1,admin,admin@test.com');

      mockAdminService.exportData.mockResolvedValue(mockExportData);

      const response = await request(app)
        .post('/admin/export')
        .send({ tables, format: 'csv' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename=system-export-\d+\.csv/);
      expect(mockAdminService.exportData).toHaveBeenCalledWith(tables, 'csv');
    });
  });

  // Simple test to ensure the test suite runs
  describe('AdminController instantiation', () => {
    it('should create AdminController instance', () => {
      expect(adminController).toBeDefined();
      expect(adminController).toBeInstanceOf(AdminController);
    });
  });
});