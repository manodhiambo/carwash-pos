import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';
import { getMinutesDifference } from '../utils/helpers';

/**
 * Get all bays
 * GET /api/v1/bays
 */
export const getBays = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status, bay_type, branch_id } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  const userBranchId = req.user?.branch_id;
  if (req.user?.role !== 'super_admin' && userBranchId) {
    conditions.push(`b.branch_id = $${paramIndex++}`);
    params.push(userBranchId);
  } else if (branch_id) {
    conditions.push(`b.branch_id = $${paramIndex++}`);
    params.push(branch_id);
  }

  if (status) {
    conditions.push(`b.status = $${paramIndex++}`);
    params.push(status);
  }

  if (bay_type) {
    conditions.push(`b.bay_type = $${paramIndex++}`);
    params.push(bay_type);
  }

  conditions.push(`b.is_active = true`);
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const result = await db.query(
    `SELECT b.*,
            br.name as branch_name,
            j.id as current_job_id,
            j.job_no as current_job_no,
            j.created_at as job_started,
            v.registration_no,
            v.vehicle_type,
            u.name as assigned_staff_name
     FROM bays b
     LEFT JOIN branches br ON b.branch_id = br.id
     LEFT JOIN jobs j ON b.current_job_id = j.id
     LEFT JOIN vehicles v ON j.vehicle_id = v.id
     LEFT JOIN users u ON j.assigned_staff_id = u.id
     ${whereClause}
     ORDER BY b.bay_number ASC`,
    params
  );

  // Add elapsed time for occupied bays
  const baysWithTime = result.rows.map(bay => ({
    ...bay,
    elapsed_minutes: bay.job_started ? getMinutesDifference(bay.job_started) : null,
  }));

  res.json({
    success: true,
    data: baysWithTime,
  });
});

/**
 * Get bay by ID
 * GET /api/v1/bays/:id
 */
export const getBay = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT b.*, br.name as branch_name,
            j.id as current_job_id, j.job_no, j.status as job_status, j.created_at as job_started,
            v.registration_no, v.vehicle_type,
            c.name as customer_name,
            u.name as assigned_staff_name
     FROM bays b
     LEFT JOIN branches br ON b.branch_id = br.id
     LEFT JOIN jobs j ON b.current_job_id = j.id
     LEFT JOIN vehicles v ON j.vehicle_id = v.id
     LEFT JOIN customers c ON j.customer_id = c.id
     LEFT JOIN users u ON j.assigned_staff_id = u.id
     WHERE b.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Bay not found',
    });
    return;
  }

  // Get bay history
  const historyResult = await db.query(
    `SELECT j.id, j.job_no, j.status, j.created_at, j.actual_completion,
            v.registration_no, v.vehicle_type,
            EXTRACT(EPOCH FROM (COALESCE(j.actual_completion, CURRENT_TIMESTAMP) - j.created_at)) / 60 as duration_minutes
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     WHERE j.bay_id = $1
     ORDER BY j.created_at DESC
     LIMIT 20`,
    [id]
  );

  // Get equipment assigned to bay
  const equipmentResult = await db.query(
    `SELECT * FROM equipment WHERE bay_id = $1`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...result.rows[0],
      elapsed_minutes: result.rows[0].job_started
        ? getMinutesDifference(result.rows[0].job_started)
        : null,
      recent_jobs: historyResult.rows,
      equipment: equipmentResult.rows,
    },
  });
});

/**
 * Create bay
 * POST /api/v1/bays
 */
export const createBay = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, bay_number, bay_type = 'manual', capacity = 1, notes } = req.body;
  const branchId = req.body.branch_id || req.user?.branch_id || 1;

  // Check for duplicate bay number in branch
  const existing = await db.query(
    `SELECT id FROM bays WHERE branch_id = $1 AND bay_number = $2`,
    [branchId, bay_number]
  );

  if (existing.rows.length > 0) {
    res.status(409).json({
      success: false,
      error: `Bay number ${bay_number} already exists in this branch`,
    });
    return;
  }

  const result = await db.query(
    `INSERT INTO bays (name, bay_number, bay_type, branch_id, capacity, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, bay_number, bay_type, branchId, capacity, notes]
  );

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.CREATED,
    data: result.rows[0],
  });
});

/**
 * Update bay
 * PUT /api/v1/bays/:id
 */
export const updateBay = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, bay_number, bay_type, capacity, is_active, notes } = req.body;

  const existing = await db.query(`SELECT * FROM bays WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Bay not found',
    });
    return;
  }

  // Check bay number uniqueness if changing
  if (bay_number && bay_number !== existing.rows[0].bay_number) {
    const duplicate = await db.query(
      `SELECT id FROM bays WHERE branch_id = $1 AND bay_number = $2 AND id != $3`,
      [existing.rows[0].branch_id, bay_number, id]
    );
    if (duplicate.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: `Bay number ${bay_number} already exists`,
      });
      return;
    }
  }

  const result = await db.query(
    `UPDATE bays
     SET name = COALESCE($1, name),
         bay_number = COALESCE($2, bay_number),
         bay_type = COALESCE($3, bay_type),
         capacity = COALESCE($4, capacity),
         is_active = COALESCE($5, is_active),
         notes = COALESCE($6, notes),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $7
     RETURNING *`,
    [name, bay_number, bay_type, capacity, is_active, notes, id]
  );

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.UPDATED,
    data: result.rows[0],
  });
});

/**
 * Update bay status
 * PUT /api/v1/bays/:id/status
 */
export const updateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const existing = await db.query(`SELECT * FROM bays WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Bay not found',
    });
    return;
  }

  // If setting to available, clear current job
  const updates = status === 'available'
    ? `status = $1, current_job_id = NULL, notes = COALESCE($2, notes)`
    : `status = $1, notes = COALESCE($2, notes)`;

  const result = await db.query(
    `UPDATE bays SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
    [status, notes, id]
  );

  res.json({
    success: true,
    message: 'Bay status updated',
    data: result.rows[0],
  });
});

/**
 * Get available bays
 * GET /api/v1/bays/available
 */
export const getAvailableBays = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const branchId = req.user?.branch_id || req.query.branch_id;

  const result = await db.query(
    `SELECT b.id, b.name, b.bay_number, b.bay_type
     FROM bays b
     WHERE b.status = 'available'
     AND b.is_active = true
     ${branchId ? 'AND b.branch_id = $1' : ''}
     ORDER BY b.bay_number ASC`,
    branchId ? [branchId] : []
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Get bay utilization report
 * GET /api/v1/bays/utilization
 */
export const getUtilization = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const result = await db.query(
    `SELECT
       b.id, b.name, b.bay_number, b.bay_type,
       COUNT(j.id) as total_jobs,
       COALESCE(SUM(
         EXTRACT(EPOCH FROM (COALESCE(j.actual_completion, CURRENT_TIMESTAMP) - j.created_at)) / 3600
       ), 0) as total_hours,
       COALESCE(AVG(
         EXTRACT(EPOCH FROM (COALESCE(j.actual_completion, CURRENT_TIMESTAMP) - j.created_at)) / 60
       ), 0) as avg_job_minutes
     FROM bays b
     LEFT JOIN jobs j ON b.id = j.bay_id
       AND j.status NOT IN ('cancelled')
       ${date_from ? `AND j.created_at >= $2` : ''}
       ${date_to ? `AND j.created_at <= $3` : ''}
     WHERE b.is_active = true
     ${branchId ? 'AND b.branch_id = $1' : ''}
     GROUP BY b.id
     ORDER BY b.bay_number ASC`,
    [branchId, date_from, date_to].filter(Boolean)
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Delete bay
 * DELETE /api/v1/bays/:id
 */
export const deleteBay = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  // Check for active jobs
  const activeJob = await db.query(
    `SELECT id FROM jobs WHERE bay_id = $1 AND status NOT IN ('paid', 'cancelled') LIMIT 1`,
    [id]
  );

  if (activeJob.rows.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Cannot delete bay with active jobs',
    });
    return;
  }

  // Soft delete
  const result = await db.query(
    `UPDATE bays SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Bay not found',
    });
    return;
  }

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.DELETED,
  });
});

// ==================== EQUIPMENT ====================

/**
 * Get all equipment
 * GET /api/v1/bays/equipment
 */
export const getEquipment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { bay_id, status, branch_id } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (branchId) {
    conditions.push(`e.branch_id = $${paramIndex++}`);
    params.push(branchId);
  }

  if (bay_id) {
    conditions.push(`e.bay_id = $${paramIndex++}`);
    params.push(bay_id);
  }

  if (status) {
    conditions.push(`e.status = $${paramIndex++}`);
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT e.*, b.name as bay_name, b.bay_number
     FROM equipment e
     LEFT JOIN bays b ON e.bay_id = b.id
     ${whereClause}
     ORDER BY e.name ASC`,
    params
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Create equipment
 * POST /api/v1/bays/equipment
 */
export const createEquipment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, equipment_type, serial_number, bay_id, status = 'operational', purchase_date, notes } = req.body;
  const branchId = req.body.branch_id || req.user?.branch_id || 1;

  const result = await db.query(
    `INSERT INTO equipment (name, equipment_type, serial_number, bay_id, branch_id, status, purchase_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [name, equipment_type, serial_number, bay_id, branchId, status, purchase_date, notes]
  );

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.CREATED,
    data: result.rows[0],
  });
});

/**
 * Update equipment
 * PUT /api/v1/bays/equipment/:id
 */
export const updateEquipment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, equipment_type, serial_number, bay_id, status, last_maintenance, next_maintenance, notes } = req.body;

  const result = await db.query(
    `UPDATE equipment
     SET name = COALESCE($1, name),
         equipment_type = COALESCE($2, equipment_type),
         serial_number = COALESCE($3, serial_number),
         bay_id = COALESCE($4, bay_id),
         status = COALESCE($5, status),
         last_maintenance = COALESCE($6, last_maintenance),
         next_maintenance = COALESCE($7, next_maintenance),
         notes = COALESCE($8, notes),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $9
     RETURNING *`,
    [name, equipment_type, serial_number, bay_id, status, last_maintenance, next_maintenance, notes, id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Equipment not found',
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
  getBays,
  getBay,
  createBay,
  updateBay,
  updateStatus,
  getAvailableBays,
  getUtilization,
  deleteBay,
  getEquipment,
  createEquipment,
  updateEquipment,
};
