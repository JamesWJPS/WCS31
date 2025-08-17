import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/decorators';

const router = Router();
const adminController = new AdminController();

// Developer-only middleware - only allows access to developers/system admins
const requireDeveloper = (req: any, res: any, next: any) => {
  // Check if user has developer access (could be environment variable, special role, etc.)
  const isDeveloper = process.env.NODE_ENV === 'development' || 
                     req.user?.role === 'developer' || 
                     req.user?.isDeveloper === true;
  
  if (!isDeveloper) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'DEVELOPER_ACCESS_REQUIRED',
        message: 'This endpoint requires developer access',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  next();
};

// Apply authentication and developer access to all admin routes
router.use(authenticateToken);
router.use(requireDeveloper);

/**
 * @route GET /api/admin/system/overview
 * @desc Get system overview and health status
 * @access Developer only
 */
router.get('/system/overview', async (req, res, next) => {
  try {
    await adminController.getSystemOverview(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/admin/system/logs
 * @desc Get system logs with filtering and pagination
 * @access Developer only
 */
router.get('/system/logs', async (req, res, next) => {
  try {
    await adminController.getSystemLogs(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/admin/database/stats
 * @desc Get database statistics and health
 * @access Developer only
 */
router.get('/database/stats', async (req, res, next) => {
  try {
    await adminController.getDatabaseStats(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/admin/database/maintenance
 * @desc Execute database maintenance tasks
 * @access Developer only
 */
router.post('/database/maintenance', async (req, res, next) => {
  try {
    await adminController.runDatabaseMaintenance(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/admin/integrity/check
 * @desc Run data integrity checks
 * @access Developer only
 */
router.get('/integrity/check', async (req, res, next) => {
  try {
    await adminController.runDataIntegrityCheck(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/admin/integrity/repair
 * @desc Repair data integrity issues
 * @access Developer only
 */
router.post('/integrity/repair', async (req, res, next) => {
  try {
    await adminController.repairDataIntegrity(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/admin/monitoring/performance
 * @desc Get system performance metrics
 * @access Developer only
 */
router.get('/monitoring/performance', async (req, res, next) => {
  try {
    await adminController.getPerformanceMetrics(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/admin/monitoring/errors
 * @desc Get error analysis and patterns
 * @access Developer only
 */
router.get('/monitoring/errors', async (req, res, next) => {
  try {
    await adminController.getErrorAnalysis(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/admin/logs/cleanup
 * @desc Clear system logs older than specified date
 * @access Developer only
 */
router.delete('/logs/cleanup', async (req, res, next) => {
  try {
    await adminController.clearOldLogs(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/admin/export
 * @desc Export system data for backup or analysis
 * @access Developer only
 */
router.post('/export', async (req, res, next) => {
  try {
    await adminController.exportSystemData(req, res);
  } catch (error) {
    next(error);
  }
});

export { router as adminRoutes };