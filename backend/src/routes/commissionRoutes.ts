import { Router } from 'express';
import commissionController from '../controllers/commissionController';
import { authenticate } from '../middleware/auth';
import { isAdmin } from '../middleware/roleCheck';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Calculate commission for a job
router.post('/calculate/:jobId', isAdmin, commissionController.calculateJobCommission);

// Get staff commissions
router.get('/staff/:staffId', commissionController.getStaffCommissions);

// Get commission summary
router.get('/summary/:staffId', commissionController.getCommissionSummary);

// Get all staff summaries
router.get('/summaries', isAdmin, commissionController.getAllCommissionSummaries);

// Bulk pay all pending commissions (evening closeout) — must be BEFORE /:id/pay
router.put('/pay-daily', isAdmin, commissionController.payAllDailyCommissions);

// Pay all pending commissions for a specific staff member
router.put('/staff/:staffId/pay-all', isAdmin, commissionController.payAllStaffCommissions);

// Mark as paid
router.put('/:id/pay', isAdmin, commissionController.markCommissionPaid);

export default router;
