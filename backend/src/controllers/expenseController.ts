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
    status,
    payment_method,
    date_from,
    date_to,
    vendor,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Branch filter
  const branchId = req.user?.branch_id;
  if (req.user?.role !== 'super_admin' && branchId) {
    conditions.push(`e.branch_id = $${paramIndex++}`);
    params.push(branchId);
  }

  if (category) {
    conditions.push(`e.category = $${paramIndex++}`);
    params.push(category);
  }

  if (status) {
    conditions.push(`e.status = $${paramIndex++}`);
    params.push(status);
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

  if (vendor) {
    conditions.push(`e.vendor ILIKE $${paramIndex++}`);
    params.push(`%${vendor}%`);
  }

  if (search) {
    conditions.push(`(e.description ILIKE $${paramIndex} OR e.vendor ILIKE $${paramIndex} OR e.reference ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
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
    `SELECT 
      e.*,
      u.name as created_by_name,
      b.name as branch_name
     FROM expenses e
     LEFT JOIN users u ON e.created_by = u.id
     LEFT JOIN branches b ON e.branch_id = b.id
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
 * Get single expense by ID
 * GET /api/v1/expenses/:id
 */
export const getExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT 
      e.*,
      u.name as created_by_name,
      b.name as branch_name
     FROM expenses e
     LEFT JOIN users u ON e.created_by = u.id
     LEFT JOIN branches b ON e.branch_id = b.id
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
 * Create new expense
 * POST /api/v1/expenses
 */
export const createExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    category,
    description,
    amount,
    expense_date,
    payment_method,
    vendor,
    reference,
    notes,
    receipt_url,
  } = req.body;

  if (!category || !description || !amount || !expense_date || !payment_method) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: category, description, amount, expense_date, payment_method',
    });
    return;
  }

  const branchId = req.user?.branch_id || 1;
  const userId = req.user!.id;

  const result = await db.query(
    `INSERT INTO expenses (
      category, description, amount, expense_date, payment_method,
      vendor, reference, notes, receipt_url, branch_id, created_by, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'approved')
    RETURNING *`,
    [
      category,
      description,
      amount,
      expense_date,
      payment_method,
      vendor,
      reference,
      notes,
      receipt_url,
      branchId,
      userId,
    ]
  );

  res.status(201).json({
    success: true,
    message: 'Expense created successfully',
    data: result.rows[0],
  });
});

/**
 * Update expense
 * PUT /api/v1/expenses/:id
 */
export const updateExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const {
    category,
    description,
    amount,
    expense_date,
    payment_method,
    vendor,
    reference,
    notes,
    receipt_url,
    status,
  } = req.body;

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    params.push(category);
  }

  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(description);
  }

  if (amount !== undefined) {
    updates.push(`amount = $${paramIndex++}`);
    params.push(amount);
  }

  if (expense_date !== undefined) {
    updates.push(`expense_date = $${paramIndex++}`);
    params.push(expense_date);
  }

  if (payment_method !== undefined) {
    updates.push(`payment_method = $${paramIndex++}`);
    params.push(payment_method);
  }

  if (vendor !== undefined) {
    updates.push(`vendor = $${paramIndex++}`);
    params.push(vendor);
  }

  if (reference !== undefined) {
    updates.push(`reference = $${paramIndex++}`);
    params.push(reference);
  }

  if (notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    params.push(notes);
  }

  if (receipt_url !== undefined) {
    updates.push(`receipt_url = $${paramIndex++}`);
    params.push(receipt_url);
  }

  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  if (updates.length === 0) {
    res.status(400).json({
      success: false,
      error: 'No fields to update',
    });
    return;
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  const result = await db.query(
    `UPDATE expenses 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
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
    message: 'Expense updated successfully',
    data: result.rows[0],
  });
});

/**
 * Delete expense
 * DELETE /api/v1/expenses/:id
 */
export const deleteExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `DELETE FROM expenses WHERE id = $1 RETURNING id`,
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
    message: 'Expense deleted successfully',
  });
});

/**
 * Get expense summary/statistics
 * GET /api/v1/expenses/summary
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
      COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved_amount
     FROM expenses
     ${whereClause}`,
    params
  );

  res.json({
    success: true,
    data: result.rows[0],
  });
});

export default {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
};
