import request from 'supertest';
import express from 'express';
import { adminRoutes } from '../../routes/admin';
// Mock auth middleware will be defined inline
import { AdminService } from '../../services/AdminService';
import { SystemMonitoringService } from '../../services/SystemMonitoringService';
import { DataIntegrityService } from '../../services/DataIntegrityService';

// Mock the services
jest.mock('../../services/AdminService');
jest.mock('../../services/SystemMonitoringService');
jest.mock('../../services/DataIntegrityService');

// Mock auth middleware
const mockAuth = (req: any, _res: any, next: any) => {
  req.user = { id: 'admin-user', role: 'administrator', isDeveloper: true };
  next();
};

describe('Admin Routes Integration', () => {
  let app: express.Application;
  let mockAdminService: jest.Mocked<AdminService>;
  let mockMonitoringService: jest.Mocked<SystemMonitoringService>;
  let mockDataIntegrityService: jest.Mocked<DataIntegrityService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(mockAuth);
    app.use('/api/admin', adminRoutes);

    // Get mocked instances
    mockAdminService = AdminService.prototype as jest.Mocked<AdminService>;
    mockMonitoringService = SystemMonitoringService.prototype as jest.Mocked<SystemMonitoringService>;
    mockDataIntegrityService = DataIntegrityService.prototype as jest.Mocked<DataIntegrityService>;

    // Global error handler
    app.use((error: any, _req: any, res: any, _next: any) => {
      res.status(error.statusCode || 500).json({
        success: false,
        error: { message: error.message }
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Developer Access Control', () => {
    it('should allow access when user is developer', async () => {
      const mockOverview = {
        users: { total: 10, active: 8, byRole: {} },
        content: { total: 25, published: 20, drafts: 5 },
        documents: { total: 50, totalSize: 1024000, byType: {} },
        folders: { total: 15, public: 10, private: 5 },
        templates: { total: 5, active: 4 },
        system: { uptime: 3600, version: '1.0.0', environment: 'test' }
      };

      mockAdminService.getSystemOverview.mockResolvedValue(mockOverview);

      const response = await request(app)
        .get('/api/admin/system/overview')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockOverview);
    });

    it('should deny access when user is not developer in production', async () => {
      // Mock non-developer user
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'production';

      // Create new app with modified auth
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'regular-user', role: 'editor', isDeveloper: false };
        next();
      });
      testApp.use('/api/admin', adminRoutes);

      const response = await request(testApp)
        .get('/api/admin/system/overview')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'DEVELOPER_ACCESS_REQUIRED',
          message: 'This endpoint requires developer access',
          timestamp: expect.any(String)
        }
      });

      process.env['NODE_ENV'] = originalEnv;
    });
  });

  describe('System Overview Endpoint', () => {
    it('should return system overview', async () => {
      const mockOverview = {
        users: { total: 100, active: 85, byRole: { administrator: 5, editor: 70, 'read-only': 25 } },
        content: { total: 500, published: 450, drafts: 50 },
        documents: { total: 1000, totalSize: 50000000, byType: { pdf: 600, docx: 300, jpg: 100 } },
        folders: { total: 50, public: 30, private: 20 },
        templates: { total: 10, active: 8 },
        system: { uptime: 86400, version: '1.2.0', environment: 'production' }
      };

      mockAdminService.getSystemOverview.mockResolvedValue(mockOverview);

      const response = await request(app)
        .get('/api/admin/system/overview')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockOverview
      });
    });
  });

  describe('System Logs Endpoint', () => {
    it('should return system logs with pagination', async () => {
      const mockLogs = {
        logs: [
          {
            id: 'log1',
            level: 'info' as const,
            message: 'System started',
            timestamp: new Date(),
            source: 'system'
          },
          {
            id: 'log2',
            level: 'error' as const,
            message: 'Database connection failed',
            timestamp: new Date(),
            source: 'database'
          }
        ],
        total: 2,
        page: 1,
        totalPages: 1
      };

      mockMonitoringService.getLogs.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/api/admin/system/logs?level=error&page=1&limit=10')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockLogs
      });

      expect(mockMonitoringService.getLogs).toHaveBeenCalledWith({
        level: 'error',
        page: 1,
        limit: 10
      });
    });
  });

  describe('Database Stats Endpoint', () => {
    it('should return database statistics', async () => {
      const mockStats = {
        tables: [
          { name: 'users', rowCount: 100, size: '5.2 MB', lastUpdated: new Date() },
          { name: 'content', rowCount: 500, size: '15.8 MB', lastUpdated: new Date() }
        ],
        connections: { active: 10, idle: 5, total: 15 },
        performance: { slowQueries: 2, avgQueryTime: 45, cacheHitRatio: 98 }
      };

      mockAdminService.getDatabaseStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/admin/database/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats
      });
    });
  });

  describe('Database Maintenance Endpoint', () => {
    it('should run maintenance tasks', async () => {
      const tasks = ['optimize_tables', 'cleanup_logs', 'rebuild_indexes'];
      const mockResults = [
        { task: 'optimize_tables', success: true, message: 'Optimized 5 tables', duration: 2000 },
        { task: 'cleanup_logs', success: true, message: 'Cleaned up 150 old entries', duration: 1500 },
        { task: 'rebuild_indexes', success: true, message: 'Rebuilt indexes for 5 tables', duration: 3000 }
      ];

      mockAdminService.runMaintenanceTasks.mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/admin/database/maintenance')
        .send({ tasks })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResults
      });

      expect(mockAdminService.runMaintenanceTasks).toHaveBeenCalledWith(tasks);
    });
  });

  describe('Data Integrity Endpoints', () => {
    it('should run integrity check', async () => {
      const mockResults = {
        totalIssues: 5,
        issuesBySeverity: { low: 1, medium: 2, high: 2, critical: 0 },
        issuesByType: { orphaned_record: 3, invalid_data: 2 },
        issues: [
          {
            id: 'issue1',
            type: 'orphaned_record' as const,
            severity: 'medium' as const,
            table: 'content',
            recordId: 'content1',
            description: 'Content has invalid author reference',
            details: { authorId: 'missing-user' },
            autoRepairable: true,
            detectedAt: new Date()
          }
        ],
        checkDuration: 2500,
        lastCheck: new Date()
      };

      mockDataIntegrityService.runIntegrityCheck.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/admin/integrity/check')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResults
      });
    });

    it('should repair integrity issues', async () => {
      const issueIds = ['issue1', 'issue2'];
      const mockResults = [
        { issueId: 'issue1', success: true, message: 'Repaired successfully', affectedRecords: 1 },
        { issueId: 'issue2', success: false, message: 'Could not repair automatically' }
      ];

      mockDataIntegrityService.repairIssues.mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/admin/integrity/repair')
        .send({ issueIds })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResults
      });

      expect(mockDataIntegrityService.repairIssues).toHaveBeenCalledWith(issueIds);
    });
  });

  describe('Performance Monitoring Endpoints', () => {
    it('should return performance metrics', async () => {
      const mockMetrics = {
        cpu: { usage: 35.2, loadAverage: [1.5, 1.3, 1.2] },
        memory: { used: 750000000, total: 2048000000, percentage: 36.6 },
        database: { connections: 12, queryTime: 48, slowQueries: 1 },
        requests: { total: 5000, errors: 25, avgResponseTime: 125 },
        uptime: 172800
      };

      mockMonitoringService.getPerformanceMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/admin/monitoring/performance?timeRange=24h')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMetrics
      });

      expect(mockMonitoringService.getPerformanceMetrics).toHaveBeenCalledWith('24h');
    });

    it('should return error analysis', async () => {
      const mockAnalysis = {
        totalErrors: 50,
        errorsByType: { auth: 20, database: 15, validation: 10, network: 5 },
        errorsByEndpoint: { '/api/login': 20, '/api/content': 15, '/api/documents': 10 },
        errorTrends: [
          { date: '2023-01-01', count: 25 },
          { date: '2023-01-02', count: 25 }
        ],
        topErrors: [
          { message: 'Invalid credentials', count: 20, lastOccurred: new Date() },
          { message: 'Database timeout', count: 15, lastOccurred: new Date() }
        ]
      };

      mockMonitoringService.getErrorAnalysis.mockResolvedValue(mockAnalysis);

      const response = await request(app)
        .get('/api/admin/monitoring/errors?timeRange=7d')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAnalysis
      });

      expect(mockMonitoringService.getErrorAnalysis).toHaveBeenCalledWith('7d');
    });
  });

  describe('Log Management Endpoint', () => {
    it('should clear old logs', async () => {
      const beforeDate = '2023-01-01T00:00:00.000Z';
      const deletedCount = 250;

      mockMonitoringService.clearLogsBeforeDate.mockResolvedValue(deletedCount);

      const response = await request(app)
        .delete('/api/admin/logs/cleanup')
        .send({ beforeDate })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { deletedCount }
      });

      expect(mockMonitoringService.clearLogsBeforeDate).toHaveBeenCalledWith(new Date(beforeDate));
    });
  });

  describe('Data Export Endpoint', () => {
    it('should export system data in JSON format', async () => {
      const tables = ['users', 'content', 'documents'];
      const mockExportData = Buffer.from(JSON.stringify({
        users: [{ id: '1', username: 'admin' }],
        content: [{ id: '1', title: 'Test Content' }],
        documents: [{ id: '1', filename: 'test.pdf' }]
      }));

      mockAdminService.exportData.mockResolvedValue(mockExportData);

      const response = await request(app)
        .post('/api/admin/export')
        .send({ tables, format: 'json' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename=system-export-\d+\.json/);
      expect(mockAdminService.exportData).toHaveBeenCalledWith(tables, 'json');
    });

    it('should export system data in CSV format', async () => {
      const tables = ['users'];
      const mockExportData = Buffer.from(`
=== users ===
id,username,email
"1","admin","admin@test.com"
"2","editor","editor@test.com"
      `.trim());

      mockAdminService.exportData.mockResolvedValue(mockExportData);

      const response = await request(app)
        .post('/api/admin/export')
        .send({ tables, format: 'csv' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename=system-export-\d+\.csv/);
      expect(mockAdminService.exportData).toHaveBeenCalledWith(tables, 'csv');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockAdminService.getSystemOverview.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .get('/api/admin/system/overview')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Failed to get system overview');
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .delete('/api/admin/logs/cleanup')
        .send({}) // Missing beforeDate
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Before date is required');
    });

    it('should validate array parameters', async () => {
      const response = await request(app)
        .post('/api/admin/integrity/repair')
        .send({ issueIds: 'not-an-array' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Issue IDs must be provided as an array');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle concurrent requests', async () => {
      const mockOverview = { 
        users: { total: 10, active: 8, byRole: {} }, 
        content: { total: 20, published: 15, drafts: 5 }, 
        documents: { total: 30, totalSize: 1024000, byType: {} }, 
        folders: { total: 5, public: 3, private: 2 }, 
        templates: { total: 3, active: 2 }, 
        system: { uptime: 3600, version: '1.0.0', environment: 'test' } 
      };
      const mockLogs = { logs: [], total: 0, page: 1, totalPages: 0 };
      const mockStats = { tables: [], connections: { active: 0, idle: 0, total: 0 }, performance: { slowQueries: 0, avgQueryTime: 0, cacheHitRatio: 0 } };

      mockAdminService.getSystemOverview.mockResolvedValue(mockOverview);
      mockMonitoringService.getLogs.mockResolvedValue(mockLogs);
      mockAdminService.getDatabaseStats.mockResolvedValue(mockStats);

      const requests = [
        request(app).get('/api/admin/system/overview'),
        request(app).get('/api/admin/system/logs'),
        request(app).get('/api/admin/database/stats')
      ];

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle large data exports', async () => {
      const largeData = Buffer.alloc(1024 * 1024, 'test data'); // 1MB of test data
      mockAdminService.exportData.mockResolvedValue(largeData);

      const response = await request(app)
        .post('/api/admin/export')
        .send({ tables: ['users', 'content'], format: 'json' })
        .expect(200);

      expect(response.body.length).toBeGreaterThan(1000000);
    });
  });
});