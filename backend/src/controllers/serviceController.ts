import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, VEHICLE_TYPE } from '../utils/constants';
import { transaction } from '../config/database';

/**
 * Get all services
 * GET /api/v1/services
 */
export const getServices = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { category, is_active, branch_id, search } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`s.category = $${paramIndex++}`);
    params.push(category);
  }

  if (is_active !== undefined) {
    conditions.push(`s.is_active = $${paramIndex++}`);
    params.push(is_active === 'true');
  }

  if (branch_id) {
    conditions.push(`(s.branch_id = $${paramIndex++} OR s.branch_id IS NULL)`);
    params.push(branch_id);
  }

  if (search) {
    conditions.push(`(s.name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT s.*,
            COALESCE(
              (SELECT JSON_AGG(JSON_BUILD_OBJECT('vehicle_type', sp.vehicle_type, 'price', sp.price))
               FROM service_pricing sp WHERE sp.service_id = s.id),
              '[]'
            ) as pricing
     FROM services s
     ${whereClause}
     ORDER BY s.category, s.name`,
    params
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Get service by ID
 * GET /api/v1/services/:id
 */
export const getService = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT s.* FROM services s WHERE s.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.SERVICE_NOT_FOUND,
    });
    return;
  }

  // Get pricing for all vehicle types
  const pricingResult = await db.query(
    `SELECT vehicle_type, price FROM service_pricing WHERE service_id = $1`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...result.rows[0],
      pricing: pricingResult.rows,
    },
  });
});

/**
 * Create new service
 * POST /api/v1/services
 */
export const createService = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    name,
    description,
    category,
    base_price,
    duration_minutes = 30,
    is_active = true,
    branch_id,
    pricing = [],
  } = req.body;

  const service = await transaction(async (client) => {
    // Create service
    const result = await client.query(
      `INSERT INTO services (name, description, category, base_price, duration_minutes, is_active, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description, category, base_price, duration_minutes, is_active, branch_id]
    );

    const newService = result.rows[0];

    // Add pricing for vehicle types
    if (pricing.length > 0) {
      for (const p of pricing) {
        await client.query(
          `INSERT INTO service_pricing (service_id, vehicle_type, price)
           VALUES ($1, $2, $3)`,
          [newService.id, p.vehicle_type, p.price]
        );
      }
    } else {
      // Create default pricing based on base_price with multipliers
      const vehicleMultipliers: Record<string, number> = {
        saloon: 1.0,
        suv: 1.5,
        van: 1.8,
        truck: 2.0,
        pickup: 1.6,
        motorcycle: 0.5,
        bus: 2.5,
        trailer: 3.0,
      };

      for (const [vehicleType, multiplier] of Object.entries(vehicleMultipliers)) {
        await client.query(
          `INSERT INTO service_pricing (service_id, vehicle_type, price)
           VALUES ($1, $2, $3)`,
          [newService.id, vehicleType, Math.round(base_price * multiplier)]
        );
      }
    }

    return newService;
  });

  // Get pricing
  const pricingResult = await db.query(
    `SELECT vehicle_type, price FROM service_pricing WHERE service_id = $1`,
    [service.id]
  );

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.CREATED,
    data: {
      ...service,
      pricing: pricingResult.rows,
    },
  });
});

/**
 * Update service
 * PUT /api/v1/services/:id
 */
export const updateService = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const {
    name,
    description,
    category,
    base_price,
    duration_minutes,
    is_active,
    branch_id,
    pricing,
  } = req.body;

  // Check service exists
  const existing = await db.query(`SELECT id FROM services WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.SERVICE_NOT_FOUND,
    });
    return;
  }

  await transaction(async (client) => {
    // Update service
    await client.query(
      `UPDATE services
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           base_price = COALESCE($4, base_price),
           duration_minutes = COALESCE($5, duration_minutes),
           is_active = COALESCE($6, is_active),
           branch_id = COALESCE($7, branch_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [name, description, category, base_price, duration_minutes, is_active, branch_id, id]
    );

    // Update pricing if provided
    if (pricing && Array.isArray(pricing)) {
      for (const p of pricing) {
        await client.query(
          `INSERT INTO service_pricing (service_id, vehicle_type, price)
           VALUES ($1, $2, $3)
           ON CONFLICT (service_id, vehicle_type)
           DO UPDATE SET price = $3, updated_at = CURRENT_TIMESTAMP`,
          [id, p.vehicle_type, p.price]
        );
      }
    }
  });

  // Get updated service
  const result = await db.query(`SELECT * FROM services WHERE id = $1`, [id]);
  const pricingResult = await db.query(
    `SELECT vehicle_type, price FROM service_pricing WHERE service_id = $1`,
    [id]
  );

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.UPDATED,
    data: {
      ...result.rows[0],
      pricing: pricingResult.rows,
    },
  });
});

/**
 * Delete service
 * DELETE /api/v1/services/:id
 */
export const deleteService = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  // Check if service is used in any jobs
  const inUse = await db.query(
    `SELECT id FROM job_services WHERE service_id = $1 LIMIT 1`,
    [id]
  );

  if (inUse.rows.length > 0) {
    // Soft delete - deactivate instead of deleting
    await db.query(
      `UPDATE services SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'Service deactivated (has job history)',
    });
    return;
  }

  // Hard delete if no jobs
  await transaction(async (client) => {
    await client.query(`DELETE FROM service_pricing WHERE service_id = $1`, [id]);
    await client.query(`DELETE FROM services WHERE id = $1`, [id]);
  });

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.DELETED,
  });
});

/**
 * Get price for specific service and vehicle type
 * GET /api/v1/services/:id/price/:vehicleType
 */
export const getServicePrice = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id, vehicleType } = req.params;

  // Validate vehicle type
  if (!Object.values(VEHICLE_TYPE).includes(vehicleType as typeof VEHICLE_TYPE[keyof typeof VEHICLE_TYPE])) {
    res.status(400).json({
      success: false,
      error: 'Invalid vehicle type',
    });
    return;
  }

  const result = await db.query(
    `SELECT COALESCE(
       (SELECT price FROM service_pricing WHERE service_id = $1 AND vehicle_type = $2),
       (SELECT base_price FROM services WHERE id = $1)
     ) as price`,
    [id, vehicleType]
  );

  if (result.rows[0].price === null) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.SERVICE_NOT_FOUND,
    });
    return;
  }

  res.json({
    success: true,
    data: {
      service_id: parseInt(id, 10),
      vehicle_type: vehicleType,
      price: parseFloat(result.rows[0].price),
    },
  });
});

/**
 * Update price for specific vehicle type
 * PUT /api/v1/services/:id/price/:vehicleType
 */
export const updateServicePrice = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id, vehicleType } = req.params;
  const { price } = req.body;

  // Check service exists
  const serviceExists = await db.query(`SELECT id FROM services WHERE id = $1`, [id]);
  if (serviceExists.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.SERVICE_NOT_FOUND,
    });
    return;
  }

  await db.query(
    `INSERT INTO service_pricing (service_id, vehicle_type, price)
     VALUES ($1, $2, $3)
     ON CONFLICT (service_id, vehicle_type)
     DO UPDATE SET price = $3, updated_at = CURRENT_TIMESTAMP`,
    [id, vehicleType, price]
  );

  res.json({
    success: true,
    message: 'Price updated successfully',
    data: {
      service_id: parseInt(id, 10),
      vehicle_type: vehicleType,
      price,
    },
  });
});

/**
 * Get services grouped by category
 * GET /api/v1/services/grouped
 */
export const getServicesGrouped = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { branch_id, vehicle_type } = req.query;

  const branchCondition = branch_id ? `AND (s.branch_id = $1 OR s.branch_id IS NULL)` : '';
  const params = branch_id ? [branch_id] : [];

  const result = await db.query(
    `SELECT s.category,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', s.id,
                'name', s.name,
                'description', s.description,
                'base_price', s.base_price,
                'duration_minutes', s.duration_minutes,
                'price', COALESCE(
                  (SELECT price FROM service_pricing sp
                   WHERE sp.service_id = s.id AND sp.vehicle_type = $${params.length + 1}),
                  s.base_price
                )
              ) ORDER BY s.name
            ) as services
     FROM services s
     WHERE s.is_active = true ${branchCondition}
     GROUP BY s.category
     ORDER BY s.category`,
    [...params, vehicle_type || 'saloon']
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Get popular services
 * GET /api/v1/services/popular
 */
export const getPopularServices = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { limit = 5, branch_id } = req.query;

  const branchCondition = branch_id ? 'AND j.branch_id = $2' : '';
  const params = branch_id ? [limit, branch_id] : [limit];

  const result = await db.query(
    `SELECT s.id, s.name, s.category, s.base_price, COUNT(js.id) as usage_count
     FROM services s
     JOIN job_services js ON s.id = js.service_id
     JOIN jobs j ON js.job_id = j.id
     WHERE j.created_at >= NOW() - INTERVAL '30 days'
     ${branchCondition}
     GROUP BY s.id
     ORDER BY usage_count DESC
     LIMIT $1`,
    params
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

export default {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
  getServicePrice,
  updateServicePrice,
  getServicesGrouped,
  getPopularServices,
};
