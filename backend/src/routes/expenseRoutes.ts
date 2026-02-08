import { Router } from 'express';
import expenseController from '../controllers/expenseController';
import { authenticate } from '../middleware/auth';
import { canViewReports, isAdmin } from '../middleware/roleCheck';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get summary (for dashboard cards)
router.get('/summary', canViewReports, expenseController.getExpenseSummary);

// CRUD routes
router.get('/', canViewReports, expenseController.getExpenses);
router.get('/:id', canViewReports, expenseController.getExpense);
router.post('/', isAdmin, expenseController.createExpense);
router.put('/:id', isAdmin, expenseController.updateExpense);
router.delete('/:id', isAdmin, expenseController.deleteExpense);

export default router;
