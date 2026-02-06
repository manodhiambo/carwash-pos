import { Router } from 'express';
import jobController from '../controllers/jobController';
import { authenticate } from '../middleware/auth';
import { handleValidation } from '../middleware/validation';
import { jobValidators } from '../utils/validators';
import { canOverridePrice } from '../middleware/roleCheck';

const router = Router();

router.use(authenticate);

// Job listing and search
router.get('/', jobController.getJobs);
router.get('/:id', jobController.getJob);
router.get('/number/:jobNo', jobController.getJobByNumber);

// Job creation (check-in)
router.post('/check-in', jobValidators.checkIn, handleValidation, jobController.checkIn);

// Job status management
router.put('/:id/status', jobValidators.updateStatus, handleValidation, jobController.updateStatus);

// Bay and staff assignment
router.put('/:id/assign-bay', jobValidators.assignBay, handleValidation, jobController.assignBay);
router.put('/:id/assign-staff', jobValidators.assignStaff, handleValidation, jobController.assignStaff);

// Service and discount management
router.post('/:id/services', jobController.addService);
router.post('/:id/discount', canOverridePrice, jobController.applyDiscount);

// Cancel job
router.post('/:id/cancel', jobController.cancelJob);

export default router;
