import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';
import { calculatePagination, buildPaginationClause, getStartOfDay, getEndOfDay } from '../utils/helpers';
import { transaction } from '../config/database';

/**
 * Get all expenses with filters
 * GET /api/v1/expenses
 */
export const getExpenses = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    category,
    date_from,
    date_to,
    is_approved,
    branch_id,
    page = 1,
    limit = 20,
  } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  const userBranchId = req.user?.branch_id;
  if (req.user?.role !== 'super_admin' && userBranchId) {
    conditions.push(`e.branch_id = $${paramIndex++}`);
    params.push(userBranchId);
  } else if (branch_id) {
    conditions.push(`e.branch_id = $${paramIndex++}`);
    params.push(branch_id);
  }

  if (category) {
    conditions.push(`e.category = $${paramIndex++}`);
    params.push(category);
  }

  if (date_from) {
    conditions.push(`e.expense_date >= $${paramIndex++}`);
    params.push(date_from);
  }

  if (date_to) {
    conditions.push(`e.expense_date <= $${paramIndex++}`);
    params.push(date_to);
  }

  if (is_approved !== undefined) {
    conditions.push(`e.is_approved = $${paramIndex++}`);
    params.push(is_approved === 'true');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM expenses e ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get expenses
  const { offset, limit: validLimit } = buildPaginationClause(Number(page), Number(limit));

  const result = await db.query(
    `SELECT e.*,
            b.name as branch_name,
            u1.name as recorded_by_name,
            u2.name as approved_by_name
     FROM expenses e
     LEFT JOIN branches b ON e.branch_id = b.id
     LEFT JOIN users u1 ON e.recorded_by = u1.id
     LEFT JOIN users u2 ON e.approved_by = u2.id
     ${whereClause}
     ORDER BY e.expense_date DESC, e.created_at DESC
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
 * Get expense by ID
 * GET /api/v1/expenses/:id
 */
export const getExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT e.*,
            b.name as branch_name,
            u1.name as recorded_by_name,
            u2.name as approved_by_name
     FROM expenses e
     LEFT JOIN branches b ON e.branch_id = b.id
     LEFT JOIN users u1 ON e.recorded_by = u1.id
     LEFT JOIN users u2 ON e.approved_by = u2.id
     WHERE e.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Expense not found',
    });
    return;
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

/**
 * Create expense
 * POST /api/v1/expenses
 */
export const createExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    category,
    description,
    amount,
    payment_method,
    reference_no,
    expense_date,
    notes,
  } = req.body;

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  const branchId = req.user.branch_id || 1;

  // Check for open cash session if paying with cash
  if (payment_method === 'cash') {
    const cashSession = await db.query(
      `SELECT id FROM cash_sessions WHERE branch_id = $1 AND status = 'open'`,
      [branchId]
    );

    if (cashSession.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.CASH_SESSION_NOT_OPEN,
      });
      return;
    }
  }

  const result = await transaction(async (client) => {
    // Create expense record
    const expenseResult = await client.query(
      `INSERT INTO expenses (category, description, amount, payment_method, reference_no, expense_date, branch_id, recorded_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [category, description, amount, payment_method, reference_no, expense_date, branchId, req.user!.id, notes]
    );

    // Update cash session if cash payment
    if (payment_method === 'cash') {
      await client.query(
        `UPDATE cash_sessions
         SET expenses_paid = expenses_paid + $1,
             expected_closing = opening_balance + cash_sales - expenses_paid - $1
         WHERE branch_id = $2 AND status = 'open'`,
        [amount, branchId]
      );
    }

    return expenseResult.rows[0];
  });

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.CREATED,
    data: result,
  });
});

/**
 * Update expense
 * PUT /api/v1/expenses/:id
 */
export const updateExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { category, description, amount, payment_method, reference_no, expense_date, notes } = req.body;

  // Check expense exists and is not approved
  const existing = await db.query(`SELECT * FROM expenses WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Expense not found',
    });
    return;
  }

  if (existing.rows[0].is_approved) {
    res.status(400).json({
      success: false,
      error: 'Cannot modify approved expense',
    });
    return;
  }

  const result = await db.query(
    `UPDATE expenses
     SET category = COALESCE($1, category),
         description = COALESCE($2, description),
         amount = COALESCE($3, amount),
         payment_method = COALESCE($4, payment_method),
         reference_no = COALESCE($5, reference_no),
         expense_date = COALESCE($6, expense_date),
         notes = COALESCE($7, notes),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8
     RETURNING *`,
    [category, description, amount, payment_method, reference_no, expense_date, notes, id]
  );

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.UPDATED,
    data: result.rows[0],
  });
});

/**
 * Approve expense
 * POST /api/v1/expenses/:id/approve
 */
export const approveExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  const result = await db.query(
    `UPDATE expenses
     SET is_approved = true,
         approved_by = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND is_approved = false
     RETURNING *`,
    [req.user.id, id]
  );

  if (result.rows.length === 0) {
    res.status(400).json({
      success: false,
      error: 'Expense not found or already approved',
    });
    return;
  }

  res.json({
    success: true,
    message: 'Expense approved successfully',
    data: result.rows[0],
  });
});

/**
 * Delete expense
 * DELETE /api/v1/expenses/:id
 */
export const deleteExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  // Check expense exists and is not approved
  const existing = await db.query(`SELECT * FROM expenses WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Expense not found',
    });
    return;
  }

  if (existing.rows[0].is_approved) {
    res.status(400).json({
      success: false,
      error: 'Cannot delete approved expense',
    });
    return;
  }

  await db.query(`DELETE FROM expenses WHERE id = $1`, [id]);

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.DELETED,
  });
});

/**
 * Get expense summary by category
 * GET /api/v1/expenses/summary
 */
export const getSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (branchId) {
    conditions.push(`branch_id = $${paramIndex++}`);
    params.push(branchId);
  }

  if (date_from) {
    conditions.push(`expense_date >= $${paramIndex++}`);
    params.push(date_from);
  }

  if (date_to) {
    conditions.push(`expense_date <= $${paramIndex++}`);
    params.push(date_to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT
       category,
       COUNT(*) as count,
       SUM(amount) as total,
       SUM(CASE WHEN is_approved THEN amount ELSE 0 END) as approved_total,
       SUM(CASE WHEN NOT is_approved THEN amount ELSE 0 END) as pending_total
     FROM expenses
     ${whereClause}
     GROUP BY category
     ORDER BY total DESC`,
    params
  );

  const totalResult = await db.query(
    `SELECT
       COUNT(*) as total_count,
       SUM(amount) as total_amount,
       COUNT(*) FILTER (WHERE NOT is_approved) as pending_count,
       SUM(amount) FILTER (WHERE NOT is_approved) as pending_amount
     FROM expenses
     ${whereClause}`,
    params
  );

  res.json({
    success: true,
    data: {
      by_category: result.rows,
      totals: totalResult.rows[0],
    },
  });
});

/**
 * Get today's expenses
 * GET /api/v1/expenses/today
 */
export const getTodayExpenses = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const branchId = req.user?.branch_id;
  const today = new Date();

  const result = await db.query(
    `SELECT e.*, u.name as recorded_by_name
     FROM expenses e
     LEFT JOIN users u ON e.recorded_by = u.id
     WHERE e.expense_date = $1
     ${branchId ? 'AND e.branch_id = $2' : ''}
     ORDER BY e.created_at DESC`,
    branchId ? [today.toISOString().split('T')[0], branchId] : [today.toISOString().split('T')[0]]
  );

  const totalResult = await db.query(
    `SELECT
       SUM(amount) as total,
       SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_total
     FROM expenses
     WHERE expense_date = $1
     ${branchId ? 'AND branch_id = $2' : ''}`,
    branchId ? [today.toISOString().split('T')[0], branchId] : [today.toISOString().split('T')[0]]
  );

  res.json({
    success: true,
    data: {
      expenses: result.rows,
      totals: totalResult.rows[0],
    },
  });
});

// ==================== CASH SESSIONS ====================

/**
 * Open cash session
 * POST /api/v1/expenses/cash-session/open
 */
export const openCashSession = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { opening_balance, notes } = req.body;

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  const branchId = req.user.branch_id || 1;

  // Check for existing open session
  const existingSession = await db.query(
    `SELECT id FROM cash_sessions WHERE branch_id = $1 AND status = 'open'`,
    [branchId]
  );

  if (existingSession.rows.length > 0) {
    res.status(400).json({
      success: false,
      error: 'A cash session is already open for this branch',
    });
    return;
  }

  const result = await db.query(
    `INSERT INTO cash_sessions (branch_id, opened_by, opening_balance, expected_closing, notes)
     VALUES ($1, $2, $3, $3, $4)
     RETURNING *`,
    [branchId, req.user.id, opening_balance, notes]
  );

  res.status(201).json({
    success: true,
    message: 'Cash session opened successfully',
    data: result.rows[0],
  });
});

/**
 * Get current cash session
 * GET /api/v1/expenses/cash-session/current
 */
export const getCurrentCashSession = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const branchId = req.user?.branch_id || req.query.branch_id;

  const result = await db.query(
    `SELECT cs.*, u.name as opened_by_name
     FROM cash_sessions cs
     LEFT JOIN users u ON cs.opened_by = u.id
     WHERE cs.status = 'open'
     ${branchId ? 'AND cs.branch_id = $1' : ''}
     ORDER BY cs.opened_at DESC
     LIMIT 1`,
    branchId ? [branchId] : []
  );

  if (result.rows.length === 0) {
    res.json({
      success: true,
      data: null,
      message: 'No open cash session',
    });
    return;
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

/**
 * Close cash session
 * POST /api/v1/expenses/cash-session/:id/close
 */
export const closeCashSession = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { actual_closing, notes } = req.body;

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  // Get session
  const session = await db.query(
    `SELECT * FROM cash_sessions WHERE id = $1 AND status = 'open'`,
    [id]
  );

  if (session.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Open cash session not found',
    });
    return;
  }

  const expectedClosing = parseFloat(session.rows[0].expected_closing);
  const variance = actual_closing - expectedClosing;

  const result = await db.query(
    `UPDATE cash_sessions
     SET status = 'closed',
         closed_by = $1,
         closed_at = CURRENT_TIMESTAMP,
         actual_closing = $2,
         variance = $3,
         notes = COALESCE(notes, '') || $4
     WHERE id = $5
     RETURNING *`,
    [req.user.id, actual_closing, variance, notes ? `\n${notes}` : '', id]
  );

  res.json({
    success: true,
    message: 'Cash session closed successfully',
    data: {
      ...result.rows[0],
      variance_status: variance === 0 ? 'balanced' : variance > 0 ? 'over' : 'short',
    },
  });
});

/**
 * Get cash session history
 * GET /api/v1/expenses/cash-session/history
 */
export const getCashSessionHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id, page = 1, limit = 20 } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (branchId) {
    conditions.push(`cs.branch_id = $${paramIndex++}`);
    params.push(branchId);
  }

  if (date_from) {
    conditions.push(`cs.opened_at >= $${paramIndex++}`);
    params.push(date_from);
  }

  if (date_to) {
    conditions.push(`cs.opened_at <= $${paramIndex++}`);
    params.push(date_to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(
    `SELECT COUNT(*) FROM cash_sessions cs ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { offset, limit: validLimit } = buildPaginationClause(Number(page), Number(limit));

  const result = await db.query(
    `SELECT cs.*,
            u1.name as opened_by_name,
            u2.name as closed_by_name,
            b.name as branch_name
     FROM cash_sessions cs
     LEFT JOIN users u1 ON cs.opened_by = u1.id
     LEFT JOIN users u2 ON cs.closed_by = u2.id
     LEFT JOIN branches b ON cs.branch_id = b.id
     ${whereClause}
     ORDER BY cs.opened_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, validLimit, offset]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: calculatePagination(total, Number(page), validLimit),
  });
});

export default {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  approveExpense,
  deleteExpense,
  getSummary,
  getTodayExpenses,
  openCashSession,
  getCurrentCashSession,
  closeCashSession,
  getCashSessionHistory,
};
