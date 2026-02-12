import { Router } from 'express';
import authRoutes from './authRoutes';
import dashboardRoutes from './dashboardRoutes';
import vehicleRoutes from './vehicleRoutes';
import jobRoutes from './jobRoutes';
import serviceRoutes from './serviceRoutes';
import paymentRoutes from './paymentRoutes';
import customerRoutes from './customerRoutes';
import inventoryRoutes from './inventoryRoutes';
import bayRoutes from './bayRoutes';
import expenseRoutes from './expenseRoutes';
import reportRoutes from './reportRoutes';
import subscriptionRoutes from './subscriptionRoutes';
import commissionRoutes from './commissionRoutes';
import settingsRoutes from './settingsRoutes';
import activityLogRoutes from './activityLogRoutes';
import receiptRoutes from './receiptRoutes';
import db from '../config/database';

const router = Router();

// Health check
router.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

// API version info
router.get('/', (_req, res) => {
  res.json({
    name: 'CarWash POS API',
    version: '1.0.0',
    description: 'Car Wash Management System API',
    endpoints: {
      auth: '/api/v1/auth',
      dashboard: '/api/v1/dashboard',
      jobs: '/api/v1/jobs',
      vehicles: '/api/v1/vehicles',
      services: '/api/v1/services',
      payments: '/api/v1/payments',
      customers: '/api/v1/customers',
      inventory: '/api/v1/inventory',
      bays: '/api/v1/bays',
      expenses: '/api/v1/expenses',
      reports: '/api/v1/reports',
      subscriptions: '/api/v1/subscriptions',
      settings: '/api/v1/settings',
    },
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/jobs', jobRoutes);
router.use('/services', serviceRoutes);
router.use('/payments', paymentRoutes);
router.use('/customers', customerRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/bays', bayRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reports', reportRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/commissions', commissionRoutes);
router.use('/settings', settingsRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/receipts', receiptRoutes);

export default router;
