import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';
import { calculatePagination, buildPaginationClause, addDaysToDate } from '../utils/helpers';
import { transaction } from '../config/database';

// ==================== SUBSCRIPTION PLANS ====================

/**
 * Get all subscription plans
 * GET /api/v1/subscriptions/plans
 */
export const getPlans = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { subscription_type, is_active, branch_id } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (subscription_type) {
    conditions.push(`sp.subscription_type = $${paramIndex++}`);
    params.push(subscription_type);
  }

  if (is_active !== undefined) {
    conditions.push(`sp.is_active = $${paramIndex++}`);
    params.push(is_active === 'true');
  }

  if (branchId) {
    conditions.push(`(sp.branch_id = $${paramIndex++} OR sp.branch_id IS NULL)`);
    params.push(branchId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT sp.*,
            (SELECT COUNT(*) FROM customer_subscriptions cs WHERE cs.plan_id = sp.id AND cs.status = 'active') as active_subscriptions
     FROM subscription_plans sp
     ${whereClause}
     ORDER BY sp.subscription_type, sp.price ASC`,
    params
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Get plan by ID
 * GET /api/v1/subscriptions/plans/:id
 */
export const getPlan = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT sp.* FROM subscription_plans sp WHERE sp.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Subscription plan not found',
    });
    return;
  }

  // Get included services
  const servicesResult = await db.query(
    `SELECT s.id, s.name, s.category
     FROM services s
     WHERE s.id = ANY($1::int[])`,
    [result.rows[0].services_included || []]
  );

  res.json({
    success: true,
    data: {
      ...result.rows[0],
      services: servicesResult.rows,
    },
  });
});

/**
 * Create subscription plan
 * POST /api/v1/subscriptions/plans
 */
export const createPlan = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    name,
    description,
    subscription_type,
    price,
    duration_days,
    wash_limit,
    services_included = [],
    vehicle_types = [],
  } = req.body;

  const branchId = req.body.branch_id || req.user?.branch_id;

  const result = await db.query(
    `INSERT INTO subscription_plans (name, description, subscription_type, price, duration_days, wash_limit, services_included, vehicle_types, branch_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      name,
      description,
      subscription_type,
      price,
      duration_days,
      wash_limit,
      JSON.stringify(services_included),
      JSON.stringify(vehicle_types),
      branchId,
    ]
  );

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.CREATED,
    data: result.rows[0],
  });
});

/**
 * Update subscription plan
 * PUT /api/v1/subscriptions/plans/:id
 */
export const updatePlan = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const {
    name,
    description,
    subscription_type,
    price,
    duration_days,
    wash_limit,
    services_included,
    vehicle_types,
    is_active,
  } = req.body;

  const result = await db.query(
    `UPDATE subscription_plans
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         subscription_type = COALESCE($3, subscription_type),
         price = COALESCE($4, price),
         duration_days = COALESCE($5, duration_days),
         wash_limit = COALESCE($6, wash_limit),
         services_included = COALESCE($7, services_included),
         vehicle_types = COALESCE($8, vehicle_types),
         is_active = COALESCE($9, is_active),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $10
     RETURNING *`,
    [
      name,
      description,
      subscription_type,
      price,
      duration_days,
      wash_limit,
      services_included ? JSON.stringify(services_included) : null,
      vehicle_types ? JSON.stringify(vehicle_types) : null,
      is_active,
      id,
    ]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Subscription plan not found',
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
 * Delete subscription plan
 * DELETE /api/v1/subscriptions/plans/:id
 */
export const deletePlan = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  // Check for active subscriptions
  const activeSubscriptions = await db.query(
    `SELECT id FROM customer_subscriptions WHERE plan_id = $1 AND status = 'active' LIMIT 1`,
    [id]
  );

  if (activeSubscriptions.rows.length > 0) {
    // Soft delete
    await db.query(
      `UPDATE subscription_plans SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'Plan deactivated (has active subscriptions)',
    });
    return;
  }

  await db.query(`DELETE FROM subscription_plans WHERE id = $1`, [id]);

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.DELETED,
  });
});

// ==================== CUSTOMER SUBSCRIPTIONS ====================

/**
 * Get all customer subscriptions
 * GET /api/v1/subscriptions
 */
export const getSubscriptions = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    customer_id,
    plan_id,
    status,
    page = 1,
    limit = 20,
  } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (customer_id) {
    conditions.push(`cs.customer_id = $${paramIndex++}`);
    params.push(customer_id);
  }

  if (plan_id) {
    conditions.push(`cs.plan_id = $${paramIndex++}`);
    params.push(plan_id);
  }

  if (status) {
    conditions.push(`cs.status = $${paramIndex++}`);
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(
    `SELECT COUNT(*) FROM customer_subscriptions cs ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { offset, limit: validLimit } = buildPaginationClause(Number(page), Number(limit));

  const result = await db.query(
    `SELECT cs.*,
            c.name as customer_name, c.phone as customer_phone,
            sp.name as plan_name, sp.subscription_type, sp.wash_limit,
            v.registration_no, v.vehicle_type
     FROM customer_subscriptions cs
     JOIN customers c ON cs.customer_id = c.id
     JOIN subscription_plans sp ON cs.plan_id = sp.id
     JOIN vehicles v ON cs.vehicle_id = v.id
     ${whereClause}
     ORDER BY cs.created_at DESC
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
 * Get subscription by ID
 * GET /api/v1/subscriptions/:id
 */
export const getSubscription = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT cs.*,
            c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
            sp.name as plan_name, sp.subscription_type, sp.wash_limit, sp.services_included,
            v.registration_no, v.vehicle_type, v.make, v.model
     FROM customer_subscriptions cs
     JOIN customers c ON cs.customer_id = c.id
     JOIN subscription_plans sp ON cs.plan_id = sp.id
     JOIN vehicles v ON cs.vehicle_id = v.id
     WHERE cs.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Subscription not found',
    });
    return;
  }

  // Get usage history
  const usageResult = await db.query(
    `SELECT j.id, j.job_no, j.created_at, j.final_amount
     FROM jobs j
     WHERE j.vehicle_id = $1
     AND j.created_at >= $2
     AND j.created_at <= $3
     AND j.status = 'paid'
     ORDER BY j.created_at DESC`,
    [result.rows[0].vehicle_id, result.rows[0].start_date, result.rows[0].end_date]
  );

  res.json({
    success: true,
    data: {
      ...result.rows[0],
      usage_history: usageResult.rows,
    },
  });
});

/**
 * Subscribe customer to a plan
 * POST /api/v1/subscriptions
 */
export const subscribe = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { customer_id, plan_id, vehicle_id, payment_id, start_date } = req.body;

  // Get plan details
  const plan = await db.query(
    `SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true`,
    [plan_id]
  );

  if (plan.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Subscription plan not found or inactive',
    });
    return;
  }

  const planData = plan.rows[0];

  // Check for existing active subscription for this vehicle
  const existingSubscription = await db.query(
    `SELECT id FROM customer_subscriptions
     WHERE vehicle_id = $1 AND status = 'active'`,
    [vehicle_id]
  );

  if (existingSubscription.rows.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Vehicle already has an active subscription',
    });
    return;
  }

  // Validate customer and vehicle
  const customer = await db.query(`SELECT id FROM customers WHERE id = $1`, [customer_id]);
  if (customer.rows.length === 0) {
    res.status(400).json({
      success: false,
      error: ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
    });
    return;
  }

  const vehicle = await db.query(`SELECT id FROM vehicles WHERE id = $1`, [vehicle_id]);
  if (vehicle.rows.length === 0) {
    res.status(400).json({
      success: false,
      error: ERROR_MESSAGES.VEHICLE_NOT_FOUND,
    });
    return;
  }

  const subscriptionStart = start_date ? new Date(start_date) : new Date();
  const subscriptionEnd = addDaysToDate(subscriptionStart, planData.duration_days);

  const result = await db.query(
    `INSERT INTO customer_subscriptions (customer_id, plan_id, vehicle_id, start_date, end_date, washes_remaining, payment_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      customer_id,
      plan_id,
      vehicle_id,
      subscriptionStart,
      subscriptionEnd,
      planData.wash_limit,
      payment_id,
    ]
  );

  res.status(201).json({
    success: true,
    message: 'Subscription created successfully',
    data: result.rows[0],
  });
});

/**
 * Use subscription wash
 * POST /api/v1/subscriptions/:id/use
 */
export const useSubscription = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { job_id } = req.body;

  const subscription = await db.query(
    `SELECT cs.*, sp.wash_limit
     FROM customer_subscriptions cs
     JOIN subscription_plans sp ON cs.plan_id = sp.id
     WHERE cs.id = $1`,
    [id]
  );

  if (subscription.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Subscription not found',
    });
    return;
  }

  const sub = subscription.rows[0];

  // Check subscription is active
  if (sub.status !== 'active') {
    res.status(400).json({
      success: false,
      error: 'Subscription is not active',
    });
    return;
  }

  // Check expiry
  if (new Date(sub.end_date) < new Date()) {
    await db.query(
      `UPDATE customer_subscriptions SET status = 'expired' WHERE id = $1`,
      [id]
    );

    res.status(400).json({
      success: false,
      error: 'Subscription has expired',
    });
    return;
  }

  // Check wash limit for prepaid plans
  if (sub.wash_limit !== null && sub.washes_remaining <= 0) {
    res.status(400).json({
      success: false,
      error: 'No washes remaining on subscription',
    });
    return;
  }

  await transaction(async (client) => {
    // Update subscription
    await client.query(
      `UPDATE customer_subscriptions
       SET washes_used = washes_used + 1,
           washes_remaining = CASE WHEN washes_remaining IS NOT NULL THEN washes_remaining - 1 ELSE washes_remaining END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    // Update job if provided
    if (job_id) {
      await client.query(
        `UPDATE jobs
         SET notes = COALESCE(notes, '') || $1,
             discount_amount = final_amount,
             final_amount = 0
         WHERE id = $2`,
        [`\n[Subscription #${id} used]`, job_id]
      );
    }
  });

  // Get updated subscription
  const updated = await db.query(
    `SELECT * FROM customer_subscriptions WHERE id = $1`,
    [id]
  );

  res.json({
    success: true,
    message: 'Subscription wash used successfully',
    data: updated.rows[0],
  });
});

/**
 * Cancel subscription
 * POST /api/v1/subscriptions/:id/cancel
 */
export const cancelSubscription = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { reason } = req.body;

  const result = await db.query(
    `UPDATE customer_subscriptions
     SET status = 'cancelled',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status = 'active'
     RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(400).json({
      success: false,
      error: 'Subscription not found or not active',
    });
    return;
  }

  res.json({
    success: true,
    message: 'Subscription cancelled successfully',
    data: result.rows[0],
  });
});

/**
 * Check subscription validity for a vehicle
 * GET /api/v1/subscriptions/check/:vehicleId
 */
export const checkSubscription = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { vehicleId } = req.params;

  const result = await db.query(
    `SELECT cs.*, sp.name as plan_name, sp.subscription_type, sp.wash_limit, sp.services_included
     FROM customer_subscriptions cs
     JOIN subscription_plans sp ON cs.plan_id = sp.id
     WHERE cs.vehicle_id = $1
     AND cs.status = 'active'
     AND cs.end_date >= CURRENT_DATE
     AND (cs.washes_remaining IS NULL OR cs.washes_remaining > 0)
     LIMIT 1`,
    [vehicleId]
  );

  if (result.rows.length === 0) {
    res.json({
      success: true,
      data: {
        has_subscription: false,
        subscription: null,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      has_subscription: true,
      subscription: result.rows[0],
    },
  });
});

/**
 * Get expiring subscriptions
 * GET /api/v1/subscriptions/expiring
 */
export const getExpiringSubscriptions = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { days = 7 } = req.query;

  const result = await db.query(
    `SELECT cs.*,
            c.name as customer_name, c.phone as customer_phone,
            sp.name as plan_name,
            v.registration_no
     FROM customer_subscriptions cs
     JOIN customers c ON cs.customer_id = c.id
     JOIN subscription_plans sp ON cs.plan_id = sp.id
     JOIN vehicles v ON cs.vehicle_id = v.id
     WHERE cs.status = 'active'
     AND cs.end_date <= CURRENT_DATE + INTERVAL '${days} days'
     AND cs.end_date >= CURRENT_DATE
     ORDER BY cs.end_date ASC`,
    []
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

export default {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  getSubscriptions,
  getSubscription,
  subscribe,
  useSubscription,
  cancelSubscription,
  checkSubscription,
  getExpiringSubscriptions,
};
