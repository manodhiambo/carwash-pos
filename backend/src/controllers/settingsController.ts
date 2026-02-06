import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';

/**
 * Get all public settings
 * GET /api/v1/settings
 */
export const getSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const isAdmin = req.user && ['super_admin', 'admin', 'manager'].includes(req.user.role);

  const result = await db.query(
    `SELECT key, value, description
     FROM system_settings
     ${isAdmin ? '' : 'WHERE is_public = true'}
     ORDER BY key ASC`
  );

  // Convert to key-value object
  const settings: Record<string, string> = {};
  result.rows.forEach(row => {
    settings[row.key] = row.value;
  });

  res.json({
    success: true,
    data: settings,
  });
});

/**
 * Get single setting by key
 * GET /api/v1/settings/:key
 */
export const getSetting = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { key } = req.params;
  const isAdmin = req.user && ['super_admin', 'admin', 'manager'].includes(req.user.role);

  const result = await db.query(
    `SELECT * FROM system_settings WHERE key = $1 ${isAdmin ? '' : 'AND is_public = true'}`,
    [key]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Setting not found',
    });
    return;
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

/**
 * Update setting
 * PUT /api/v1/settings/:key
 */
export const updateSetting = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { key } = req.params;
  const { value, description, is_public } = req.body;

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  const result = await db.query(
    `INSERT INTO system_settings (key, value, description, is_public, updated_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (key) DO UPDATE SET
       value = COALESCE($2, system_settings.value),
       description = COALESCE($3, system_settings.description),
       is_public = COALESCE($4, system_settings.is_public),
       updated_by = $5,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [key, value, description, is_public, req.user.id]
  );

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.UPDATED,
    data: result.rows[0],
  });
});

/**
 * Update multiple settings
 * PUT /api/v1/settings
 */
export const updateSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { settings } = req.body;

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  if (!settings || typeof settings !== 'object') {
    res.status(400).json({
      success: false,
      error: 'Settings object is required',
    });
    return;
  }

  const updates: Array<{ key: string; value: string }> = [];

  for (const [key, value] of Object.entries(settings)) {
    await db.query(
      `INSERT INTO system_settings (key, value, updated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET
         value = $2,
         updated_by = $3,
         updated_at = CURRENT_TIMESTAMP`,
      [key, String(value), req.user.id]
    );
    updates.push({ key, value: String(value) });
  }

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: updates,
  });
});

/**
 * Delete setting
 * DELETE /api/v1/settings/:key
 */
export const deleteSetting = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { key } = req.params;

  const result = await db.query(
    `DELETE FROM system_settings WHERE key = $1 RETURNING key`,
    [key]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Setting not found',
    });
    return;
  }

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.DELETED,
  });
});

// ==================== BRANCHES ====================

/**
 * Get all branches
 * GET /api/v1/settings/branches
 */
export const getBranches = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { is_active } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (is_active !== undefined) {
    conditions.push(`b.is_active = $${paramIndex++}`);
    params.push(is_active === 'true');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT b.*, u.name as manager_name,
            (SELECT COUNT(*) FROM users WHERE branch_id = b.id AND status = 'active') as staff_count,
            (SELECT COUNT(*) FROM bays WHERE branch_id = b.id AND is_active = true) as bay_count
     FROM branches b
     LEFT JOIN users u ON b.manager_id = u.id
     ${whereClause}
     ORDER BY b.name ASC`,
    params
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Get branch by ID
 * GET /api/v1/settings/branches/:id
 */
export const getBranch = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT b.*, u.name as manager_name, u.phone as manager_phone
     FROM branches b
     LEFT JOIN users u ON b.manager_id = u.id
     WHERE b.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Branch not found',
    });
    return;
  }

  // Get branch stats
  const statsResult = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE branch_id = $1 AND status = 'active') as staff_count,
       (SELECT COUNT(*) FROM bays WHERE branch_id = $1 AND is_active = true) as bay_count,
       (SELECT COUNT(*) FROM jobs WHERE branch_id = $1 AND DATE(created_at) = CURRENT_DATE) as today_jobs,
       (SELECT COALESCE(SUM(final_amount), 0) FROM jobs WHERE branch_id = $1 AND status = 'paid' AND DATE(created_at) = CURRENT_DATE) as today_revenue`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...result.rows[0],
      stats: statsResult.rows[0],
    },
  });
});

/**
 * Create branch
 * POST /api/v1/settings/branches
 */
export const createBranch = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, code, address, phone, email, manager_id, settings } = req.body;

  // Check for duplicate code
  const existing = await db.query(
    `SELECT id FROM branches WHERE code = $1`,
    [code.toUpperCase()]
  );

  if (existing.rows.length > 0) {
    res.status(409).json({
      success: false,
      error: 'Branch code already exists',
    });
    return;
  }

  const result = await db.query(
    `INSERT INTO branches (name, code, address, phone, email, manager_id, settings)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name, code.toUpperCase(), address, phone, email, manager_id, settings ? JSON.stringify(settings) : '{}']
  );

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.CREATED,
    data: result.rows[0],
  });
});

/**
 * Update branch
 * PUT /api/v1/settings/branches/:id
 */
export const updateBranch = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, code, address, phone, email, manager_id, is_active, settings } = req.body;

  // Check code uniqueness if changing
  if (code) {
    const existing = await db.query(
      `SELECT id FROM branches WHERE code = $1 AND id != $2`,
      [code.toUpperCase(), id]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Branch code already exists',
      });
      return;
    }
  }

  const result = await db.query(
    `UPDATE branches
     SET name = COALESCE($1, name),
         code = COALESCE($2, code),
         address = COALESCE($3, address),
         phone = COALESCE($4, phone),
         email = COALESCE($5, email),
         manager_id = COALESCE($6, manager_id),
         is_active = COALESCE($7, is_active),
         settings = COALESCE($8, settings),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $9
     RETURNING *`,
    [
      name,
      code ? code.toUpperCase() : null,
      address,
      phone,
      email,
      manager_id,
      is_active,
      settings ? JSON.stringify(settings) : null,
      id,
    ]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Branch not found',
    });
    return;
  }

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.UPDATED,
    data: result.rows[0],
  });
});

/**
 * Delete branch
 * DELETE /api/v1/settings/branches/:id
 */
export const deleteBranch = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  // Check for related records
  const hasData = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM jobs WHERE branch_id = $1) +
       (SELECT COUNT(*) FROM users WHERE branch_id = $1) as count`,
    [id]
  );

  if (parseInt(hasData.rows[0].count, 10) > 0) {
    // Soft delete
    await db.query(
      `UPDATE branches SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'Branch deactivated (has related data)',
    });
    return;
  }

  await db.query(`DELETE FROM branches WHERE id = $1`, [id]);

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.DELETED,
  });
});

// ==================== PROMOTIONS ====================

/**
 * Get all promotions
 * GET /api/v1/settings/promotions
 */
export const getPromotions = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { is_active, branch_id } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (is_active !== undefined) {
    conditions.push(`p.is_active = $${paramIndex++}`);
    params.push(is_active === 'true');
  }

  if (branchId) {
    conditions.push(`(p.branch_id = $${paramIndex++} OR p.branch_id IS NULL)`);
    params.push(branchId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT p.*, u.name as created_by_name
     FROM promotions p
     LEFT JOIN users u ON p.created_by = u.id
     ${whereClause}
     ORDER BY p.end_date DESC`,
    params
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Create promotion
 * POST /api/v1/settings/promotions
 */
export const createPromotion = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    name,
    description,
    discount_type,
    discount_value,
    min_purchase,
    max_discount,
    start_date,
    end_date,
    applicable_services,
    applicable_vehicle_types,
    usage_limit,
    promo_code,
  } = req.body;

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  const branchId = req.body.branch_id || req.user.branch_id;

  // Check promo code uniqueness
  if (promo_code) {
    const existing = await db.query(
      `SELECT id FROM promotions WHERE promo_code = $1`,
      [promo_code.toUpperCase()]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Promo code already exists',
      });
      return;
    }
  }

  const result = await db.query(
    `INSERT INTO promotions (
      name, description, discount_type, discount_value, min_purchase, max_discount,
      start_date, end_date, applicable_services, applicable_vehicle_types,
      usage_limit, promo_code, branch_id, created_by
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      name,
      description,
      discount_type,
      discount_value,
      min_purchase || 0,
      max_discount,
      start_date,
      end_date,
      applicable_services ? JSON.stringify(applicable_services) : '[]',
      applicable_vehicle_types ? JSON.stringify(applicable_vehicle_types) : '[]',
      usage_limit,
      promo_code ? promo_code.toUpperCase() : null,
      branchId,
      req.user.id,
    ]
  );

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.CREATED,
    data: result.rows[0],
  });
});

/**
 * Validate and apply promo code
 * POST /api/v1/settings/promotions/validate
 */
export const validatePromoCode = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { promo_code, amount, vehicle_type, service_ids } = req.body;

  const result = await db.query(
    `SELECT * FROM promotions
     WHERE promo_code = $1
     AND is_active = true
     AND start_date <= CURRENT_TIMESTAMP
     AND end_date >= CURRENT_TIMESTAMP
     AND (usage_limit IS NULL OR times_used < usage_limit)`,
    [promo_code.toUpperCase()]
  );

  if (result.rows.length === 0) {
    res.status(400).json({
      success: false,
      error: 'Invalid or expired promo code',
    });
    return;
  }

  const promo = result.rows[0];

  // Check minimum purchase
  if (amount < promo.min_purchase) {
    res.status(400).json({
      success: false,
      error: `Minimum purchase of KES ${promo.min_purchase} required`,
    });
    return;
  }

  // Check vehicle type
  const applicableVehicles = promo.applicable_vehicle_types || [];
  if (applicableVehicles.length > 0 && !applicableVehicles.includes(vehicle_type)) {
    res.status(400).json({
      success: false,
      error: 'Promo code not applicable for this vehicle type',
    });
    return;
  }

  // Calculate discount
  let discount: number;
  if (promo.discount_type === 'percentage') {
    discount = (amount * promo.discount_value) / 100;
  } else {
    discount = promo.discount_value;
  }

  // Apply max discount cap
  if (promo.max_discount && discount > promo.max_discount) {
    discount = promo.max_discount;
  }

  res.json({
    success: true,
    data: {
      promo_id: promo.id,
      promo_name: promo.name,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      calculated_discount: discount,
      final_amount: amount - discount,
    },
  });
});

/**
 * Update promotion
 * PUT /api/v1/settings/promotions/:id
 */
export const updatePromotion = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const {
    name,
    description,
    discount_type,
    discount_value,
    min_purchase,
    max_discount,
    start_date,
    end_date,
    applicable_services,
    applicable_vehicle_types,
    usage_limit,
    is_active,
  } = req.body;

  const result = await db.query(
    `UPDATE promotions
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         discount_type = COALESCE($3, discount_type),
         discount_value = COALESCE($4, discount_value),
         min_purchase = COALESCE($5, min_purchase),
         max_discount = COALESCE($6, max_discount),
         start_date = COALESCE($7, start_date),
         end_date = COALESCE($8, end_date),
         applicable_services = COALESCE($9, applicable_services),
         applicable_vehicle_types = COALESCE($10, applicable_vehicle_types),
         usage_limit = COALESCE($11, usage_limit),
         is_active = COALESCE($12, is_active),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $13
     RETURNING *`,
    [
      name,
      description,
      discount_type,
      discount_value,
      min_purchase,
      max_discount,
      start_date,
      end_date,
      applicable_services ? JSON.stringify(applicable_services) : null,
      applicable_vehicle_types ? JSON.stringify(applicable_vehicle_types) : null,
      usage_limit,
      is_active,
      id,
    ]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Promotion not found',
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
  getSettings,
  getSetting,
  updateSetting,
  updateSettings,
  deleteSetting,
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  getPromotions,
  createPromotion,
  validatePromoCode,
  updatePromotion,
};
