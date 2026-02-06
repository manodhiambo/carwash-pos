import { Router } from 'express';
import vehicleController from '../controllers/vehicleController';
import { authenticate } from '../middleware/auth';
import { handleValidation } from '../middleware/validation';
import { vehicleValidators } from '../utils/validators';

const router = Router();

router.use(authenticate);

// Search and autocomplete
router.get('/search/autocomplete', vehicleController.autocomplete);

// CRUD operations
router.get('/', vehicleController.getVehicles);
router.get('/:id', vehicleController.getVehicle);
router.get('/registration/:regNo', vehicleController.getVehicleByRegistration);
router.post('/', vehicleValidators.create, handleValidation, vehicleController.createVehicle);
router.put('/:id', vehicleValidators.update, handleValidation, vehicleController.updateVehicle);
router.delete('/:id', vehicleController.deleteVehicle);

// Vehicle history and linking
router.get('/:id/history', vehicleController.getVehicleHistory);
router.post('/:id/link-customer', vehicleController.linkCustomer);

export default router;
