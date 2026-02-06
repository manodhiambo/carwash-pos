import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest, JobStatus } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, JOB_STATUS, JOB_STATUS_FLOW } from '../utils/constants';
import {
  generateJobNumber,
  normalizeRegistrationNumber,
  calculatePagination,
  buildPaginationClause,
  calculateEstimatedCompletion,
  getMinutesDifference,
} from '../utils/helpers';
import { transaction } from '../config/database';

/**
 * Get all jobs with filters and pagination
 * GET /api/v1/jobs
 */
export const getJobs = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    status,
    branch_id,
    bay_id,
    staff_id,
    customer_id,
    date_from,
    date_to,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Apply branch filter based on user's branch
  const userBranchId = req.user?.branch_id;
  if (req.user?.role !== 'super_admin' && userBranchId) {
    conditions.push(`j.branch_id = $${paramIndex++}`);
    params.push(userBranchId);
  } else if (branch_id) {
    conditions.push(`j.branch_id = $${paramIndex++}`);
    params.push(branch_id);
  }

  if (status) {
    if (Array.isArray(status)) {
      conditions.push(`j.status = ANY($${paramIndex++})`);
      params.push(status);
    } else {
      conditions.push(`j.status = $${paramIndex++}`);
      params.push(status);
    }
  }

  if (bay_id) {
    conditions.push(`j.bay_id = $${paramIndex++}`);
    params.push(bay_id);
  }

  if (staff_id) {
    conditions.push(`j.assigned_staff_id = $${paramIndex++}`);
    params.push(staff_id);
  }

  if (customer_id) {
    conditions.push(`j.customer_id = $${paramIndex++}`);
    params.push(customer_id);
  }

  if (date_from) {
    conditions.push(`j.created_at >= $${paramIndex++}`);
    params.push(date_from);
  }

  if (date_to) {
    conditions.push(`j.created_at <= $${paramIndex++}`);
    params.push(date_to);
  }

  if (search) {
    conditions.push(`(j.job_no ILIKE $${paramIndex} OR v.registration_no ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get jobs
  const { offset, limit: validLimit } = buildPaginationClause(Number(page), Number(limit));

  const result = await db.query(
    `SELECT j.*, v.registration_no, v.vehicle_type, v.color, v.make, v.model,
            c.name as customer_name, c.phone as customer_phone,
            u.name as assigned_staff_name,
            b.name as bay_name, b.bay_number,
            br.name as branch_name,
            cb.name as checked_in_by_name,
            (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.job_id = j.id AND p.status = 'completed') as amount_paid
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     LEFT JOIN customers c ON j.customer_id = c.id
     LEFT JOIN users u ON j.assigned_staff_id = u.id
     LEFT JOIN bays b ON j.bay_id = b.id
     LEFT JOIN branches br ON j.branch_id = br.id
     LEFT JOIN users cb ON j.checked_in_by = cb.id
     ${whereClause}
     ORDER BY j.created_at DESC
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
 * Get single job by ID
 * GET /api/v1/jobs/:id
 */
export const getJob = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT j.*, v.registration_no, v.vehicle_type, v.color, v.make, v.model,
            c.id as customer_id, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
            u.name as assigned_staff_name,
            b.name as bay_name, b.bay_number,
            br.name as branch_name,
            cb.name as checked_in_by_name
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     LEFT JOIN customers c ON j.customer_id = c.id
     LEFT JOIN users u ON j.assigned_staff_id = u.id
     LEFT JOIN bays b ON j.bay_id = b.id
     LEFT JOIN branches br ON j.branch_id = br.id
     LEFT JOIN users cb ON j.checked_in_by = cb.id
     WHERE j.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.JOB_NOT_FOUND,
    });
    return;
  }

  // Get job services
  const servicesResult = await db.query(
    `SELECT js.*, s.name as service_name, s.category,
            u.name as staff_name
     FROM job_services js
     JOIN services s ON js.service_id = s.id
     LEFT JOIN users u ON js.staff_id = u.id
     WHERE js.job_id = $1`,
    [id]
  );

  // Get payments
  const paymentsResult = await db.query(
    `SELECT p.*, u.name as received_by_name
     FROM payments p
     LEFT JOIN users u ON p.received_by = u.id
     WHERE p.job_id = $1
     ORDER BY p.created_at DESC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...result.rows[0],
      services: servicesResult.rows,
      payments: paymentsResult.rows,
      wait_time_minutes: getMinutesDifference(result.rows[0].created_at),
    },
  });
});

/**
 * Get job by job number
 * GET /api/v1/jobs/number/:jobNo
 */
export const getJobByNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { jobNo } = req.params;

  const result = await db.query(
    `SELECT j.id FROM jobs j WHERE j.job_no = $1`,
    [jobNo]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.JOB_NOT_FOUND,
    });
    return;
  }

  // Redirect to getJob with the found ID
  req.params.id = result.rows[0].id.toString();
  return getJob(req, res, () => {});
});

/**
 * Vehicle check-in - Create new job
 * POST /api/v1/jobs/check-in
 */
export const checkIn = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    registration_no,
    vehicle_type,
    vehicle_color,
    vehicle_make,
    vehicle_model,
    customer_name,
    customer_phone,
    services,
    bay_id,
    assigned_staff_id,
    notes,
    damage_notes,
    is_rewash,
    original_job_id,
  } = req.body;

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  const branchId = req.user.branch_id || 1;
  const normalizedRegNo = normalizeRegistrationNumber(registration_no);

  const job = await transaction(async (client) => {
    // Get or create vehicle
    let vehicleId: number;
    const existingVehicle = await client.query(
      `SELECT id, customer_id FROM vehicles
       WHERE UPPER(REPLACE(registration_no, ' ', '')) = UPPER(REPLACE($1, ' ', ''))`,
      [normalizedRegNo]
    );

    if (existingVehicle.rows.length > 0) {
      vehicleId = existingVehicle.rows[0].id;
      // Update vehicle info if provided
      if (vehicle_color || vehicle_make || vehicle_model) {
        await client.query(
          `UPDATE vehicles
           SET color = COALESCE($1, color),
               make = COALESCE($2, make),
               model = COALESCE($3, model),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [vehicle_color, vehicle_make, vehicle_model, vehicleId]
        );
      }
    } else {
      const newVehicle = await client.query(
        `INSERT INTO vehicles (registration_no, vehicle_type, color, make, model)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [normalizedRegNo, vehicle_type, vehicle_color, vehicle_make, vehicle_model]
      );
      vehicleId = newVehicle.rows[0].id;
    }

    // Get or create customer if phone provided
    let customerId: number | null = null;
    if (customer_phone) {
      const existingCustomer = await client.query(
        `SELECT id FROM customers WHERE phone = $1`,
        [customer_phone]
      );

      if (existingCustomer.rows.length > 0) {
        customerId = existingCustomer.rows[0].id;
        // Update customer name if provided
        if (customer_name) {
          await client.query(
            `UPDATE customers SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [customer_name, customerId]
          );
        }
      } else if (customer_name) {
        const newCustomer = await client.query(
          `INSERT INTO customers (name, phone) VALUES ($1, $2) RETURNING id`,
          [customer_name, customer_phone]
        );
        customerId = newCustomer.rows[0].id;
      }

      // Link vehicle to customer if not already linked
      if (customerId) {
        await client.query(
          `UPDATE vehicles SET customer_id = $1 WHERE id = $2 AND customer_id IS NULL`,
          [customerId, vehicleId]
        );
      }
    }

    // Generate job number
    const todayJobCount = await client.query(
      `SELECT COUNT(*) FROM jobs WHERE DATE(created_at) = CURRENT_DATE`
    );
    const jobNo = generateJobNumber(parseInt(todayJobCount.rows[0].count, 10) + 1);

    // Calculate total duration for services
    const serviceIds = services.map((s: { service_id: number }) => s.service_id);
    const serviceDurations = await client.query(
      `SELECT SUM(duration_minutes) as total FROM services WHERE id = ANY($1)`,
      [serviceIds]
    );
    const totalDuration = parseInt(serviceDurations.rows[0].total || '30', 10);
    const estimatedCompletion = calculateEstimatedCompletion(totalDuration);

    // Validate and assign bay if provided
    if (bay_id) {
      const bayCheck = await client.query(
        `SELECT id, status FROM bays WHERE id = $1 AND branch_id = $2 AND is_active = true`,
        [bay_id, branchId]
      );

      if (bayCheck.rows.length === 0) {
        throw new Error('Invalid bay');
      }

      if (bayCheck.rows[0].status !== 'available') {
        throw new Error(ERROR_MESSAGES.BAY_NOT_AVAILABLE);
      }
    }

    // Create job
    const jobResult = await client.query(
      `INSERT INTO jobs (
        job_no, vehicle_id, customer_id, branch_id, bay_id, status,
        assigned_staff_id, checked_in_by, estimated_completion,
        notes, damage_notes, is_rewash, original_job_id
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        jobNo,
        vehicleId,
        customerId,
        branchId,
        bay_id,
        bay_id ? JOB_STATUS.IN_QUEUE : JOB_STATUS.CHECKED_IN,
        assigned_staff_id,
        req.user.id,
        estimatedCompletion,
        notes,
        damage_notes,
        is_rewash || false,
        original_job_id,
      ]
    );

    const newJob = jobResult.rows[0];

    // Add job services and calculate totals
    let totalAmount = 0;

    for (const service of services) {
      // Get service price for vehicle type
      const priceResult = await client.query(
        `SELECT COALESCE(
           (SELECT price FROM service_pricing WHERE service_id = $1 AND vehicle_type = $2),
           (SELECT base_price FROM services WHERE id = $1)
         ) as price`,
        [service.service_id, vehicle_type]
      );

      const price = parseFloat(priceResult.rows[0].price);
      const quantity = service.quantity || 1;
      const discount = service.discount || 0;
      const serviceTotal = (price * quantity) - discount;
      totalAmount += serviceTotal;

      await client.query(
        `INSERT INTO job_services (job_id, service_id, price, quantity, discount, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newJob.id, service.service_id, price, quantity, discount, serviceTotal]
      );
    }

    // Apply rewash discount if applicable (50% off for rewash)
    let discountAmount = 0;
    if (is_rewash) {
      discountAmount = totalAmount * 0.5;
    }

    // Update job totals
    const finalAmount = totalAmount - discountAmount;
    await client.query(
      `UPDATE jobs
       SET total_amount = $1, discount_amount = $2, final_amount = $3
       WHERE id = $4`,
      [totalAmount, discountAmount, finalAmount, newJob.id]
    );

    // Update bay status if assigned
    if (bay_id) {
      await client.query(
        `UPDATE bays SET status = 'occupied', current_job_id = $1 WHERE id = $2`,
        [newJob.id, bay_id]
      );
    }

    // Update customer visit count
    if (customerId) {
      await client.query(
        `UPDATE customers SET total_visits = total_visits + 1 WHERE id = $1`,
        [customerId]
      );
    }

    return {
      ...newJob,
      total_amount: totalAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
    };
  });

  // Fetch complete job data
  const completeJob = await db.query(
    `SELECT j.*, v.registration_no, v.vehicle_type,
            c.name as customer_name, c.phone as customer_phone
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     LEFT JOIN customers c ON j.customer_id = c.id
     WHERE j.id = $1`,
    [job.id]
  );

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.JOB_CHECKED_IN,
    data: completeJob.rows[0],
  });
});

/**
 * Update job status
 * PUT /api/v1/jobs/:id/status
 */
export const updateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, notes } = req.body;

  // Get current job
  const currentJob = await db.query(
    `SELECT * FROM jobs WHERE id = $1`,
    [id]
  );

  if (currentJob.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.JOB_NOT_FOUND,
    });
    return;
  }

  const job = currentJob.rows[0];

  // Validate status transition
  const currentStatusIndex = JOB_STATUS_FLOW.indexOf(job.status);
  const newStatusIndex = JOB_STATUS_FLOW.indexOf(status);

  // Allow cancellation from any status except paid
  if (status === JOB_STATUS.CANCELLED && job.status === JOB_STATUS.PAID) {
    res.status(400).json({
      success: false,
      error: 'Cannot cancel a paid job',
    });
    return;
  }

  // For normal transitions, only allow forward movement
  if (status !== JOB_STATUS.CANCELLED && newStatusIndex <= currentStatusIndex && newStatusIndex !== -1) {
    res.status(400).json({
      success: false,
      error: ERROR_MESSAGES.INVALID_STATUS_TRANSITION,
    });
    return;
  }

  await transaction(async (client) => {
    // Update job status
    const updates: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params: unknown[] = [status];
    let paramIndex = 2;

    if (notes) {
      updates.push(`notes = COALESCE(notes, '') || $${paramIndex++}`);
      params.push(`\n[${new Date().toISOString()}] ${notes}`);
    }

    // Set actual completion time when completing
    if (status === JOB_STATUS.COMPLETED) {
      updates.push('actual_completion = CURRENT_TIMESTAMP');
    }

    params.push(id);
    await client.query(
      `UPDATE jobs SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    // Update job services status
    if (status === JOB_STATUS.WASHING || status === JOB_STATUS.DETAILING) {
      await client.query(
        `UPDATE job_services SET status = 'in_progress', started_at = CURRENT_TIMESTAMP
         WHERE job_id = $1 AND status = 'pending'`,
        [id]
      );
    }

    if (status === JOB_STATUS.COMPLETED) {
      await client.query(
        `UPDATE job_services SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE job_id = $1`,
        [id]
      );
    }

    // Free up bay if job is completed, paid, or cancelled
    if ([JOB_STATUS.COMPLETED, JOB_STATUS.PAID, JOB_STATUS.CANCELLED].includes(status as JobStatus)) {
      if (job.bay_id) {
        await client.query(
          `UPDATE bays SET status = 'available', current_job_id = NULL WHERE id = $1`,
          [job.bay_id]
        );
      }
    }
  });

  // Get updated job
  const updatedJob = await db.query(
    `SELECT j.*, v.registration_no, v.vehicle_type
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     WHERE j.id = $1`,
    [id]
  );

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.UPDATED,
    data: updatedJob.rows[0],
  });
});

/**
 * Assign bay to job
 * PUT /api/v1/jobs/:id/assign-bay
 */
export const assignBay = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { bay_id } = req.body;

  const branchId = req.user?.branch_id || 1;

  // Check job exists and is in valid status
  const job = await db.query(
    `SELECT * FROM jobs WHERE id = $1`,
    [id]
  );

  if (job.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.JOB_NOT_FOUND,
    });
    return;
  }

  if (!['checked_in', 'in_queue'].includes(job.rows[0].status)) {
    res.status(400).json({
      success: false,
      error: 'Can only assign bay to jobs in checked_in or in_queue status',
    });
    return;
  }

  // Check bay is available
  const bay = await db.query(
    `SELECT * FROM bays WHERE id = $1 AND branch_id = $2 AND is_active = true`,
    [bay_id, branchId]
  );

  if (bay.rows.length === 0) {
    res.status(400).json({
      success: false,
      error: 'Invalid bay',
    });
    return;
  }

  if (bay.rows[0].status !== 'available') {
    res.status(400).json({
      success: false,
      error: ERROR_MESSAGES.BAY_NOT_AVAILABLE,
    });
    return;
  }

  await transaction(async (client) => {
    // Free previous bay if any
    if (job.rows[0].bay_id) {
      await client.query(
        `UPDATE bays SET status = 'available', current_job_id = NULL WHERE id = $1`,
        [job.rows[0].bay_id]
      );
    }

    // Assign new bay
    await client.query(
      `UPDATE jobs SET bay_id = $1, status = 'in_queue', updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [bay_id, id]
    );

    await client.query(
      `UPDATE bays SET status = 'occupied', current_job_id = $1 WHERE id = $2`,
      [id, bay_id]
    );
  });

  res.json({
    success: true,
    message: 'Bay assigned successfully',
  });
});

/**
 * Assign staff to job
 * PUT /api/v1/jobs/:id/assign-staff
 */
export const assignStaff = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { staff_id } = req.body;

  // Check job exists
  const job = await db.query(`SELECT id FROM jobs WHERE id = $1`, [id]);
  if (job.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.JOB_NOT_FOUND,
    });
    return;
  }

  // Check staff exists and is active
  const staff = await db.query(
    `SELECT id FROM users WHERE id = $1 AND status = 'active' AND role IN ('attendant', 'cashier')`,
    [staff_id]
  );

  if (staff.rows.length === 0) {
    res.status(400).json({
      success: false,
      error: 'Invalid or inactive staff member',
    });
    return;
  }

  await db.query(
    `UPDATE jobs SET assigned_staff_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [staff_id, id]
  );

  res.json({
    success: true,
    message: 'Staff assigned successfully',
  });
});

/**
 * Add service to existing job
 * POST /api/v1/jobs/:id/services
 */
export const addService = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { service_id, quantity = 1, discount = 0 } = req.body;

  // Get job with vehicle type
  const job = await db.query(
    `SELECT j.*, v.vehicle_type
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     WHERE j.id = $1`,
    [id]
  );

  if (job.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.JOB_NOT_FOUND,
    });
    return;
  }

  if (['paid', 'cancelled'].includes(job.rows[0].status)) {
    res.status(400).json({
      success: false,
      error: 'Cannot add services to paid or cancelled jobs',
    });
    return;
  }

  // Get service price
  const priceResult = await db.query(
    `SELECT COALESCE(
       (SELECT price FROM service_pricing WHERE service_id = $1 AND vehicle_type = $2),
       (SELECT base_price FROM services WHERE id = $1)
     ) as price, s.name
     FROM services s
     WHERE s.id = $1`,
    [service_id, job.rows[0].vehicle_type]
  );

  if (priceResult.rows.length === 0) {
    res.status(400).json({
      success: false,
      error: ERROR_MESSAGES.SERVICE_NOT_FOUND,
    });
    return;
  }

  const price = parseFloat(priceResult.rows[0].price);
  const total = (price * quantity) - discount;

  await transaction(async (client) => {
    // Add service
    await client.query(
      `INSERT INTO job_services (job_id, service_id, price, quantity, discount, total)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, service_id, price, quantity, discount, total]
    );

    // Update job totals
    await client.query(
      `UPDATE jobs
       SET total_amount = total_amount + $1,
           final_amount = (total_amount + $1) - discount_amount,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [price * quantity, id]
    );
  });

  res.json({
    success: true,
    message: 'Service added successfully',
  });
});

/**
 * Apply discount to job
 * POST /api/v1/jobs/:id/discount
 */
export const applyDiscount = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { discount_type, discount_value, reason } = req.body;

  const job = await db.query(
    `SELECT * FROM jobs WHERE id = $1`,
    [id]
  );

  if (job.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.JOB_NOT_FOUND,
    });
    return;
  }

  if (['paid', 'cancelled'].includes(job.rows[0].status)) {
    res.status(400).json({
      success: false,
      error: 'Cannot apply discount to paid or cancelled jobs',
    });
    return;
  }

  const totalAmount = parseFloat(job.rows[0].total_amount);
  let discountAmount: number;

  if (discount_type === 'percentage') {
    discountAmount = (totalAmount * discount_value) / 100;
  } else {
    discountAmount = Math.min(discount_value, totalAmount);
  }

  const finalAmount = totalAmount - discountAmount;

  await db.query(
    `UPDATE jobs
     SET discount_amount = $1, final_amount = $2,
         notes = COALESCE(notes, '') || $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [
      discountAmount,
      finalAmount,
      `\n[Discount: ${discount_type === 'percentage' ? discount_value + '%' : 'KES ' + discount_value}] ${reason || ''}`,
      id,
    ]
  );

  res.json({
    success: true,
    message: 'Discount applied successfully',
    data: {
      discount_amount: discountAmount,
      final_amount: finalAmount,
    },
  });
});

/**
 * Cancel job
 * POST /api/v1/jobs/:id/cancel
 */
export const cancelJob = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { reason } = req.body;

  const job = await db.query(`SELECT * FROM jobs WHERE id = $1`, [id]);

  if (job.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.JOB_NOT_FOUND,
    });
    return;
  }

  if (job.rows[0].status === 'paid') {
    res.status(400).json({
      success: false,
      error: 'Cannot cancel a paid job. Process a refund instead.',
    });
    return;
  }

  await transaction(async (client) => {
    // Update job status
    await client.query(
      `UPDATE jobs
       SET status = 'cancelled',
           notes = COALESCE(notes, '') || $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [`\n[CANCELLED] ${reason || 'No reason provided'}`, id]
    );

    // Free up bay
    if (job.rows[0].bay_id) {
      await client.query(
        `UPDATE bays SET status = 'available', current_job_id = NULL WHERE id = $1`,
        [job.rows[0].bay_id]
      );
    }
  });

  res.json({
    success: true,
    message: 'Job cancelled successfully',
  });
});

export default {
  getJobs,
  getJob,
  getJobByNumber,
  checkIn,
  updateStatus,
  assignBay,
  assignStaff,
  addService,
  applyDiscount,
  cancelJob,
};
