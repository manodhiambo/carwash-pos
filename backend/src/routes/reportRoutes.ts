import { Router } from 'express';
import reportController from '../controllers/reportController';
import { authenticate } from '../middleware/auth';
import { isManager } from '../middleware/roleCheck';

const router = Router();

// All routes require authentication and manager+ access
router.use(authenticate);
router.use(isManager);

// Dashboard overview
router.get('/dashboard', reportController.getDashboardReport);

// Detailed reports
router.get('/sales', reportController.getSalesReport);
router.get('/expenses', reportController.getExpensesReport);
router.get('/inventory', reportController.getInventoryReport);
router.get('/staff', reportController.getStaffReport);
router.get('/customers', reportController.getCustomersReport);
router.get('/financial', reportController.getFinancialReport);

export default router;
