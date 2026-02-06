import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';
import { normalizeRegistrationNumber, calculatePagination, buildPaginationClause } from '../utils/helpers';

/**
 * Get all vehicles with pagination and filters
 * GET /api/v1/vehicles
 */
export const getVehicles = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    search,
    vehicle_type,
    customer_id,
    page = 1,
    limit = 20,
    sort_by = 'created_at',
    sort_dir = 'desc',
  } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (search) {
    conditions.push(`(v.registration_no ILIKE $${paramIndex} OR v.make ILIKE $${paramIndex} OR v.model ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (vehicle_type) {
    conditions.push(`v.vehicle_type = $${paramIndex++}`);
    params.push(vehicle_type);
  }

  if (customer_id) {
    conditions.push(`v.customer_id = $${paramIndex++}`);
    params.push(customer_id);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM vehicles v ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get vehicles
  const { offset, limit: validLimit } = buildPaginationClause(Number(page), Number(limit));
  const allowedSortFields = ['registration_no', 'vehicle_type', 'make', 'model', 'created_at'];
  const sortField = allowedSortFields.includes(sort_by as string) ? sort_by : 'created_at';
  const sortDirection = sort_dir === 'asc' ? 'ASC' : 'DESC';

  const result = await db.query(
    `SELECT v.*, c.name as customer_name, c.phone as customer_phone,
            (SELECT COUNT(*) FROM jobs j WHERE j.vehicle_id = v.id) as total_visits,
            (SELECT MAX(created_at) FROM jobs j WHERE j.vehicle_id = v.id) as last_visit
     FROM vehicles v
     LEFT JOIN customers c ON v.customer_id = c.id
     ${whereClause}
     ORDER BY v.${sortField} ${sortDirection}
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
 * Get vehicle by ID
 * GET /api/v1/vehicles/:id
 */
export const getVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT v.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
     FROM vehicles v
     LEFT JOIN customers c ON v.customer_id = c.id
     WHERE v.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.VEHICLE_NOT_FOUND,
    });
    return;
  }

  // Get service history
  const historyResult = await db.query(
    `SELECT j.id, j.job_no, j.status, j.final_amount, j.created_at, j.actual_completion,
            ARRAY_AGG(s.name) as services
     FROM jobs j
     LEFT JOIN job_services js ON j.id = js.job_id
     LEFT JOIN services s ON js.service_id = s.id
     WHERE j.vehicle_id = $1
     GROUP BY j.id
     ORDER BY j.created_at DESC
     LIMIT 10`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...result.rows[0],
      service_history: historyResult.rows,
    },
  });
});

/**
 * Get vehicle by registration number
 * GET /api/v1/vehicles/registration/:regNo
 */
export const getVehicleByRegistration = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { regNo } = req.params;
  const normalizedRegNo = normalizeRegistrationNumber(regNo);

  const result = await db.query(
    `SELECT v.*, c.name as customer_name, c.phone as customer_phone, c.id as customer_id
     FROM vehicles v
     LEFT JOIN customers c ON v.customer_id = c.id
     WHERE UPPER(REPLACE(v.registration_no, ' ', '')) = UPPER(REPLACE($1, ' ', ''))`,
    [normalizedRegNo]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.VEHICLE_NOT_FOUND,
    });
    return;
  }

  // Get last job for this vehicle
  const lastJobResult = await db.query(
    `SELECT j.id, j.job_no, j.status, j.final_amount, j.created_at,
            ARRAY_AGG(s.name) as services
     FROM jobs j
     LEFT JOIN job_services js ON j.id = js.job_id
     LEFT JOIN services s ON js.service_id = s.id
     WHERE j.vehicle_id = $1
     GROUP BY j.id
     ORDER BY j.created_at DESC
     LIMIT 1`,
    [result.rows[0].id]
  );

  res.json({
    success: true,
    data: {
      ...result.rows[0],
      last_job: lastJobResult.rows[0] || null,
    },
  });
});

/**
 * Create new vehicle
 * POST /api/v1/vehicles
 */
export const createVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { registration_no, vehicle_type, color, make, model, customer_id, notes } = req.body;

  const normalizedRegNo = normalizeRegistrationNumber(registration_no);

  // Check if vehicle already exists
  const existing = await db.query(
    `SELECT id FROM vehicles WHERE UPPER(REPLACE(registration_no, ' ', '')) = UPPER(REPLACE($1, ' ', ''))`,
    [normalizedRegNo]
  );

  if (existing.rows.length > 0) {
    res.status(409).json({
      success: false,
      error: 'Vehicle with this registration number already exists',
      data: { id: existing.rows[0].id },
    });
    return;
  }

  // Validate customer exists if provided
  if (customer_id) {
    const customerExists = await db.query(`SELECT id FROM customers WHERE id = $1`, [customer_id]);
    if (customerExists.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
      });
      return;
    }
  }

  const result = await db.query(
    `INSERT INTO vehicles (registration_no, vehicle_type, color, make, model, customer_id, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [normalizedRegNo, vehicle_type, color, make, model, customer_id, notes]
  );

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.CREATED,
    data: result.rows[0],
  });
});

/**
 * Update vehicle
 * PUT /api/v1/vehicles/:id
 */
export const updateVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { registration_no, vehicle_type, color, make, model, customer_id, notes } = req.body;

  // Check if vehicle exists
  const existing = await db.query(`SELECT * FROM vehicles WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.VEHICLE_NOT_FOUND,
    });
    return;
  }

  // If registration number is being changed, check for duplicates
  if (registration_no) {
    const normalizedRegNo = normalizeRegistrationNumber(registration_no);
    const duplicate = await db.query(
      `SELECT id FROM vehicles
       WHERE UPPER(REPLACE(registration_no, ' ', '')) = UPPER(REPLACE($1, ' ', ''))
       AND id != $2`,
      [normalizedRegNo, id]
    );
    if (duplicate.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Another vehicle with this registration number already exists',
      });
      return;
    }
  }

  const result = await db.query(
    `UPDATE vehicles
     SET registration_no = COALESCE($1, registration_no),
         vehicle_type = COALESCE($2, vehicle_type),
         color = COALESCE($3, color),
         make = COALESCE($4, make),
         model = COALESCE($5, model),
         customer_id = COALESCE($6, customer_id),
         notes = COALESCE($7, notes),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8
     RETURNING *`,
    [
      registration_no ? normalizeRegistrationNumber(registration_no) : null,
      vehicle_type,
      color,
      make,
      model,
      customer_id,
      notes,
      id,
    ]
  );

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.UPDATED,
    data: result.rows[0],
  });
});

/**
 * Delete vehicle
 * DELETE /api/v1/vehicles/:id
 */
export const deleteVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  // Check for existing jobs
  const jobsExist = await db.query(
    `SELECT id FROM jobs WHERE vehicle_id = $1 LIMIT 1`,
    [id]
  );

  if (jobsExist.rows.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Cannot delete vehicle with existing job records',
    });
    return;
  }

  const result = await db.query(
    `DELETE FROM vehicles WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.VEHICLE_NOT_FOUND,
    });
    return;
  }

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.DELETED,
  });
});

/**
 * Get vehicle service history
 * GET /api/v1/vehicles/:id/history
 */
export const getVehicleHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  // Check if vehicle exists
  const vehicleExists = await db.query(`SELECT id FROM vehicles WHERE id = $1`, [id]);
  if (vehicleExists.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.VEHICLE_NOT_FOUND,
    });
    return;
  }

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM jobs WHERE vehicle_id = $1`,
    [id]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { offset, limit: validLimit } = buildPaginationClause(Number(page), Number(limit));

  const result = await db.query(
    `SELECT j.id, j.job_no, j.status, j.final_amount, j.created_at, j.actual_completion,
            j.notes, j.damage_notes, j.is_rewash,
            b.name as branch_name,
            u.name as staff_name,
            ARRAY_AGG(JSON_BUILD_OBJECT('name', s.name, 'price', js.total)) as services
     FROM jobs j
     LEFT JOIN branches b ON j.branch_id = b.id
     LEFT JOIN users u ON j.assigned_staff_id = u.id
     LEFT JOIN job_services js ON j.id = js.job_id
     LEFT JOIN services s ON js.service_id = s.id
     WHERE j.vehicle_id = $1
     GROUP BY j.id, b.name, u.name
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
 * Link vehicle to customer
 * POST /api/v1/vehicles/:id/link-customer
 */
export const linkCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { customer_id } = req.body;

  // Check if vehicle exists
  const vehicleExists = await db.query(`SELECT id FROM vehicles WHERE id = $1`, [id]);
  if (vehicleExists.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.VEHICLE_NOT_FOUND,
    });
    return;
  }

  // Check if customer exists
  const customerExists = await db.query(`SELECT id FROM customers WHERE id = $1`, [customer_id]);
  if (customerExists.rows.length === 0) {
    res.status(400).json({
      success: false,
      error: ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
    });
    return;
  }

  const result = await db.query(
    `UPDATE vehicles SET customer_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    [customer_id, id]
  );

  res.json({
    success: true,
    message: 'Vehicle linked to customer successfully',
    data: result.rows[0],
  });
});

/**
 * Search vehicles by registration number (autocomplete)
 * GET /api/v1/vehicles/search/autocomplete
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
    `SELECT v.id, v.registration_no, v.vehicle_type, v.color, v.make, v.model,
            c.name as customer_name
     FROM vehicles v
     LEFT JOIN customers c ON v.customer_id = c.id
     WHERE v.registration_no ILIKE $1
     ORDER BY v.registration_no ASC
     LIMIT 10`,
    [`%${q}%`]
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

export default {
  getVehicles,
  getVehicle,
  getVehicleByRegistration,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleHistory,
  linkCustomer,
  autocomplete,
};
