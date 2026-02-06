import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';
import { formatPhoneNumber, calculatePagination, buildPaginationClause } from '../utils/helpers';

/**
 * Get all customers with filters and pagination
 * GET /api/v1/customers
 */
export const getCustomers = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    search,
    customer_type,
    is_vip,
    page = 1,
    limit = 20,
    sort_by = 'created_at',
    sort_dir = 'desc',
  } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (search) {
    conditions.push(`(c.name ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (customer_type) {
    conditions.push(`c.customer_type = $${paramIndex++}`);
    params.push(customer_type);
  }

  if (is_vip !== undefined) {
    conditions.push(`c.is_vip = $${paramIndex++}`);
    params.push(is_vip === 'true');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM customers c ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get customers
  const { offset, limit: validLimit } = buildPaginationClause(Number(page), Number(limit));
  const allowedSortFields = ['name', 'phone', 'total_visits', 'total_spent', 'loyalty_points', 'created_at'];
  const sortField = allowedSortFields.includes(sort_by as string) ? sort_by : 'created_at';
  const sortDirection = sort_dir === 'asc' ? 'ASC' : 'DESC';

  const result = await db.query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM vehicles v WHERE v.customer_id = c.id) as vehicle_count,
            (SELECT MAX(j.created_at) FROM jobs j WHERE j.customer_id = c.id) as last_visit
     FROM customers c
     ${whereClause}
     ORDER BY c.${sortField} ${sortDirection}
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
 * Get customer by ID
 * GET /api/v1/customers/:id
 */
export const getCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT c.* FROM customers c WHERE c.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
    });
    return;
  }

  // Get customer's vehicles
  const vehiclesResult = await db.query(
    `SELECT v.* FROM vehicles v WHERE v.customer_id = $1 ORDER BY v.created_at DESC`,
    [id]
  );

  // Get recent service history
  const historyResult = await db.query(
    `SELECT j.id, j.job_no, j.status, j.final_amount, j.created_at,
            v.registration_no, v.vehicle_type,
            ARRAY_AGG(s.name) as services
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     LEFT JOIN job_services js ON j.id = js.job_id
     LEFT JOIN services s ON js.service_id = s.id
     WHERE j.customer_id = $1
     GROUP BY j.id, v.id
     ORDER BY j.created_at DESC
     LIMIT 10`,
    [id]
  );

  // Get active subscription
  const subscriptionResult = await db.query(
    `SELECT cs.*, sp.name as plan_name, v.registration_no
     FROM customer_subscriptions cs
     JOIN subscription_plans sp ON cs.plan_id = sp.id
     JOIN vehicles v ON cs.vehicle_id = v.id
     WHERE cs.customer_id = $1 AND cs.status = 'active'
     LIMIT 1`,
    [id]
  );

  // Get loyalty history
  const loyaltyResult = await db.query(
    `SELECT lt.*, j.job_no
     FROM loyalty_transactions lt
     LEFT JOIN jobs j ON lt.job_id = j.id
     WHERE lt.customer_id = $1
     ORDER BY lt.created_at DESC
     LIMIT 10`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...result.rows[0],
      vehicles: vehiclesResult.rows,
      service_history: historyResult.rows,
      active_subscription: subscriptionResult.rows[0] || null,
      loyalty_history: loyaltyResult.rows,
    },
  });
});

/**
 * Get customer by phone number
 * GET /api/v1/customers/phone/:phone
 */
export const getCustomerByPhone = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { phone } = req.params;

  const result = await db.query(
    `SELECT c.* FROM customers c WHERE c.phone = $1 OR c.phone = $2`,
    [phone, formatPhoneNumber(phone)]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
    });
    return;
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

/**
 * Create new customer
 * POST /api/v1/customers
 */
export const createCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    name,
    phone,
    email,
    customer_type = 'individual',
    company_name,
    address,
    is_vip = false,
    notes,
  } = req.body;

  // Check if phone already exists
  const existing = await db.query(
    `SELECT id FROM customers WHERE phone = $1`,
    [formatPhoneNumber(phone)]
  );

  if (existing.rows.length > 0) {
    res.status(409).json({
      success: false,
      error: 'Customer with this phone number already exists',
      data: { id: existing.rows[0].id },
    });
    return;
  }

  const result = await db.query(
    `INSERT INTO customers (name, phone, email, customer_type, company_name, address, is_vip, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [name, formatPhoneNumber(phone), email, customer_type, company_name, address, is_vip, notes]
  );

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.CREATED,
    data: result.rows[0],
  });
});

/**
 * Update customer
 * PUT /api/v1/customers/:id
 */
export const updateCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, phone, email, customer_type, company_name, address, is_vip, notes } = req.body;

  // Check if customer exists
  const existing = await db.query(`SELECT id FROM customers WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
    });
    return;
  }

  // Check if phone is taken by another customer
  if (phone) {
    const phoneTaken = await db.query(
      `SELECT id FROM customers WHERE phone = $1 AND id != $2`,
      [formatPhoneNumber(phone), id]
    );
    if (phoneTaken.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Phone number is already registered to another customer',
      });
      return;
    }
  }

  const result = await db.query(
    `UPDATE customers
     SET name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         email = COALESCE($3, email),
         customer_type = COALESCE($4, customer_type),
         company_name = COALESCE($5, company_name),
         address = COALESCE($6, address),
         is_vip = COALESCE($7, is_vip),
         notes = COALESCE($8, notes),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $9
     RETURNING *`,
    [name, phone ? formatPhoneNumber(phone) : null, email, customer_type, company_name, address, is_vip, notes, id]
  );

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.UPDATED,
    data: result.rows[0],
  });
});

/**
 * Delete customer
 * DELETE /api/v1/customers/:id
 */
export const deleteCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  // Check for existing jobs
  const hasJobs = await db.query(
    `SELECT id FROM jobs WHERE customer_id = $1 LIMIT 1`,
    [id]
  );

  if (hasJobs.rows.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Cannot delete customer with existing job records',
    });
    return;
  }

  // Remove customer link from vehicles
  await db.query(
    `UPDATE vehicles SET customer_id = NULL WHERE customer_id = $1`,
    [id]
  );

  const result = await db.query(
    `DELETE FROM customers WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
    });
    return;
  }

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.DELETED,
  });
});

/**
 * Get customer's vehicles
 * GET /api/v1/customers/:id/vehicles
 */
export const getCustomerVehicles = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT v.*,
            (SELECT COUNT(*) FROM jobs j WHERE j.vehicle_id = v.id) as total_washes,
            (SELECT MAX(created_at) FROM jobs j WHERE j.vehicle_id = v.id) as last_wash
     FROM vehicles v
     WHERE v.customer_id = $1
     ORDER BY v.created_at DESC`,
    [id]
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Get customer's service history
 * GET /api/v1/customers/:id/history
 */
export const getCustomerHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const countResult = await db.query(
    `SELECT COUNT(*) FROM jobs WHERE customer_id = $1`,
    [id]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { offset, limit: validLimit } = buildPaginationClause(Number(page), Number(limit));

  const result = await db.query(
    `SELECT j.*, v.registration_no, v.vehicle_type,
            ARRAY_AGG(JSON_BUILD_OBJECT('name', s.name, 'price', js.total)) as services
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     LEFT JOIN job_services js ON j.id = js.job_id
     LEFT JOIN services s ON js.service_id = s.id
     WHERE j.customer_id = $1
     GROUP BY j.id, v.id
     ORDER BY j.created_at DESC
     LIMIT $2 OFFSET $3`,
    [id, validLimit, offset]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: calculatePagination(total, Number(page), validLimit),
  });
});

/**
 * Adjust loyalty points
 * POST /api/v1/customers/:id/loyalty
 */
export const adjustLoyaltyPoints = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { points, transaction_type, description } = req.body;

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  // Check customer exists
  const customer = await db.query(`SELECT id, loyalty_points FROM customers WHERE id = $1`, [id]);
  if (customer.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
    });
    return;
  }

  const currentPoints = customer.rows[0].loyalty_points;
  const adjustmentPoints = transaction_type === 'redeemed' || transaction_type === 'expired' ? -Math.abs(points) : points;
  const newPoints = Math.max(0, currentPoints + adjustmentPoints);

  // Update customer points
  await db.query(
    `UPDATE customers SET loyalty_points = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [newPoints, id]
  );

  // Log transaction
  await db.query(
    `INSERT INTO loyalty_transactions (customer_id, points, transaction_type, description, created_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, Math.abs(points), transaction_type, description, req.user.id]
  );

  res.json({
    success: true,
    message: 'Loyalty points adjusted successfully',
    data: {
      previous_points: currentPoints,
      adjustment: adjustmentPoints,
      new_points: newPoints,
    },
  });
});

/**
 * Redeem loyalty points
 * POST /api/v1/customers/:id/redeem
 */
export const redeemPoints = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { points, job_id } = req.body;

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  // Check customer has enough points
  const customer = await db.query(`SELECT loyalty_points FROM customers WHERE id = $1`, [id]);
  if (customer.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
    });
    return;
  }

  if (customer.rows[0].loyalty_points < points) {
    res.status(400).json({
      success: false,
      error: 'Insufficient loyalty points',
    });
    return;
  }

  // Calculate discount value (10 KES per point)
  const discountValue = points * 10;

  // Update customer points
  await db.query(
    `UPDATE customers SET loyalty_points = loyalty_points - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [points, id]
  );

  // Log redemption
  await db.query(
    `INSERT INTO loyalty_transactions (customer_id, job_id, points, transaction_type, description, created_by)
     VALUES ($1, $2, $3, 'redeemed', $4, $5)`,
    [id, job_id, points, `Redeemed for KES ${discountValue} discount`, req.user.id]
  );

  // Apply discount to job if provided
  if (job_id) {
    await db.query(
      `UPDATE jobs
       SET discount_amount = discount_amount + $1,
           final_amount = final_amount - $1,
           notes = COALESCE(notes, '') || $2
       WHERE id = $3`,
      [discountValue, `\n[Loyalty: ${points} points redeemed]`, job_id]
    );
  }

  res.json({
    success: true,
    message: 'Points redeemed successfully',
    data: {
      points_redeemed: points,
      discount_value: discountValue,
    },
  });
});

/**
 * Search customers (autocomplete)
 * GET /api/v1/customers/search/autocomplete
 */
export const autocomplete = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { q } = req.query;

  if (!q || (q as string).length < 2) {
    res.json({
      success: true,
      data: [],
    });
    return;
  }

  const result = await db.query(
    `SELECT c.id, c.name, c.phone, c.customer_type, c.is_vip
     FROM customers c
     WHERE c.name ILIKE $1 OR c.phone ILIKE $1
     ORDER BY c.name ASC
     LIMIT 10`,
    [`%${q}%`]
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Get top customers
 * GET /api/v1/customers/top
 */
export const getTopCustomers = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { limit = 10, sort_by = 'total_spent' } = req.query;

  const allowedSortFields = ['total_visits', 'total_spent', 'loyalty_points'];
  const sortField = allowedSortFields.includes(sort_by as string) ? sort_by : 'total_spent';

  const result = await db.query(
    `SELECT c.id, c.name, c.phone, c.customer_type, c.is_vip,
            c.total_visits, c.total_spent, c.loyalty_points,
            (SELECT MAX(created_at) FROM jobs WHERE customer_id = c.id) as last_visit
     FROM customers c
     ORDER BY c.${sortField} DESC
     LIMIT $1`,
    [limit]
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

export default {
  getCustomers,
  getCustomer,
  getCustomerByPhone,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerVehicles,
  getCustomerHistory,
  adjustLoyaltyPoints,
  redeemPoints,
  autocomplete,
  getTopCustomers,
};
