import { Router } from 'express';
import { getMe, postLogin } from '../controllers/authController.js';
import { getDashboard } from '../controllers/dashboardController.js';
import {
  getScheduleLogs,
  getScheduleOptimizationReport,
  getSchedules,
  getScheduleVersions,
  patchSchedule,
  patchScheduleBatchStatus,
  postGeneratedSchedules,
  postSchedule,
  postScheduleVersion,
  postScheduleVersionRollback
} from '../controllers/scheduleController.js';
import {
  getDispatchEvents,
  postDispatchEvent,
  postDispatchExecution,
  postDispatchRollback
} from '../controllers/dispatchController.js';
import {
  getDatasetExport,
  getAnalytics,
  getDrivers,
  getFavorites,
  getFeedback,
  getImportJobs,
  getNotifications,
  getPassengerFlows,
  getRealtimeVehicleFeed,
  getRoadConditions,
  getRoutes,
  getStudentPortal,
  getSystemConfigs,
  getUsers,
  getVehicles,
  patchDriver,
  patchRouteStopPosition,
  postDriver,
  postImportJob,
  postFavorite,
  postFeedback,
  postNotification,
  postPassengerFlow,
  postRoadCondition,
  postRoute,
  postRouteStop,
  postUser,
  postVehicle,
  putSystemConfigs
} from '../controllers/portalController.js';
import { requireAuth, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Campus shuttle API is running.' });
});

router.post('/auth/login', postLogin);
router.get('/auth/me', requireAuth, getMe);

router.get('/dashboard', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), getDashboard);
router.get('/schedules', requireAuth, requireRoles('ADMIN', 'DISPATCHER', 'STUDENT'), getSchedules);
router.post('/schedules', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postSchedule);
router.patch('/schedules/:id', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), patchSchedule);
router.post('/schedules/generate', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postGeneratedSchedules);
router.patch('/schedules/status/batch', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), patchScheduleBatchStatus);
router.get('/schedule-logs', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), getScheduleLogs);
router.get('/schedules/optimization-report', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), getScheduleOptimizationReport);
router.get('/dispatch-events', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), getDispatchEvents);
router.post('/dispatch-events', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postDispatchEvent);
router.post('/dispatch-events/:id/execute', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postDispatchExecution);
router.post('/dispatch-events/:id/rollback', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postDispatchRollback);
router.get('/routes', requireAuth, getRoutes);
router.post('/routes', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postRoute);
router.post('/route-stops', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postRouteStop);
router.patch('/route-stops/position', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), patchRouteStopPosition);
router.get('/vehicles', requireAuth, getVehicles);
router.post('/vehicles', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postVehicle);
router.get('/notifications', requireAuth, getNotifications);
router.post('/notifications', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postNotification);
router.get('/feedback', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), getFeedback);
router.post('/feedback', requireAuth, postFeedback);
router.get('/favorites', requireAuth, getFavorites);
router.post('/favorites', requireAuth, postFavorite);
router.get('/road-conditions', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), getRoadConditions);
router.post('/road-conditions', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postRoadCondition);
router.get('/passenger-flows', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), getPassengerFlows);
router.post('/passenger-flows', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postPassengerFlow);
router.get('/users', requireAuth, requireRoles('ADMIN'), getUsers);
router.post('/users', requireAuth, requireRoles('ADMIN'), postUser);
router.get('/data-imports', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), getImportJobs);
router.post('/data-imports', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postImportJob);
router.get('/data-exports/:dataset', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), getDatasetExport);
router.get('/student/overview', requireAuth, getStudentPortal);
router.get('/vehicles/realtime', requireAuth, getRealtimeVehicleFeed);
router.get('/analytics', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), getAnalytics);
router.get('/system/configs', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), getSystemConfigs);
router.put('/system/configs', requireAuth, requireRoles('ADMIN'), putSystemConfigs);

router.get('/schedule-versions', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), getScheduleVersions);
router.post('/schedule-versions', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postScheduleVersion);
router.post('/schedule-versions/:id/rollback', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postScheduleVersionRollback);

router.get('/drivers', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), getDrivers);
router.post('/drivers', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), postDriver);
router.patch('/drivers/:id', requireAuth, requireRoles('ADMIN', 'DISPATCHER'), patchDriver);

export default router;
