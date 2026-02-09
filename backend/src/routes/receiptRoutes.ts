import { Router } from 'express';
import receiptController from '../controllers/receiptController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/:jobId', receiptController.generateReceipt);
router.get('/:jobId/whatsapp', receiptController.getWhatsAppLink);

export default router;
