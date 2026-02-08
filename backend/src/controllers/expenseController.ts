import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { buildPaginationClause, calculatePagination } from '../utils/helpers';

/**
 * Get all expenses with filters
 * GET /api/v1/expenses
 */
export const getExpenses = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    category,
    payment_method,
    date_from,
    date_to,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  const branchId = req.user?.branch_id;
  if (req.user?.role !== 'super_admin' && branchId) {
    conditions.push(`e.branch_id = $${paramIndex++}`);
    params.push(branchId);
  }

  if (category) {
    conditions.push(`e.category = $${paramIndex++}`);
    params.push(category);
  }

  if (payment_method) {
    conditions.push(`e.payment_method = $${paramIndex++}`);
    params.push(payment_method);
  }

  if (date_from) {
    conditions.push(`e.expense_date >= $${paramIndex++}`);
    params.push(date_from);
  }

  if (date_to) {
    conditions.push(`e.expense_date <= $${paramIndex++}`);
    params.push(date_to);
  }

  if (search) {
    conditions.push(`(e.description ILIKE $${paramIndex} OR e.reference_no ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(`SELECT COUNT(*) FROM expenses e ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const { offset, limit: validLimit } = buildPaginationClause(Number(page), Number(limit));

  const result = await db.query(
    `SELECT 
      e.*,
      u.name as created_by_name,
      b.name as branch_name
     FROM expenses e
     LEFT JOIN users u ON e.recorded_by = u.id
     LEFT JOIN branches b ON e.branch_id = b.id
     ${whereClause}
     ORDER BY e.expense_date DESC, e.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, validLimit, offset]
  );

  res.json({
    success: true,
    data: result.rows.map(row => ({
      ...row,
      status: row.is_approved ? 'approved' : 'pending',
      reference: row.reference_no,
      vendor: '-',
    })),
    pagination: calculatePagination(total, Number(page), validLimit),
  });
});

/**
 * Get single expense
 */
export const getExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT e.*, u.name as created_by_name, b.name as branch_name
     FROM expenses e
     LEFT JOIN users u ON e.recorded_by = u.id
     LEFT JOIN branches b ON e.branch_id = b.id
     WHERE e.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ success: false, error: 'Expense not found' });
    return;
  }

  res.json({ success: true, data: result.rows[0] });
});

/**
 * Create new expense
 */
export const createExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    category,
    description,
    amount,
    expense_date,
    payment_method,
    reference,
    notes,
    receipt_url,
  } = req.body;

  if (!category || !description || !amount || !expense_date || !payment_method) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields',
    });
    return;
  }

  const branchId = req.user?.branch_id || 1;
  const userId = req.user!.id;

  const result = await db.query(
    `INSERT INTO expenses (
      category, description, amount, expense_date, payment_method,
      reference_no, notes, receipt_url, branch_id, recorded_by, is_approved
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
    RETURNING *`,
    [category, description, amount, expense_date, payment_method, reference, notes, receipt_url, branchId, userId]
  );

  res.status(201).json({
    success: true,
    message: 'Expense created successfully',
    data: result.rows[0],
  });
});

/**
 * Update expense
 */
export const updateExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { category, description, amount, expense_date, payment_method, reference, notes } = req.body;

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (category) { updates.push(`category = $${paramIndex++}`); params.push(category); }
  if (description) { updates.push(`description = $${paramIndex++}`); params.push(description); }
  if (amount) { updates.push(`amount = $${paramIndex++}`); params.push(amount); }
  if (expense_date) { updates.push(`expense_date = $${paramIndex++}`); params.push(expense_date); }
  if (payment_method) { updates.push(`payment_method = $${paramIndex++}`); params.push(payment_method); }
  if (reference) { updates.push(`reference_no = $${paramIndex++}`); params.push(reference); }
  if (notes) { updates.push(`notes = $${paramIndex++}`); params.push(notes); }

  if (updates.length === 0) {
    res.status(400).json({ success: false, error: 'No fields to update' });
    return;
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  const result = await db.query(
    `UPDATE expenses SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    res.status(404).json({ success: false, error: 'Expense not found' });
    return;
  }

  res.json({ success: true, message: 'Expense updated successfully', data: result.rows[0] });
});

/**
 * Delete expense
 */
export const deleteExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await db.query(`DELETE FROM expenses WHERE id = $1 RETURNING id`, [id]);

  if (result.rows.length === 0) {
    res.status(404).json({ success: false, error: 'Expense not found' });
    return;
  }

  res.json({ success: true, message: 'Expense deleted successfully' });
});

/**
 * Get expense summary
 */
export const getExpenseSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to } = req.query;
  const branchId = req.user?.branch_id;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (req.user?.role !== 'super_admin' && branchId) {
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
      COUNT(*) as total_expenses,
      COALESCE(SUM(amount), 0) as total_amount,
      COALESCE(SUM(CASE WHEN is_approved = false THEN amount ELSE 0 END), 0) as pending_amount,
      COALESCE(SUM(CASE WHEN is_approved = true THEN amount ELSE 0 END), 0) as approved_amount
     FROM expenses
     ${whereClause}`,
    params
  );

  res.json({ success: true, data: result.rows[0] });
});

export default {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
};
