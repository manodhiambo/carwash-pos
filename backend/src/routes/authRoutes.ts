import { Router } from 'express';
import authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { isAdmin, canManageStaff } from '../middleware/roleCheck';
import { handleValidation } from '../middleware/validation';
import { authValidators } from '../utils/validators';

const router = Router();

// Public routes
router.post('/login', authValidators.login, handleValidation, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);

// Protected routes
router.use(authenticate);

router.post('/logout', authController.logout);
router.get('/me', authController.getProfile);
router.put('/me', authController.updateProfile);
router.post('/change-password', authValidators.changePassword, handleValidation, authController.changePassword);

// Admin routes
router.post('/register', canManageStaff, authValidators.register, handleValidation, authController.register);
router.get('/users', canManageStaff, authController.getUsers);
router.get('/users/:id', canManageStaff, authController.getUser);
router.put('/users/:id', canManageStaff, authController.updateUser);
router.post('/users/:id/reset-password', isAdmin, authController.resetUserPassword);
router.delete('/users/:id', isAdmin, authController.deleteUser);

export default router;
