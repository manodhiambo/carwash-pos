import { Router } from 'express';
import paymentController from '../controllers/paymentController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { canProcessPayments, isAdmin } from '../middleware/roleCheck';
import { handleValidation } from '../middleware/validation';
import { paymentValidators } from '../utils/validators';

const router = Router();

// M-Pesa callback (no auth required)
router.post('/mpesa/callback', paymentController.mpesaCallback);

// Protected routes
router.use(authenticate);

// Payment queries
router.get('/', canProcessPayments, paymentController.getPayments);
router.get('/today/totals', canProcessPayments, paymentController.getTodayTotals);
router.get('/job/:jobId/summary', paymentController.getJobPaymentSummary);
router.get('/:id', canProcessPayments, paymentController.getPayment);

// Process payment
router.post('/', canProcessPayments, paymentValidators.create, handleValidation, paymentController.processPayment);

// M-Pesa STK Push
router.post('/mpesa/stk-push', canProcessPayments, paymentValidators.mpesaSTK, handleValidation, paymentController.initiateMpesaSTK);
router.get('/mpesa/status/:checkoutRequestId', paymentController.checkMpesaStatus);

// Refund (admin only)
router.post('/:id/refund', isAdmin, paymentController.processRefund);

export default router;
