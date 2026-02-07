import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, JOB_STATUS, PAYMENT_STATUS } from '../utils/constants';
import { generateReferenceNumber, calculatePagination, buildPaginationClause } from '../utils/helpers';
import { transaction } from '../config/database';
import mpesaService from '../services/mpesaService';

/**
 * Get all payments with filters
 * GET /api/v1/payments
 */
export const getPayments = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    job_id,
    payment_method,
    status,
    date_from,
    date_to,
    page = 1,
    limit = 20,
  } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  const branchId = req.user?.branch_id;
  if (req.user?.role !== 'super_admin' && branchId) {
    conditions.push(`j.branch_id = $${paramIndex++}`);
    params.push(branchId);
  }

  if (job_id) {
    conditions.push(`p.job_id = $${paramIndex++}`);
    params.push(job_id);
  }

  if (payment_method) {
    conditions.push(`p.payment_method = $${paramIndex++}`);
    params.push(payment_method);
  }

  if (status) {
    conditions.push(`p.status = $${paramIndex++}`);
    params.push(status);
  }

  if (date_from) {
    conditions.push(`p.created_at >= $${paramIndex++}`);
    params.push(date_from);
  }

  if (date_to) {
    conditions.push(`p.created_at <= $${paramIndex++}`);
    params.push(date_to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM payments p
     JOIN jobs j ON p.job_id = j.id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get payments
  const { offset, limit: validLimit } = buildPaginationClause(Number(page), Number(limit));

  const result = await db.query(
    `SELECT p.*, j.job_no, v.registration_no, u.name as received_by_name
     FROM payments p
     JOIN jobs j ON p.job_id = j.id
     JOIN vehicles v ON j.vehicle_id = v.id
     LEFT JOIN users u ON p.received_by = u.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, validLimit, offset]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: calculatePagination(total, Number(page), validLimit),
  });
});

/**
 * Get payment by ID
 * GET /api/v1/payments/:id
 */
export const getPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT p.*, j.job_no, j.final_amount as job_total,
            v.registration_no, v.vehicle_type,
            c.name as customer_name, c.phone as customer_phone,
            u.name as received_by_name
     FROM payments p
     JOIN jobs j ON p.job_id = j.id
     JOIN vehicles v ON j.vehicle_id = v.id
     LEFT JOIN customers c ON j.customer_id = c.id
     LEFT JOIN users u ON p.received_by = u.id
     WHERE p.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Payment not found',
    });
    return;
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

/**
 * Process payment for a job
 * POST /api/v1/payments
 */
export const processPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { job_id, amount, payment_method, reference_no, notes } = req.body;

  console.log('=== PAYMENT PROCESSING DEBUG ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Payment method:', payment_method);
  console.log('User branch:', req.user ? req.user.branch_id : 'none');
  console.log('================================');

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  const userId = req.user.id;
  const userBranchId = req.user.branch_id || 1;

  // Get job details
  const job = await db.query(
    `SELECT j.*, v.registration_no,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE job_id = j.id AND status = 'completed') as paid_amount
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     WHERE j.id = $1`,
    [job_id]
  );

  if (job.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.JOB_NOT_FOUND,
    });
    return;
  }

  const jobData = job.rows[0];

  // Check if job is already fully paid
  if (jobData.status === JOB_STATUS.PAID) {
    res.status(400).json({
      success: false,
      error: ERROR_MESSAGES.ALREADY_PAID,
    });
    return;
  }

  // Calculate remaining amount
  const paidAmount = parseFloat(jobData.paid_amount);
  const finalAmount = parseFloat(jobData.final_amount);
  const remainingAmount = finalAmount - paidAmount;

  if (amount > remainingAmount + 0.01) { // Small tolerance for rounding
    res.status(400).json({
      success: false,
      error: `Payment amount exceeds remaining balance of ${remainingAmount}`,
    });
    return;
  }

  // Check if there's an open cash session (ONLY for cash payments)
  if (payment_method === 'cash') {
    const cashSession = await db.query(
      `SELECT id FROM cash_sessions WHERE branch_id = $1 AND status = 'open'`,
      [userBranchId]
    );

    if (cashSession.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.CASH_SESSION_NOT_OPEN,
      });
      return;
    }
  }

  const payment = await transaction(async (client) => {
    // Create payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (job_id, amount, payment_method, status, reference_no, received_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        job_id,
        amount,
        payment_method,
        PAYMENT_STATUS.COMPLETED,
        reference_no || generateReferenceNumber('PAY'),
        userId,
        notes,
      ]
    );

    const newPayment = paymentResult.rows[0];

    // Check if job is now fully paid
    const newPaidAmount = paidAmount + amount;
    const isFullyPaid = newPaidAmount >= finalAmount - 0.01;

    if (isFullyPaid) {
      // Update job status to paid
      await client.query(
        `UPDATE jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [JOB_STATUS.PAID, job_id]
      );

      // Free up bay if still occupied
      if (jobData.bay_id) {
        await client.query(
          `UPDATE bays SET status = 'available', current_job_id = NULL WHERE current_job_id = $1`,
          [job_id]
        );
      }

      // Update customer total spent
      if (jobData.customer_id) {
        await client.query(
          `UPDATE customers SET total_spent = total_spent + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [amount, jobData.customer_id]
        );

        // Award loyalty points (1 point per 100 KES)
        const pointsEarned = Math.floor(amount / 100);
        if (pointsEarned > 0) {
          await client.query(
            `UPDATE customers SET loyalty_points = loyalty_points + $1 WHERE id = $2`,
            [pointsEarned, jobData.customer_id]
          );

          await client.query(
            `INSERT INTO loyalty_transactions (customer_id, job_id, points, transaction_type, description, created_by)
             VALUES ($1, $2, $3, 'earned', 'Points earned from wash', $4)`,
            [jobData.customer_id, job_id, pointsEarned, userId]
          );
        }
      }
    }

    // Update cash session totals (ONLY if a session exists)
    // Check if there's an open cash session first
    const openSession = await client.query(
      `SELECT id FROM cash_sessions WHERE branch_id = $1 AND status = 'open'`,
      [userBranchId]
    );

    if (openSession.rows.length > 0) {
      if (payment_method === 'cash') {
        await client.query(
          `UPDATE cash_sessions
           SET cash_sales = cash_sales + $1, total_sales = total_sales + $1,
               expected_closing = opening_balance + cash_sales + $1 - expenses_paid
           WHERE branch_id = $2 AND status = 'open'`,
          [amount, userBranchId]
        );
      } else if (payment_method === 'mpesa') {
        await client.query(
          `UPDATE cash_sessions
           SET mpesa_sales = mpesa_sales + $1, total_sales = total_sales + $1
           WHERE branch_id = $2 AND status = 'open'`,
          [amount, userBranchId]
        );
      } else if (payment_method === 'card') {
        await client.query(
          `UPDATE cash_sessions
           SET card_sales = card_sales + $1, total_sales = total_sales + $1
           WHERE branch_id = $2 AND status = 'open'`,
          [amount, userBranchId]
        );
      }
    } else {
      console.log('No open cash session - payment recorded but session not updated');
    }

    return {
      ...newPayment,
      is_fully_paid: isFullyPaid,
      remaining_balance: isFullyPaid ? 0 : finalAmount - newPaidAmount,
    };
  });

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.PAYMENT_SUCCESS,
    data: payment,
  });
});

/**
 * Initiate M-Pesa STK Push
 * POST /api/v1/payments/mpesa/stk-push
 */
export const initiateMpesaSTK = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { job_id, phone, amount } = req.body;

  // Validate job
  const job = await db.query(
    `SELECT j.*, v.registration_no
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     WHERE j.id = $1`,
    [job_id]
  );

  if (job.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.JOB_NOT_FOUND,
    });
    return;
  }

  try {
    const result = await mpesaService.initiateSTKPush({
      phone,
      amount,
      accountReference: job.rows[0].job_no,
      transactionDesc: `Car Wash - ${job.rows[0].registration_no}`,
    });

    // Store pending payment
    await db.query(
      `INSERT INTO payments (job_id, amount, payment_method, status, reference_no, received_by, notes)
       VALUES ($1, $2, 'mpesa', 'pending', $3, $4, $5)`,
      [
        job_id,
        amount,
        result.CheckoutRequestID,
        req.user?.id,
        `STK Push initiated to ${phone}`,
      ]
    );

    res.json({
      success: true,
      message: 'STK Push initiated. Please check your phone to complete payment.',
      data: {
        checkout_request_id: result.CheckoutRequestID,
        merchant_request_id: result.MerchantRequestID,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to initiate M-Pesa payment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * M-Pesa callback handler
 * POST /api/v1/payments/mpesa/callback
 */
export const mpesaCallback = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { Body } = req.body;

  if (!Body || !Body.stkCallback) {
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    return;
  }

  const callback = Body.stkCallback;
  const checkoutRequestId = callback.CheckoutRequestID;
  const resultCode = callback.ResultCode;

  // Find pending payment
  const payment = await db.query(
    `SELECT * FROM payments WHERE reference_no = $1 AND status = 'pending'`,
    [checkoutRequestId]
  );

  if (payment.rows.length === 0) {
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    return;
  }

  if (resultCode === 0) {
    // Payment successful
    const metadata = callback.CallbackMetadata?.Item || [];
    const mpesaReceipt = metadata.find((i: { Name: string }) => i.Name === 'MpesaReceiptNumber')?.Value;
    const transactionDate = metadata.find((i: { Name: string }) => i.Name === 'TransactionDate')?.Value;

    await transaction(async (client) => {
      // Update payment status
      await client.query(
        `UPDATE payments
         SET status = 'completed', mpesa_receipt = $1,
             notes = COALESCE(notes, '') || $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE reference_no = $3`,
        [mpesaReceipt, `\nM-Pesa confirmed: ${transactionDate}`, checkoutRequestId]
      );

      // Get job and check if fully paid
      const jobResult = await client.query(
        `SELECT j.*,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE job_id = j.id AND status = 'completed') as paid_amount
         FROM jobs j
         JOIN payments p ON p.job_id = j.id
         WHERE p.reference_no = $1`,
        [checkoutRequestId]
      );

      if (jobResult.rows.length > 0) {
        const jobData = jobResult.rows[0];
        const isFullyPaid = parseFloat(jobData.paid_amount) >= parseFloat(jobData.final_amount) - 0.01;

        if (isFullyPaid) {
          await client.query(
            `UPDATE jobs SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [jobData.id]
          );

          if (jobData.bay_id) {
            await client.query(
              `UPDATE bays SET status = 'available', current_job_id = NULL WHERE current_job_id = $1`,
              [jobData.id]
            );
          }
        }
      }
    });
  } else {
    // Payment failed
    await db.query(
      `UPDATE payments
       SET status = 'failed',
           notes = COALESCE(notes, '') || $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE reference_no = $2`,
      [`\nM-Pesa failed: ${callback.ResultDesc}`, checkoutRequestId]
    );
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

/**
 * Check M-Pesa payment status
 * GET /api/v1/payments/mpesa/status/:checkoutRequestId
 */
export const checkMpesaStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { checkoutRequestId } = req.params;

  const payment = await db.query(
    `SELECT p.*, j.job_no
     FROM payments p
     JOIN jobs j ON p.job_id = j.id
     WHERE p.reference_no = $1`,
    [checkoutRequestId]
  );

  if (payment.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Payment not found',
    });
    return;
  }

  res.json({
    success: true,
    data: {
      status: payment.rows[0].status,
      mpesa_receipt: payment.rows[0].mpesa_receipt,
      amount: payment.rows[0].amount,
      job_no: payment.rows[0].job_no,
    },
  });
});

/**
 * Process refund
 * POST /api/v1/payments/:id/refund
 */
export const processRefund = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { amount, reason } = req.body;

  // Get original payment
  const payment = await db.query(
    `SELECT p.*, j.customer_id
     FROM payments p
     JOIN jobs j ON p.job_id = j.id
     WHERE p.id = $1`,
    [id]
  );

  if (payment.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Payment not found',
    });
    return;
  }

  const originalPayment = payment.rows[0];

  if (originalPayment.status !== 'completed') {
    res.status(400).json({
      success: false,
      error: 'Can only refund completed payments',
    });
    return;
  }

  const refundAmount = amount || originalPayment.amount;

  if (refundAmount > originalPayment.amount) {
    res.status(400).json({
      success: false,
      error: 'Refund amount cannot exceed original payment',
    });
    return;
  }

  await transaction(async (client) => {
    // Update original payment
    await client.query(
      `UPDATE payments
       SET status = $1,
           notes = COALESCE(notes, '') || $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [
        refundAmount >= originalPayment.amount ? 'refunded' : 'partial',
        `\n[REFUND: KES ${refundAmount}] ${reason || 'No reason provided'}`,
        id,
      ]
    );

    // Revert customer total spent
    if (originalPayment.customer_id) {
      await client.query(
        `UPDATE customers SET total_spent = total_spent - $1 WHERE id = $2`,
        [refundAmount, originalPayment.customer_id]
      );
    }

    // Update job status if full refund
    if (refundAmount >= originalPayment.amount) {
      await client.query(
        `UPDATE jobs SET status = 'completed' WHERE id = $1 AND status = 'paid'`,
        [originalPayment.job_id]
      );
    }
  });

  res.json({
    success: true,
    message: 'Refund processed successfully',
    data: {
      refund_amount: refundAmount,
      original_amount: originalPayment.amount,
    },
  });
});

/**
 * Get payment summary for a job
 * GET /api/v1/payments/job/:jobId/summary
 */
export const getJobPaymentSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { jobId } = req.params;

  const result = await db.query(
    `SELECT
       j.final_amount as total_amount,
       COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) as paid_amount,
       COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'pending'), 0) as pending_amount,
       j.final_amount - COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) as balance_due,
       JSON_AGG(
         JSON_BUILD_OBJECT(
           'id', p.id,
           'amount', p.amount,
           'method', p.payment_method,
           'status', p.status,
           'reference', p.reference_no,
           'date', p.created_at
         ) ORDER BY p.created_at DESC
       ) FILTER (WHERE p.id IS NOT NULL) as payments
     FROM jobs j
     LEFT JOIN payments p ON j.id = p.job_id
     WHERE j.id = $1
     GROUP BY j.id`,
    [jobId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.JOB_NOT_FOUND,
    });
    return;
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

/**
 * Get today's payment totals
 * GET /api/v1/payments/today/totals
 */
export const getTodayTotals = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const branchId = req.user?.branch_id;

  const result = await db.query(
    `SELECT
       payment_method,
       COUNT(*) as count,
       SUM(amount) as total
     FROM payments p
     JOIN jobs j ON p.job_id = j.id
     WHERE DATE(p.created_at) = CURRENT_DATE
     AND p.status = 'completed'
     ${branchId ? 'AND j.branch_id = $1' : ''}
     GROUP BY payment_method`,
    branchId ? [branchId] : []
  );

  const totals = {
    cash: { count: 0, total: 0 },
    mpesa: { count: 0, total: 0 },
    card: { count: 0, total: 0 },
    bank_transfer: { count: 0, total: 0 },
    total: { count: 0, total: 0 },
  };

  result.rows.forEach(row => {
    totals[row.payment_method as keyof typeof totals] = {
      count: parseInt(row.count, 10),
      total: parseFloat(row.total),
    };
    totals.total.count += parseInt(row.count, 10);
    totals.total.total += parseFloat(row.total);
  });

  res.json({
    success: true,
    data: totals,
  });
});

export default {
  getPayments,
  getPayment,
  processPayment,
  initiateMpesaSTK,
  mpesaCallback,
  checkMpesaStatus,
  processRefund,
  getJobPaymentSummary,
  getTodayTotals,
};
