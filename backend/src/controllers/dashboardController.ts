import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest, DashboardMetrics, DashboardAlerts, Job, InventoryItem } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { LONG_WAIT_THRESHOLD, JOB_STATUS } from '../utils/constants';
import { getStartOfDay, getEndOfDay, getMinutesDifference } from '../utils/helpers';

/**
 * Get dashboard metrics
 * GET /api/v1/dashboard/metrics
 */
export const getMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const branchId = req.user?.branch_id || req.query.branch_id;
  const today = new Date();
  const startOfToday = getStartOfDay(today);
  const endOfToday = getEndOfDay(today);

  const branchConditionWithDate = branchId ? 'AND j.branch_id = $3' : '';
  const branchConditionOnly = branchId ? 'AND j.branch_id = $1' : '';
  const paramsWithDate = branchId
    ? [startOfToday, endOfToday, branchId]
    : [startOfToday, endOfToday];

  // Get cars serviced today
  const carsServicedResult = await db.query(
    `SELECT COUNT(*) as count
     FROM jobs j
     WHERE j.created_at >= $1 AND j.created_at <= $2
     AND j.status NOT IN ('cancelled')
     ${branchConditionWithDate}`,
    paramsWithDate
  );

  // Get active jobs (not completed or cancelled)
  const activeJobsResult = await db.query(
    `SELECT COUNT(*) as count
     FROM jobs j
     WHERE j.status IN ('checked_in', 'in_queue', 'washing', 'detailing')
     ${branchConditionOnly}`,
    branchId ? [branchId] : []
  );

  // Get completed but unpaid jobs
  const unpaidJobsResult = await db.query(
    `SELECT COUNT(*) as count
     FROM jobs j
     WHERE j.status = 'completed'
     ${branchConditionOnly}`,
    branchId ? [branchId] : []
  );

  // Get today's revenue by payment method
  const revenueResult = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END), 0) as cash,
       COALESCE(SUM(CASE WHEN p.payment_method = 'mpesa' THEN p.amount ELSE 0 END), 0) as mpesa,
       COALESCE(SUM(CASE WHEN p.payment_method = 'card' THEN p.amount ELSE 0 END), 0) as card,
       COALESCE(SUM(p.amount), 0) as total
     FROM payments p
     JOIN jobs j ON p.job_id = j.id
     WHERE p.created_at >= $1 AND p.created_at <= $2
     AND p.status = 'completed'
     ${branchConditionWithDate}`,
    paramsWithDate
  );

  // Get average service time for completed jobs today
  const avgTimeResult = await db.query(
    `SELECT AVG(EXTRACT(EPOCH FROM (actual_completion - created_at)) / 60) as avg_minutes
     FROM jobs j
     WHERE j.actual_completion IS NOT NULL
     AND j.created_at >= $1 AND j.created_at <= $2
     ${branchConditionWithDate}`,
    paramsWithDate
  );

  // Get staff on duty (users who logged in today or have active jobs)
  const staffResult = await db.query(
    `SELECT COUNT(DISTINCT u.id) as count
     FROM users u
     WHERE u.status = 'active'
     AND u.role IN ('attendant', 'cashier')
     AND (u.last_login >= $1 OR EXISTS (
       SELECT 1 FROM jobs j WHERE j.assigned_staff_id = u.id
       AND j.status IN ('washing', 'detailing')
     ))
     ${branchId ? 'AND u.branch_id = $2' : ''}`,
    branchId ? [startOfToday, branchId] : [startOfToday]
  );

  // Get low stock alerts count
  const lowStockResult = await db.query(
    `SELECT COUNT(*) as count
     FROM inventory_items
     WHERE quantity <= reorder_level
     AND is_active = true
     ${branchId ? 'AND branch_id = $1' : ''}`,
    branchId ? [branchId] : []
  );

  const metrics: DashboardMetrics = {
    carsServicedToday: parseInt(carsServicedResult.rows[0]?.count || '0', 10),
    activeJobs: parseInt(activeJobsResult.rows[0]?.count || '0', 10),
    completedUnpaid: parseInt(unpaidJobsResult.rows[0]?.count || '0', 10),
    revenueToday: {
      cash: parseFloat(revenueResult.rows[0]?.cash || '0'),
      mpesa: parseFloat(revenueResult.rows[0]?.mpesa || '0'),
      card: parseFloat(revenueResult.rows[0]?.card || '0'),
      total: parseFloat(revenueResult.rows[0]?.total || '0'),
    },
    averageServiceTime: Math.round(parseFloat(avgTimeResult.rows[0]?.avg_minutes || '0') || 0),
    staffOnDuty: parseInt(staffResult.rows[0]?.count || '0', 10),
    lowStockItems: parseInt(lowStockResult.rows[0]?.count || '0', 10),
  };

  res.json({
    success: true,
    data: metrics,
  });
});

/**
 * Get dashboard alerts
 * GET /api/v1/dashboard/alerts
 */
export const getAlerts = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const branchId = req.user?.branch_id || req.query.branch_id;
  const branchCondition = branchId ? 'AND branch_id = $1' : '';
  const branchParams = branchId ? [branchId] : [];

  // Check bay congestion (all bays occupied)
  const bayResult = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'occupied') as occupied,
       COUNT(*) as total
     FROM bays
     WHERE is_active = true
     ${branchCondition}`,
    branchParams
  );
  const bayCongestion = parseInt(bayResult.rows[0].occupied, 10) >= parseInt(bayResult.rows[0].total, 10);

  // Get long-wait vehicles
  const longWaitResult = await db.query<Job>(
    `SELECT j.*, v.registration_no, v.vehicle_type
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     WHERE j.status IN ('checked_in', 'in_queue')
     AND j.created_at < NOW() - INTERVAL '${LONG_WAIT_THRESHOLD} minutes'
     ${branchId ? 'AND j.branch_id = $1' : ''}
     ORDER BY j.created_at ASC`,
    branchParams
  );

  // Get low inventory items
  const lowInventoryResult = await db.query<InventoryItem>(
    `SELECT id, name, category, quantity, reorder_level, unit
     FROM inventory_items
     WHERE quantity <= reorder_level
     AND is_active = true
     ${branchCondition}
     ORDER BY (quantity / NULLIF(reorder_level, 0)) ASC
     LIMIT 10`,
    branchParams
  );

  // Get cash variance from latest closed session
  const cashVarianceResult = await db.query(
    `SELECT variance
     FROM cash_sessions
     WHERE status = 'closed'
     ${branchCondition}
     ORDER BY closed_at DESC
     LIMIT 1`,
    branchParams
  );

  const alerts: DashboardAlerts = {
    bayCongestion,
    longWaitVehicles: longWaitResult.rows,
    lowInventoryItems: lowInventoryResult.rows,
    cashVariance: cashVarianceResult.rows[0]?.variance || 0,
  };

  res.json({
    success: true,
    data: alerts,
  });
});

/**
 * Get active jobs for queue display
 * GET /api/v1/dashboard/queue
 */
export const getQueue = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const branchId = req.user?.branch_id || req.query.branch_id;

  const result = await db.query(
    `SELECT
       j.id, j.job_no, j.status, j.created_at, j.estimated_completion,
       j.notes, j.bay_id,
       v.registration_no, v.vehicle_type, v.color,
       c.name as customer_name, c.phone as customer_phone,
       u.name as assigned_staff_name,
       b.name as bay_name, b.bay_number,
       ARRAY_AGG(DISTINCT s.name) as services
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     LEFT JOIN customers c ON j.customer_id = c.id
     LEFT JOIN users u ON j.assigned_staff_id = u.id
     LEFT JOIN bays b ON j.bay_id = b.id
     LEFT JOIN job_services js ON j.id = js.job_id
     LEFT JOIN services s ON js.service_id = s.id
     WHERE j.status IN ('checked_in', 'in_queue', 'washing', 'detailing')
     ${branchId ? 'AND j.branch_id = $1' : ''}
     GROUP BY j.id, v.id, c.id, u.id, b.id
     ORDER BY
       CASE j.status
         WHEN 'washing' THEN 1
         WHEN 'detailing' THEN 2
         WHEN 'in_queue' THEN 3
         WHEN 'checked_in' THEN 4
       END,
       j.created_at ASC`,
    branchId ? [branchId] : []
  );

  // Add wait time to each job
  const jobsWithWaitTime = result.rows.map(job => ({
    ...job,
    wait_time_minutes: getMinutesDifference(job.created_at),
    is_long_wait: getMinutesDifference(job.created_at) > LONG_WAIT_THRESHOLD,
  }));

  res.json({
    success: true,
    data: jobsWithWaitTime,
  });
});

/**
 * Get bay status overview
 * GET /api/v1/dashboard/bays
 */
export const getBayStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const branchId = req.user?.branch_id || req.query.branch_id;

  const result = await db.query(
    `SELECT
       b.id, b.name, b.bay_number, b.bay_type, b.status,
       j.id as job_id, j.job_no, j.status as job_status, j.created_at as job_started,
       v.registration_no, v.vehicle_type,
       u.name as staff_name
     FROM bays b
     LEFT JOIN jobs j ON b.current_job_id = j.id
     LEFT JOIN vehicles v ON j.vehicle_id = v.id
     LEFT JOIN users u ON j.assigned_staff_id = u.id
     WHERE b.is_active = true
     ${branchId ? 'AND b.branch_id = $1' : ''}
     ORDER BY b.bay_number ASC`,
    branchId ? [branchId] : []
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
 * Get today's summary
 * GET /api/v1/dashboard/summary
 */
export const getTodaySummary = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const branchId = req.user?.branch_id || req.query.branch_id;
  const today = new Date();
  const startOfToday = getStartOfDay(today);
  const endOfToday = getEndOfDay(today);

  const branchCondition = branchId ? 'AND j.branch_id = $3' : '';
  const params = branchId
    ? [startOfToday, endOfToday, branchId]
    : [startOfToday, endOfToday];

  // Jobs by status
  const jobsByStatusResult = await db.query(
    `SELECT status, COUNT(*) as count
     FROM jobs j
     WHERE j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY status`,
    params
  );

  // Revenue by service
  const revenueByServiceResult = await db.query(
    `SELECT s.name, s.category, COUNT(js.id) as count, SUM(js.total) as revenue
     FROM job_services js
     JOIN services s ON js.service_id = s.id
     JOIN jobs j ON js.job_id = j.id
     WHERE j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY s.id
     ORDER BY revenue DESC
     LIMIT 10`,
    params
  );

  // Jobs by vehicle type
  const jobsByVehicleResult = await db.query(
    `SELECT v.vehicle_type, COUNT(*) as count
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     WHERE j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY v.vehicle_type
     ORDER BY count DESC`,
    params
  );

  // Hourly distribution
  const hourlyResult = await db.query(
    `SELECT EXTRACT(HOUR FROM j.created_at) as hour, COUNT(*) as count
     FROM jobs j
     WHERE j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY hour
     ORDER BY hour`,
    params
  );

  // Staff performance
  const staffPerformanceResult = await db.query(
    `SELECT u.id, u.name, COUNT(j.id) as jobs_completed,
            AVG(EXTRACT(EPOCH FROM (j.actual_completion - j.created_at)) / 60) as avg_time
     FROM users u
     LEFT JOIN jobs j ON u.id = j.assigned_staff_id
       AND j.status = 'paid'
       AND j.created_at >= $1 AND j.created_at <= $2
       ${branchCondition}
     WHERE u.role = 'attendant' AND u.status = 'active'
     ${branchId ? 'AND u.branch_id = $3' : ''}
     GROUP BY u.id
     ORDER BY jobs_completed DESC`,
    params
  );

  res.json({
    success: true,
    data: {
      jobsByStatus: jobsByStatusResult.rows,
      revenueByService: revenueByServiceResult.rows,
      jobsByVehicle: jobsByVehicleResult.rows,
      hourlyDistribution: hourlyResult.rows,
      staffPerformance: staffPerformanceResult.rows,
    },
  });
});

/**
 * Get recent activities
 * GET /api/v1/dashboard/activities
 */
export const getRecentActivities = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const branchId = req.user?.branch_id;
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);

  const result = await db.query(
    `SELECT al.*, u.name as user_name
     FROM activity_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ${branchId ? 'WHERE u.branch_id = $2' : ''}
     ORDER BY al.created_at DESC
     LIMIT $1`,
    branchId ? [limit, branchId] : [limit]
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * Get quick stats comparison (today vs yesterday)
 * GET /api/v1/dashboard/comparison
 */
export const getComparison = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const branchId = req.user?.branch_id || req.query.branch_id;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStart = getStartOfDay(today);
  const todayEnd = getEndOfDay(today);
  const yesterdayStart = getStartOfDay(yesterday);
  const yesterdayEnd = getEndOfDay(yesterday);

  const branchCondition = branchId ? 'AND j.branch_id = $5' : '';
  const params = branchId
    ? [todayStart, todayEnd, yesterdayStart, yesterdayEnd, branchId]
    : [todayStart, todayEnd, yesterdayStart, yesterdayEnd];

  const result = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE j.created_at >= $1 AND j.created_at <= $2) as today_jobs,
       COUNT(*) FILTER (WHERE j.created_at >= $3 AND j.created_at <= $4) as yesterday_jobs,
       COALESCE(SUM(j.final_amount) FILTER (WHERE j.created_at >= $1 AND j.created_at <= $2 AND j.status = 'paid'), 0) as today_revenue,
       COALESCE(SUM(j.final_amount) FILTER (WHERE j.created_at >= $3 AND j.created_at <= $4 AND j.status = 'paid'), 0) as yesterday_revenue
     FROM jobs j
     WHERE (j.created_at >= $1 AND j.created_at <= $2) OR (j.created_at >= $3 AND j.created_at <= $4)
     ${branchCondition}`,
    params
  );

  const data = result.rows[0];
  const todayJobs = parseInt(data.today_jobs, 10);
  const yesterdayJobs = parseInt(data.yesterday_jobs, 10);
  const todayRevenue = parseFloat(data.today_revenue);
  const yesterdayRevenue = parseFloat(data.yesterday_revenue);

  res.json({
    success: true,
    data: {
      jobs: {
        today: todayJobs,
        yesterday: yesterdayJobs,
        change: yesterdayJobs > 0 ? ((todayJobs - yesterdayJobs) / yesterdayJobs) * 100 : 0,
      },
      revenue: {
        today: todayRevenue,
        yesterday: yesterdayRevenue,
        change: yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0,
      },
    },
  });
});

export default {
  getMetrics,
  getAlerts,
  getQueue,
  getBayStatus,
  getTodaySummary,
  getRecentActivities,
  getComparison,
};
