import { Router } from 'express';
import settingsController from '../controllers/settingsController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { isAdmin, isSuperAdmin } from '../middleware/roleCheck';

const router = Router();

// Public settings
router.get('/', optionalAuth, settingsController.getSettings);
router.get('/:key', optionalAuth, settingsController.getSetting);

// Protected routes
router.use(authenticate);

// Update settings (admin only)
router.put('/:key', isAdmin, settingsController.updateSetting);
router.put('/', isAdmin, settingsController.updateSettings);
router.delete('/:key', isSuperAdmin, settingsController.deleteSetting);

// Branch management
router.get('/branches', settingsController.getBranches);
router.get('/branches/:id', settingsController.getBranch);
router.post('/branches', isSuperAdmin, settingsController.createBranch);
router.put('/branches/:id', isAdmin, settingsController.updateBranch);
router.delete('/branches/:id', isSuperAdmin, settingsController.deleteBranch);

// Promotions
router.get('/promotions', settingsController.getPromotions);
router.post('/promotions', isAdmin, settingsController.createPromotion);
router.post('/promotions/validate', settingsController.validatePromoCode);
router.put('/promotions/:id', isAdmin, settingsController.updatePromotion);

export default router;
