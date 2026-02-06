import { Router } from 'express';
import bayController from '../controllers/bayController';
import { authenticate } from '../middleware/auth';
import { isAdmin, canManageStaff } from '../middleware/roleCheck';
import { handleValidation } from '../middleware/validation';
import { bayValidators } from '../utils/validators';

const router = Router();

router.use(authenticate);

// Bay queries
router.get('/', bayController.getBays);
router.get('/available', bayController.getAvailableBays);
router.get('/utilization', bayController.getUtilization);
router.get('/:id', bayController.getBay);

// Bay management
router.post('/', canManageStaff, bayValidators.create, handleValidation, bayController.createBay);
router.put('/:id', canManageStaff, bayController.updateBay);
router.put('/:id/status', bayValidators.updateStatus, handleValidation, bayController.updateStatus);
router.delete('/:id', isAdmin, bayController.deleteBay);

// Equipment
router.get('/equipment', bayController.getEquipment);
router.post('/equipment', canManageStaff, bayController.createEquipment);
router.put('/equipment/:id', canManageStaff, bayController.updateEquipment);

export default router;
