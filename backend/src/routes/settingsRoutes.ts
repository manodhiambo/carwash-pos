import { Router } from 'express';
import settingsController from '../controllers/settingsController';
import { authenticate } from '../middleware/auth';
import { isAdmin } from '../middleware/roleCheck';

const router = Router();

router.use(authenticate);

// Get all settings (any authenticated user)
router.get('/', settingsController.getAllSettings);

// Bulk update (admin only) - MUST be before /:key to avoid matching "bulk" as a key
router.put('/bulk', isAdmin, settingsController.updateBulkSettings);

// Initialize default settings (admin only)
router.post('/initialize', isAdmin, settingsController.initializeSettings);

// Single setting by key (any authenticated user can read, admin can update)
router.get('/:key', settingsController.getSetting);
router.put('/:key', isAdmin, settingsController.updateSetting);

export default router;
