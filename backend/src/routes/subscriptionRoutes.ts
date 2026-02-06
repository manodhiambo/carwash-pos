import { Router } from 'express';
import subscriptionController from '../controllers/subscriptionController';
import { authenticate } from '../middleware/auth';
import { isAdmin, canManageStaff } from '../middleware/roleCheck';
import { handleValidation } from '../middleware/validation';
import { subscriptionValidators } from '../utils/validators';

const router = Router();

router.use(authenticate);

// Subscription plans
router.get('/plans', subscriptionController.getPlans);
router.get('/plans/:id', subscriptionController.getPlan);
router.post('/plans', isAdmin, subscriptionValidators.createPlan, handleValidation, subscriptionController.createPlan);
router.put('/plans/:id', isAdmin, subscriptionController.updatePlan);
router.delete('/plans/:id', isAdmin, subscriptionController.deletePlan);

// Customer subscriptions
router.get('/', subscriptionController.getSubscriptions);
router.get('/expiring', subscriptionController.getExpiringSubscriptions);
router.get('/check/:vehicleId', subscriptionController.checkSubscription);
router.get('/:id', subscriptionController.getSubscription);
router.post('/', subscriptionValidators.subscribe, handleValidation, subscriptionController.subscribe);
router.post('/:id/use', subscriptionController.useSubscription);
router.post('/:id/cancel', canManageStaff, subscriptionController.cancelSubscription);

export default router;
