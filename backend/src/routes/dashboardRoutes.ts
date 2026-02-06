import { Router } from 'express';
import dashboardController from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/metrics', dashboardController.getMetrics);
router.get('/alerts', dashboardController.getAlerts);
router.get('/queue', dashboardController.getQueue);
router.get('/bays', dashboardController.getBayStatus);
router.get('/summary', dashboardController.getTodaySummary);
router.get('/activities', dashboardController.getRecentActivities);
router.get('/comparison', dashboardController.getComparison);

export default router;
