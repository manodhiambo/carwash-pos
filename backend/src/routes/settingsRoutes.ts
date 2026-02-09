import { Router } from 'express';
import settingsController from '../controllers/settingsController';
import { authenticate } from '../middleware/auth';
import { isAdmin } from '../middleware/roleCheck';

const router = Router();

router.use(authenticate);

// Get all settings (any authenticated user)
router.get('/', settingsController.getAllSettings);
router.get('/:key', settingsController.getSetting);

// Update settings (admin only)
router.put('/:key', isAdmin, settingsController.updateSetting);
router.put('/bulk', isAdmin, settingsController.updateBulkSettings);

// Initialize default settings (admin only)
router.post('/initialize', isAdmin, settingsController.initializeSettings);

export default router;
