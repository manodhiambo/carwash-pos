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
import settingsRoutes from './settingsRoutes';
import receiptService from '../services/receiptService';
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
router.use('/settings', settingsRoutes);

// Receipt generation endpoint
router.get('/receipts/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { format = 'json' } = req.query;

    // Get job data
    const jobResult = await db.query(
      `SELECT j.*, v.registration_no, v.vehicle_type,
              c.name as customer_name, c.phone as customer_phone,
              u.name as cashier_name, b.name as branch_name
       FROM jobs j
       JOIN vehicles v ON j.vehicle_id = v.id
       LEFT JOIN customers c ON j.customer_id = c.id
       LEFT JOIN users u ON j.checked_in_by = u.id
       LEFT JOIN branches b ON j.branch_id = b.id
       WHERE j.id = $1`,
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }

    const job = jobResult.rows[0];

    // Get services
    const servicesResult = await db.query(
      `SELECT s.name, js.quantity, js.price, js.total
       FROM job_services js
       JOIN services s ON js.service_id = s.id
       WHERE js.job_id = $1`,
      [jobId]
    );

    // Get payments
    const paymentsResult = await db.query(
      `SELECT payment_method, amount, reference_no, mpesa_receipt
       FROM payments
       WHERE job_id = $1 AND status = 'completed'`,
      [jobId]
    );

    const receiptData = {
      jobNo: job.job_no,
      date: job.created_at,
      vehicle: {
        registration: job.registration_no,
        type: job.vehicle_type,
      },
      customer: job.customer_name
        ? { name: job.customer_name, phone: job.customer_phone }
        : undefined,
      services: servicesResult.rows,
      subtotal: parseFloat(job.total_amount),
      discount: parseFloat(job.discount_amount),
      tax: parseFloat(job.tax_amount),
      total: parseFloat(job.final_amount),
      payments: paymentsResult.rows.map(p => ({
        method: p.payment_method,
        amount: parseFloat(p.amount),
        reference: p.mpesa_receipt || p.reference_no,
      })),
      cashier: job.cashier_name,
      branch: job.branch_name,
    };

    if (format === 'html') {
      const html = await receiptService.generateReceiptHTML(receiptData);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else if (format === 'text') {
      const text = await receiptService.generateReceipt(receiptData);
      res.setHeader('Content-Type', 'text/plain');
      res.send(text);
    } else {
      res.json({
        success: true,
        data: receiptService.generateReceiptJSON(receiptData),
      });
    }
  } catch (error) {
    console.error('Receipt generation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate receipt' });
  }
});

export default router;
