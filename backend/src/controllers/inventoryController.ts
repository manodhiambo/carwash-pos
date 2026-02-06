import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';
import { calculatePagination, buildPaginationClause } from '../utils/helpers';
import { transaction } from '../config/database';

/**
 * Get all inventory items
 * GET /api/v1/inventory
 */
export const getItems = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    search,
    category,
    low_stock,
    branch_id,
    page = 1,
    limit = 20,
  } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  const userBranchId = req.user?.branch_id;
  if (req.user?.role !== 'super_admin' && userBranchId) {
    conditions.push(`i.branch_id = $${paramIndex++}`);
    params.push(userBranchId);
  } else if (branch_id) {
    conditions.push(`i.branch_id = $${paramIndex++}`);
    params.push(branch_id);
  }

  if (search) {
    conditions.push(`(i.name ILIKE $${paramIndex} OR i.sku ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (category) {
    conditions.push(`i.category = $${paramIndex++}`);
    params.push(category);
  }

  if (low_stock === 'true') {
    conditions.push(`i.quantity <= i.reorder_level`);
  }

  conditions.push(`i.is_active = true`);

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM inventory_items i ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get items
  const { offset, limit: validLimit } = buildPaginationClause(Number(page), Number(limit));

  const result = await db.query(
    `SELECT i.*, s.name as supplier_name, b.name as branch_name,
            CASE WHEN i.quantity <= i.reorder_level THEN true ELSE false END as is_low_stock
     FROM inventory_items i
     LEFT JOIN suppliers s ON i.supplier_id = s.id
     LEFT JOIN branches b ON i.branch_id = b.id
     ${whereClause}
     ORDER BY
       CASE WHEN i.quantity <= i.reorder_level THEN 0 ELSE 1 END,
       i.name ASC
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
 * Get inventory item by ID
 * GET /api/v1/inventory/:id
 */
export const getItem = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT i.*, s.name as supplier_name, s.phone as supplier_phone
     FROM inventory_items i
     LEFT JOIN suppliers s ON i.supplier_id = s.id
     WHERE i.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Inventory item not found',
    });
    return;
  }

  // Get recent transactions
  const transactionsResult = await db.query(
    `SELECT t.*, u.name as performed_by_name
     FROM inventory_transactions t
     LEFT JOIN users u ON t.performed_by = u.id
     WHERE t.item_id = $1
     ORDER BY t.created_at DESC
     LIMIT 20`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...result.rows[0],
      recent_transactions: transactionsResult.rows,
    },
  });
});

/**
 * Create inventory item
 * POST /api/v1/inventory
 */
export const createItem = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    name,
    description,
    category,
    sku,
    unit,
    quantity = 0,
    reorder_level = 10,
    unit_cost = 0,
    supplier_id,
  } = req.body;

  const branchId = req.user?.branch_id || 1;

  // Check for duplicate SKU in branch
  if (sku) {
    const existing = await db.query(
      `SELECT id FROM inventory_items WHERE sku = $1 AND branch_id = $2`,
      [sku, branchId]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Item with this SKU already exists in this branch',
      });
      return;
    }
  }

  const result = await db.query(
    `INSERT INTO inventory_items (name, description, category, sku, unit, quantity, reorder_level, unit_cost, branch_id, supplier_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [name, description, category, sku, unit, quantity, reorder_level, unit_cost, branchId, supplier_id]
  );

  // Log initial stock if any
  if (quantity > 0 && req.user) {
    await db.query(
      `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, previous_quantity, new_quantity, unit_cost, total_cost, performed_by, notes)
       VALUES ($1, 'stock_in', $2, 0, $2, $3, $4, $5, 'Initial stock')`,
      [result.rows[0].id, quantity, unit_cost, quantity * unit_cost, req.user.id]
    );
  }

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.CREATED,
    data: result.rows[0],
  });
});

/**
 * Update inventory item
 * PUT /api/v1/inventory/:id
 */
export const updateItem = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, description, category, sku, unit, reorder_level, unit_cost, supplier_id, is_active } = req.body;

  const existing = await db.query(`SELECT * FROM inventory_items WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Inventory item not found',
    });
    return;
  }

  const result = await db.query(
    `UPDATE inventory_items
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         category = COALESCE($3, category),
         sku = COALESCE($4, sku),
         unit = COALESCE($5, unit),
         reorder_level = COALESCE($6, reorder_level),
         unit_cost = COALESCE($7, unit_cost),
         supplier_id = COALESCE($8, supplier_id),
         is_active = COALESCE($9, is_active),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $10
     RETURNING *`,
    [name, description, category, sku, unit, reorder_level, unit_cost, supplier_id, is_active, id]
  );

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.UPDATED,
    data: result.rows[0],
  });
});

/**
 * Record stock transaction (in/out/adjustment)
 * POST /api/v1/inventory/transaction
 */
export const recordTransaction = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { item_id, transaction_type, quantity, unit_cost, reference, job_id, notes } = req.body;

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  const userId = req.user.id;

  // Get current item
  const item = await db.query(`SELECT * FROM inventory_items WHERE id = $1`, [item_id]);
  if (item.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Inventory item not found',
    });
    return;
  }

  const currentQuantity = parseFloat(item.rows[0].quantity);
  let newQuantity: number;

  switch (transaction_type) {
    case 'stock_in':
      newQuantity = currentQuantity + quantity;
      break;
    case 'stock_out':
    case 'waste':
      if (currentQuantity < quantity) {
        res.status(400).json({
          success: false,
          error: ERROR_MESSAGES.INSUFFICIENT_INVENTORY,
        });
        return;
      }
      newQuantity = currentQuantity - quantity;
      break;
    case 'adjustment':
      newQuantity = quantity; // Direct set to new value
      break;
    default:
      newQuantity = currentQuantity;
  }

  const actualUnitCost = unit_cost || item.rows[0].unit_cost;
  const totalCost = transaction_type === 'adjustment'
    ? Math.abs(newQuantity - currentQuantity) * actualUnitCost
    : quantity * actualUnitCost;

  await transaction(async (client) => {
    // Update item quantity
    await client.query(
      `UPDATE inventory_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newQuantity, item_id]
    );

    // Record transaction
    await client.query(
      `INSERT INTO inventory_transactions
       (item_id, transaction_type, quantity, previous_quantity, new_quantity, unit_cost, total_cost, reference, job_id, performed_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        item_id,
        transaction_type,
        transaction_type === 'adjustment' ? Math.abs(newQuantity - currentQuantity) : quantity,
        currentQuantity,
        newQuantity,
        actualUnitCost,
        totalCost,
        reference,
        job_id,
        userId,
        notes,
      ]
    );
  });

  res.json({
    success: true,
    message: 'Stock transaction recorded successfully',
    data: {
      item_id,
      previous_quantity: currentQuantity,
      new_quantity: newQuantity,
      transaction_type,
    },
  });
});

/**
 * Get low stock items
 * GET /api/v1/inventory/low-stock
 */
export const getLowStockItems = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const branchId = req.user?.branch_id;

  const result = await db.query(
    `SELECT i.*, s.name as supplier_name, s.phone as supplier_phone
     FROM inventory_items i
     LEFT JOIN suppliers s ON i.supplier_id = s.id
     WHERE i.quantity <= i.reorder_level
     AND i.is_active = true
     ${branchId ? 'AND i.branch_id = $1' : ''}
     ORDER BY (i.quantity / NULLIF(i.reorder_level, 0)) ASC`,
    branchId ? [branchId] : []
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Get stock transactions for an item
 * GET /api/v1/inventory/:id/transactions
 */
export const getItemTransactions = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { page = 1, limit = 20, date_from, date_to } = req.query;

  const conditions: string[] = ['t.item_id = $1'];
  const params: unknown[] = [id];
  let paramIndex = 2;

  if (date_from) {
    conditions.push(`t.created_at >= $${paramIndex++}`);
    params.push(date_from);
  }

  if (date_to) {
    conditions.push(`t.created_at <= $${paramIndex++}`);
    params.push(date_to);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await db.query(
    `SELECT COUNT(*) FROM inventory_transactions t ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { offset, limit: validLimit } = buildPaginationClause(Number(page), Number(limit));

  const result = await db.query(
    `SELECT t.*, u.name as performed_by_name, j.job_no
     FROM inventory_transactions t
     LEFT JOIN users u ON t.performed_by = u.id
     LEFT JOIN jobs j ON t.job_id = j.id
     ${whereClause}
     ORDER BY t.created_at DESC
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
 * Get inventory value summary
 * GET /api/v1/inventory/value-summary
 */
export const getValueSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const branchId = req.user?.branch_id;

  const result = await db.query(
    `SELECT
       category,
       COUNT(*) as item_count,
       SUM(quantity) as total_quantity,
       SUM(quantity * unit_cost) as total_value
     FROM inventory_items
     WHERE is_active = true
     ${branchId ? 'AND branch_id = $1' : ''}
     GROUP BY category
     ORDER BY total_value DESC`,
    branchId ? [branchId] : []
  );

  const totalResult = await db.query(
    `SELECT
       COUNT(*) as total_items,
       SUM(quantity * unit_cost) as total_value,
       COUNT(*) FILTER (WHERE quantity <= reorder_level) as low_stock_count
     FROM inventory_items
     WHERE is_active = true
     ${branchId ? 'AND branch_id = $1' : ''}`,
    branchId ? [branchId] : []
  );

  res.json({
    success: true,
    data: {
      by_category: result.rows,
      summary: totalResult.rows[0],
    },
  });
});

// ==================== SUPPLIERS ====================

/**
 * Get all suppliers
 * GET /api/v1/inventory/suppliers
 */
export const getSuppliers = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { search, is_active } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (search) {
    conditions.push(`(name ILIKE $${paramIndex} OR contact_person ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (is_active !== undefined) {
    conditions.push(`is_active = $${paramIndex++}`);
    params.push(is_active === 'true');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT s.*,
            (SELECT COUNT(*) FROM inventory_items WHERE supplier_id = s.id) as item_count
     FROM suppliers s
     ${whereClause}
     ORDER BY s.name ASC`,
    params
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Create supplier
 * POST /api/v1/inventory/suppliers
 */
export const createSupplier = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, contact_person, phone, email, address, notes } = req.body;

  const result = await db.query(
    `INSERT INTO suppliers (name, contact_person, phone, email, address, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, contact_person, phone, email, address, notes]
  );

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.CREATED,
    data: result.rows[0],
  });
});

/**
 * Update supplier
 * PUT /api/v1/inventory/suppliers/:id
 */
export const updateSupplier = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, contact_person, phone, email, address, notes, is_active } = req.body;

  const result = await db.query(
    `UPDATE suppliers
     SET name = COALESCE($1, name),
         contact_person = COALESCE($2, contact_person),
         phone = COALESCE($3, phone),
         email = COALESCE($4, email),
         address = COALESCE($5, address),
         notes = COALESCE($6, notes),
         is_active = COALESCE($7, is_active),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8
     RETURNING *`,
    [name, contact_person, phone, email, address, notes, is_active, id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Supplier not found',
    });
    return;
  }

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.UPDATED,
    data: result.rows[0],
  });
});

export default {
  getItems,
  getItem,
  createItem,
  updateItem,
  recordTransaction,
  getLowStockItems,
  getItemTransactions,
  getValueSummary,
  getSuppliers,
  createSupplier,
  updateSupplier,
};
