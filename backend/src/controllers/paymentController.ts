import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Create a new payment and auto-calculate commission
 */
export const createPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { job_id, amount, payment_method, reference_no, notes } = req.body;
  const userId = req.user?.id;

  const jobResult = await db.query(
    `SELECT j.*, u.commission_rate
     FROM jobs j
     LEFT JOIN users u ON j.assigned_staff_id = u.id
     WHERE j.id = $1`,
    [job_id]
  );

  if (jobResult.rows.length === 0) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return;
  }

  const job = jobResult.rows[0];

  // ✅ FIXED: include received_by (NOT NULL) and created_by
  const paymentResult = await db.query(
    `INSERT INTO payments (
       job_id,
       amount,
       payment_method,
       reference_no,
       notes,
       status,
       received_by,
       created_by,
       created_at
     )
     VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, CURRENT_TIMESTAMP)
     RETURNING *`,
    [
      job_id,
      amount,
      payment_method,
      reference_no,
      notes,
      userId, // received_by
      userId  // created_by
    ]
  );

  const currentPaid = parseFloat(job.amount_paid || '0');
  const newAmountPaid = currentPaid + parseFloat(amount);
  const totalAmount = parseFloat(job.total_amount);

  let newStatus = job.status;
  if (newAmountPaid >= totalAmount) {
    newStatus = 'paid';
  }

  await db.query(
    `UPDATE jobs
     SET amount_paid = $1, status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [newAmountPaid, newStatus, job_id]
  );

  if (newStatus === 'paid' && job.assigned_staff_id && job.commission_rate > 0) {
    const existingCommission = await db.query(
      `SELECT id FROM commissions WHERE job_id = $1`,
      [job_id]
    );

    if (existingCommission.rows.length === 0) {
      const commissionAmount = (totalAmount * job.commission_rate) / 100;

      await db.query(
        `INSERT INTO commissions (job_id, staff_id, amount, status, created_at)
         VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)`,
        [job_id, job.assigned_staff_id, commissionAmount]
      );
    }
  }

  res.status(201).json({
    success: true,
    message: 'Payment created successfully',
    data: paymentResult.rows[0],
  });
});

/**
 * Get all payments (paginated + filters)
 */
export const getPayments = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { page = 1, limit = 20, payment_method, status, date } = req.query;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (payment_method) {
    conditions.push(`payment_method = $${paramIndex++}`);
    params.push(payment_method);
  }

  if (status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  if (date) {
    conditions.push(`DATE(created_at) = $${paramIndex++}`);
    params.push(date);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countResult = await db.query(
    `SELECT COUNT(*) FROM payments ${whereClause}`,
    params
  );

  const result = await db.query(
    `SELECT p.*, j.job_no, u.name AS created_by_name
     FROM payments p
     LEFT JOIN jobs j ON p.job_id = j.id
     LEFT JOIN users u ON p.created_by = u.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: Number(countResult.rows[0].count),
      totalPages: Math.ceil(countResult.rows[0].count / Number(limit)),
    },
  });
});

/**
 * Get single payment by ID
 */
export const getPaymentById = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT p.*, j.job_no, u.name AS created_by_name
     FROM payments p
     LEFT JOIN jobs j ON p.job_id = j.id
     LEFT JOIN users u ON p.created_by = u.id
     WHERE p.id = $1`,
    [id]
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, error: 'Payment not found' });
    return;
  }

  res.json({ success: true, data: result.rows[0] });
});

/**
 * Get payments for a specific job
 */
export const getJobPayments = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { jobId } = req.params;

  const result = await db.query(
    `SELECT p.*, u.name AS created_by_name
     FROM payments p
     LEFT JOIN users u ON p.created_by = u.id
     WHERE p.job_id = $1
     ORDER BY p.created_at DESC`,
    [jobId]
  );

  res.json({ success: true, data: result.rows });
});

/**
 * Get today's totals
 */
export const getTodayTotals = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const result = await db.query(`
    SELECT
      COALESCE(SUM(amount), 0) AS total_amount,
      COUNT(*) AS total_payments
    FROM payments
    WHERE DATE(created_at) = CURRENT_DATE
  `);

  res.json({ success: true, data: result.rows[0] });
});

/**
 * Mpesa callback (stub)
 */
export const mpesaCallback = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({ success: true });
});

/**
 * Initiate Mpesa STK Push (stub)
 */
export const initiateMpesaSTK = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  res.status(501).json({ success: false, message: 'Mpesa STK not implemented yet' });
});

/**
 * Check Mpesa payment status (stub)
 */
export const checkMpesaStatus = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  res.status(501).json({ success: false, message: 'Mpesa status check not implemented yet' });
});

/**
 * Process refund (stub)
 */
export const processRefund = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  res.status(501).json({ success: false, message: 'Refund not implemented yet' });
});

export default {
  createPayment,
  getPayments,
  getPaymentById,
  getJobPayments,
  getTodayTotals,
  mpesaCallback,
  initiateMpesaSTK,
  checkMpesaStatus,
  processRefund,
};
