import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest, Commission, CommissionSummary } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';

/**
 * Calculate and create commission for a job
 * POST /api/v1/commissions/calculate/:jobId
 */
export const calculateJobCommission = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { jobId } = req.params;

  // Get job with assigned staff
  const jobResult = await db.query(
    `SELECT j.*, u.commission_rate, u.name as staff_name
     FROM jobs j
     LEFT JOIN users u ON j.assigned_staff_id = u.id
     WHERE j.id = $1`,
    [jobId]
  );

  if (jobResult.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Job not found',
    });
    return;
  }

  const job = jobResult.rows[0];

  if (!job.assigned_staff_id) {
    res.status(400).json({
      success: false,
      error: 'Job has no assigned staff',
    });
    return;
  }

  if (!job.commission_rate || job.commission_rate === 0) {
    res.status(400).json({
      success: false,
      error: 'Staff has no commission rate set',
    });
    return;
  }

  // Check if commission already exists
  const existingCommission = await db.query(
    'SELECT * FROM commissions WHERE job_id = $1 AND status != $2',
    [jobId, 'cancelled']
  );

  if (existingCommission.rows.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Commission already calculated for this job',
    });
    return;
  }

  // Calculate commission
  const baseAmount = job.final_amount;
  const commissionAmount = (baseAmount * job.commission_rate) / 100;

  // Create commission record
  const result = await db.query(
    `INSERT INTO commissions (staff_id, job_id, amount, commission_rate, base_amount, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [job.assigned_staff_id, jobId, commissionAmount, job.commission_rate, baseAmount, 'pending']
  );

  res.json({
    success: true,
    message: 'Commission calculated successfully',
    data: result.rows[0],
  });
});

/**
 * Get staff commissions
 * GET /api/v1/commissions/staff/:staffId
 */
export const getStaffCommissions = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { staffId } = req.params;
  const { status, startDate, endDate } = req.query;

  let query = `
    SELECT c.*, j.job_no, j.created_at as job_date
    FROM commissions c
    JOIN jobs j ON c.job_id = j.id
    WHERE c.staff_id = $1
  `;
  const params: any[] = [staffId];
  let paramIndex = 2;

  if (status) {
    query += ` AND c.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (startDate) {
    query += ` AND c.created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND c.created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  query += ' ORDER BY c.created_at DESC';

  const result = await db.query(query, params);

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Get commission summary for staff
 * GET /api/v1/commissions/summary/:staffId
 */
export const getCommissionSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { staffId } = req.params;
  const { startDate, endDate } = req.query;

  const start = startDate || new Date(new Date().setDate(1)); // First day of month
  const end = endDate || new Date();

  const result = await db.query(
    `SELECT 
      u.id as staff_id,
      u.name as staff_name,
      COUNT(c.id) as total_jobs,
      COALESCE(SUM(c.amount), 0) as total_earnings,
      COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END), 0) as pending_commission,
      COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) as paid_commission
     FROM users u
     LEFT JOIN commissions c ON u.id = c.staff_id 
       AND c.created_at >= $2 
       AND c.created_at <= $3
     WHERE u.id = $1
     GROUP BY u.id, u.name`,
    [staffId, start, end]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Staff not found',
    });
    return;
  }

  res.json({
    success: true,
    data: {
      ...result.rows[0],
      period_start: start,
      period_end: end,
    },
  });
});

/**
 * Get all staff commission summaries
 * GET /api/v1/commissions/summaries
 */
export const getAllCommissionSummaries = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { startDate, endDate } = req.query;

  const start = startDate || new Date(new Date().setDate(1));
  const end = endDate || new Date();

  const result = await db.query(
    `SELECT 
      u.id as staff_id,
      u.name as staff_name,
      u.commission_rate,
      COUNT(c.id) as total_jobs,
      COALESCE(SUM(c.amount), 0) as total_earnings,
      COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END), 0) as pending_commission,
      COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) as paid_commission
     FROM users u
     LEFT JOIN commissions c ON u.id = c.staff_id 
       AND c.created_at >= $1 
       AND c.created_at <= $2
     WHERE u.role IN ('attendant', 'cashier', 'manager', 'supervisor')
       AND u.status = 'active'
     GROUP BY u.id, u.name, u.commission_rate
     ORDER BY total_earnings DESC`,
    [start, end]
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Mark commission as paid
 * PUT /api/v1/commissions/:id/pay
 */
export const markCommissionPaid = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { notes } = req.body;

  const result = await db.query(
    `UPDATE commissions 
     SET status = 'paid', paid_at = CURRENT_TIMESTAMP, notes = $2
     WHERE id = $1
     RETURNING *`,
    [id, notes]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Commission not found',
    });
    return;
  }

  res.json({
    success: true,
    message: 'Commission marked as paid',
    data: result.rows[0],
  });
});

/**
 * Pay all pending commissions for a specific staff member
 * PUT /api/v1/commissions/staff/:staffId/pay-all
 */
export const payAllStaffCommissions = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { staffId } = req.params;
  const { notes } = req.body;

  const result = await db.query(
    `UPDATE commissions
     SET status = 'paid', paid_at = CURRENT_TIMESTAMP, notes = $2
     WHERE staff_id = $1 AND status = 'pending'
     RETURNING *`,
    [staffId, notes || 'Bulk payment']
  );

  const totalAmount = result.rows.reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0);

  res.json({
    success: true,
    message: `${result.rows.length} commissions marked as paid`,
    data: {
      count: result.rows.length,
      total_amount: totalAmount,
      commissions: result.rows,
    },
  });
});

/**
 * Pay all pending commissions (evening closeout)
 * PUT /api/v1/commissions/pay-daily
 */
export const payAllDailyCommissions = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { notes } = req.body;

  const result = await db.query(
    `UPDATE commissions
     SET status = 'paid', paid_at = CURRENT_TIMESTAMP, notes = $1
     WHERE status = 'pending'
     RETURNING *`,
    [notes || 'Evening closeout']
  );

  // Build breakdown by staff
  const staffBreakdown: Record<string, { count: number; total: number }> = {};
  for (const c of result.rows) {
    const sid = c.staff_id;
    if (!staffBreakdown[sid]) {
      staffBreakdown[sid] = { count: 0, total: 0 };
    }
    staffBreakdown[sid].count++;
    staffBreakdown[sid].total += parseFloat(c.amount);
  }

  const totalAmount = result.rows.reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0);

  res.json({
    success: true,
    message: `${result.rows.length} commissions paid out`,
    data: {
      count: result.rows.length,
      total_amount: totalAmount,
      staff_breakdown: staffBreakdown,
    },
  });
});

export default {
  calculateJobCommission,
  getStaffCommissions,
  getCommissionSummary,
  getAllCommissionSummaries,
  markCommissionPaid,
  payAllStaffCommissions,
  payAllDailyCommissions,
};
