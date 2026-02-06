import { Router } from 'express';
import customerController from '../controllers/customerController';
import { authenticate } from '../middleware/auth';
import { handleValidation } from '../middleware/validation';
import { customerValidators } from '../utils/validators';

const router = Router();

router.use(authenticate);

// Search and autocomplete
router.get('/search/autocomplete', customerController.autocomplete);
router.get('/top', customerController.getTopCustomers);

// CRUD operations
router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomer);
router.get('/phone/:phone', customerController.getCustomerByPhone);
router.post('/', customerValidators.create, handleValidation, customerController.createCustomer);
router.put('/:id', customerValidators.update, handleValidation, customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

// Customer details
router.get('/:id/vehicles', customerController.getCustomerVehicles);
router.get('/:id/history', customerController.getCustomerHistory);

// Loyalty points
router.post('/:id/loyalty', customerController.adjustLoyaltyPoints);
router.post('/:id/redeem', customerController.redeemPoints);

export default router;
