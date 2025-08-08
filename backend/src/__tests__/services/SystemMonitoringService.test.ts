import { SystemMonitoringService } from '../../services/SystemMonitoringService';
import { db } from '../../utils/database';
import fs from 'fs/promises';
import path from 'path';

// Mock dependencies
jest.mock('../../utils/database', () => ({
  db: {
    query: jest.fn()
  }
}));
jest.mock('fs/promises');
jest.mock('path');

describe('SystemMonitoringService', () => {
  let monitoringService: SystemMonitoringService;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    monitoringService = new SystemMonitoringService();
    
    mockDb = db as jest.Mocked<typeof db>;
    
    // Mock fs operations
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.appendFile as jest.Mock).mockResolvedValue(undefined);
    
    // Mock path operations
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
  });

  describe('getLogs', () => {
    it('should return logs with default filters', async () => {
      const mockLogs = [
        {
          id: 'log1',
          level: 'info',
          message: 'Test message',
          metadata: null,
          source: 'system',
          user_id: null,
          request_id: null,
          created_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce(mockLogs);

      const result = await monitoringService.getLogs({
        page: 1,
        limit: 50
      });

      expect(result).toEqual({
        logs: [{
          id: 'log1',
          level: 'info',
          message: 'Test message',
          metadata: undefined,
          timestamp: expect.any(Date),
          source: 'system',
          userId: null,
          requestId: null
        }],
        total: 1,
        page: 1,
        totalPages: 1
      });

      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should apply filters correctly', async () => {
      mockDb.query
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      const filter = {
        level: 'error',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        source: 'auth',
        userId: 'user123',
        page: 2,
        limit: 25
      };

      await monitoringService.getLogs(filter);

      // Check that the query was called with proper WHERE clauses
      const countQuery = mockDb.query.mock.calls[0][0];
      const dataQuery = mockDb.query.mock.calls[1][0];
      
      expect(countQuery).toContain('AND level = ?');
      expect(countQuery).toContain('AND created_at >= ?');
      expect(countQuery).toContain('AND created_at <= ?');
      expect(countQuery).toContain('AND source = ?');
      expect(countQuery).toContain('AND user_id = ?');
      
      expect(dataQuery).toContain('LIMIT ? OFFSET ?');
      
      // Check parameters
      const countParams = mockDb.query.mock.calls[0][1];
      const dataParams = mockDb.query.mock.calls[1][1];
      
      expect(countParams).toEqual(['error', new Date('2023-01-01'), new Date('2023-12-31'), 'auth', 'user123']);
      expect(dataParams).toEqual(['error', new Date('2023-01-01'), new Date('2023-12-31'), 'auth', 'user123', 25, 25]);
    });

    it('should handle logs with metadata', async () => {
      const mockLogs = [
        {
          id: 'log1',
          level: 'error',
          message: 'Error occurred',
          metadata: '{"error": "Database connection failed"}',
          source: 'database',
          user_id: 'user123',
          request_id: 'req456',
          created_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce(mockLogs);

      const result = await monitoringService.getLogs({ page: 1, limit: 50 });

      expect(result.logs[0].metadata).toEqual({ error: 'Database connection failed' });
      expect(result.logs[0].userId).toBe('user123');
      expect(result.logs[0].requestId).toBe('req456');
    });
  });

  describe('log', () => {
    it('should log system event to database and file', async () => {
      mockDb.query.mockResolvedValue(undefined);

      await monitoringService.log('info', 'Test message', { key: 'value' }, 'test', 'user123', 'req456');

      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO system_logs (id, level, message, metadata, source, user_id, request_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        expect.arrayContaining([
          expect.stringMatching(/^log_\d+_[a-z0-9]+$/),
          'info',
          'Test message',
          '{"key":"value"}',
          'test',
          'user123',
          'req456',
          expect.any(Date)
        ])
      );

      expect(fs.appendFile).toHaveBeenCalled();
    });

    it('should handle logging without optional parameters', async () => {
      mockDb.query.mockResolvedValue(undefined);

      await monitoringService.log('warn', 'Warning message');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.any(String),
          'warn',
          'Warning message',
          null,
          'system',
          undefined,
          undefined,
          expect.any(Date)
        ])
      );
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics for 1h timeRange', async () => {
      const mockDbStats = [
        { Variable_name: 'Threads_connected', Value: '10' }
      ];
      const mockSlowQueries = [{ Value: '2' }];
      const mockRequestStats = [{ total: 1000 }];
      const mockErrorStats = [{ total: 5 }];

      mockDb.query
        .mockResolvedValueOnce(mockDbStats)
        .mockResolvedValueOnce(mockSlowQueries)
        .mockResolvedValueOnce(mockRequestStats)
        .mockResolvedValueOnce(mockErrorStats);

      const result = await monitoringService.getPerformanceMetrics('1h');

      expect(result).toEqual({
        cpu: {
          usage: expect.any(Number),
          loadAverage: expect.any(Array)
        },
        memory: {
          used: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number)
        },
        database: {
          connections: 10,
          queryTime: 0,
          slowQueries: 2
        },
        requests: {
          total: 1000,
          errors: 5,
          avgResponseTime: 0
        },
        uptime: expect.any(Number)
      });
    });

    it('should handle different time ranges', async () => {
      mockDb.query.mockResolvedValue([]);

      await monitoringService.getPerformanceMetrics('24h');
      await monitoringService.getPerformanceMetrics('7d');
      await monitoringService.getPerformanceMetrics('invalid');

      // Should handle all time ranges without errors
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      const result = await monitoringService.getPerformanceMetrics('1h');

      expect(result.database).toEqual({
        connections: 0,
        queryTime: 0,
        slowQueries: 0
      });
      expect(result.requests).toEqual({
        total: 0,
        errors: 0,
        avgResponseTime: 0
      });
    });
  });

  describe('getErrorAnalysis', () => {
    it('should return comprehensive error analysis', async () => {
      const mockTotalErrors = [{ totalErrors: 25 }];
      const mockErrorsByType = [
        { source: 'auth', count: 10 },
        { source: 'database', count: 8 },
        { source: 'validation', count: 7 }
      ];
      const mockErrorTrends = [
        { date: '2023-01-01', count: 12 },
        { date: '2023-01-02', count: 13 }
      ];
      const mockTopErrors = [
        { message: 'Invalid credentials', count: 10, lastOccurred: new Date() },
        { message: 'Database timeout', count: 8, lastOccurred: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce(mockTotalErrors)
        .mockResolvedValueOnce(mockErrorsByType)
        .mockResolvedValueOnce(mockErrorTrends)
        .mockResolvedValueOnce(mockTopErrors);

      const result = await monitoringService.getErrorAnalysis('24h');

      expect(result).toEqual({
        totalErrors: 25,
        errorsByType: {
          auth: 10,
          database: 8,
          validation: 7
        },
        errorsByEndpoint: {},
        errorTrends: [
          { date: '2023-01-01', count: 12 },
          { date: '2023-01-02', count: 13 }
        ],
        topErrors: [
          { message: 'Invalid credentials', count: 10, lastOccurred: expect.any(Date) },
          { message: 'Database timeout', count: 8, lastOccurred: expect.any(Date) }
        ]
      });

      expect(mockDb.query).toHaveBeenCalledTimes(4);
    });

    it('should handle different time ranges correctly', async () => {
      mockDb.query.mockResolvedValue([]);

      await monitoringService.getErrorAnalysis('1h');
      await monitoringService.getErrorAnalysis('7d');
      await monitoringService.getErrorAnalysis('invalid');

      // Should calculate correct date ranges for each call
      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  describe('clearLogsBeforeDate', () => {
    it('should clear logs before specified date', async () => {
      const beforeDate = new Date('2023-01-01');
      mockDb.query.mockResolvedValue({ affectedRows: 150 });

      const result = await monitoringService.clearLogsBeforeDate(beforeDate);

      expect(result).toBe(150);
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM system_logs WHERE created_at < ?',
        [beforeDate]
      );
    });

    it('should handle case when no logs are deleted', async () => {
      mockDb.query.mockResolvedValue({ affectedRows: 0 });

      const result = await monitoringService.clearLogsBeforeDate(new Date());

      expect(result).toBe(0);
    });

    it('should handle missing affectedRows property', async () => {
      mockDb.query.mockResolvedValue({});

      const result = await monitoringService.clearLogsBeforeDate(new Date());

      expect(result).toBe(0);
    });
  });

  describe('file operations', () => {
    it('should create log directory if it does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Directory not found'));

      // Create new instance to trigger directory creation
      new SystemMonitoringService();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        { recursive: true }
      );
    });

    it('should handle file write errors gracefully', async () => {
      (fs.appendFile as jest.Mock).mockRejectedValue(new Error('Write failed'));
      mockDb.query.mockResolvedValue(undefined);

      // Should not throw error even if file write fails
      await expect(
        monitoringService.log('info', 'Test message')
      ).resolves.not.toThrow();
    });
  });
});