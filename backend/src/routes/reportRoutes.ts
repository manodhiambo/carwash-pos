import { Router } from 'express';
import reportController from '../controllers/reportController';
import { authenticate } from '../middleware/auth';
import { canViewReports } from '../middleware/roleCheck';
import { handleValidation } from '../middleware/validation';
import { reportValidators } from '../utils/validators';

const router = Router();

router.use(authenticate);
router.use(canViewReports);

// Reports
router.get('/sales', reportValidators.dateRange, handleValidation, reportController.getSalesReport);
router.get('/operational', reportValidators.dateRange, handleValidation, reportController.getOperationalReport);
router.get('/customers', reportValidators.dateRange, handleValidation, reportController.getCustomerReport);
router.get('/financial', reportValidators.dateRange, handleValidation, reportController.getFinancialReport);
router.get('/inventory', reportValidators.dateRange, handleValidation, reportController.getInventoryReport);

// Export
router.get('/export/:type', reportController.exportReport);

export default router;
