import { Router } from 'express';
import serviceController from '../controllers/serviceController';
import { authenticate } from '../middleware/auth';
import { isAdmin } from '../middleware/roleCheck';
import { handleValidation } from '../middleware/validation';
import { serviceValidators } from '../utils/validators';

const router = Router();

router.use(authenticate);

// Public service queries
router.get('/', serviceController.getServices);
router.get('/grouped', serviceController.getServicesGrouped);
router.get('/popular', serviceController.getPopularServices);
router.get('/:id', serviceController.getService);
router.get('/:id/price/:vehicleType', serviceController.getServicePrice);

// Admin service management
router.post('/', isAdmin, serviceValidators.create, handleValidation, serviceController.createService);
router.put('/:id', isAdmin, serviceValidators.update, handleValidation, serviceController.updateService);
router.put('/:id/price/:vehicleType', isAdmin, serviceController.updateServicePrice);
router.delete('/:id', isAdmin, serviceController.deleteService);

export default router;
