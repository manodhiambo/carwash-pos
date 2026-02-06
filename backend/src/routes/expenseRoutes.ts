import { Router } from 'express';
import expenseController from '../controllers/expenseController';
import { authenticate } from '../middleware/auth';
import { canViewReports, isAdmin, canManageStaff } from '../middleware/roleCheck';
import { handleValidation } from '../middleware/validation';
import { expenseValidators, cashSessionValidators } from '../utils/validators';

const router = Router();

router.use(authenticate);

// Expense queries
router.get('/', canViewReports, expenseController.getExpenses);
router.get('/summary', canViewReports, expenseController.getSummary);
router.get('/today', canViewReports, expenseController.getTodayExpenses);
router.get('/:id', canViewReports, expenseController.getExpense);

// Expense management
router.post('/', expenseValidators.create, handleValidation, expenseController.createExpense);
router.put('/:id', expenseController.updateExpense);
router.post('/:id/approve', canManageStaff, expenseController.approveExpense);
router.delete('/:id', isAdmin, expenseController.deleteExpense);

// Cash session management
router.get('/cash-session/current', expenseController.getCurrentCashSession);
router.get('/cash-session/history', canViewReports, expenseController.getCashSessionHistory);
router.post('/cash-session/open', cashSessionValidators.open, handleValidation, expenseController.openCashSession);
router.post('/cash-session/:id/close', cashSessionValidators.close, handleValidation, expenseController.closeCashSession);

export default router;
