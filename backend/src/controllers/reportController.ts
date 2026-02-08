import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Get comprehensive dashboard report
 * GET /api/v1/reports/dashboard
 */
export const getDashboardReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { period = 'today', branch_id } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  let dateCondition = '';
  let params: any[] = [];
  let paramIndex = 1;

  // Calculate date range based on period
  const now = new Date();
  let startDate: Date;
  let endDate = now;

  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'yesterday':
      startDate = new Date(now.setDate(now.getDate() - 1));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setHours(0, 0, 0, 0));
  }

  dateCondition = `created_at >= $${paramIndex++} AND created_at <= $${paramIndex++}`;
  params.push(startDate, endDate);

  if (branchId) {
    dateCondition += ` AND branch_id = $${paramIndex++}`;
    params.push(branchId);
  }

  // Revenue summary
  const revenueResult = await db.query(
    `SELECT 
      COUNT(*) as total_jobs,
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(AVG(total_amount), 0) as average_job_value,
      COUNT(CASE WHEN status = 'completed' OR status = 'paid' THEN 1 END) as completed_jobs,
      COUNT(CASE WHEN status IN ('checked_in', 'in_queue', 'washing', 'detailing') THEN 1 END) as active_jobs
    FROM jobs 
    WHERE ${dateCondition}`,
    params
  );

  // Payment breakdown
  const paymentResult = await db.query(
    `SELECT 
      p.payment_method,
      COUNT(*) as transaction_count,
      COALESCE(SUM(p.amount), 0) as total_amount
    FROM payments p
    JOIN jobs j ON p.job_id = j.id
    WHERE p.${dateCondition.replace('created_at', 'p.created_at').replace('branch_id', 'j.branch_id')}
    AND p.status = 'completed'
    GROUP BY p.payment_method`,
    params
  );

  // Top services
  const servicesResult = await db.query(
    `SELECT 
      s.name,
      s.category,
      COUNT(js.id) as service_count,
      COALESCE(SUM(js.total), 0) as revenue
    FROM job_services js
    JOIN services s ON js.service_id = s.id
    JOIN jobs j ON js.job_id = j.id
    WHERE j.${dateCondition}
    GROUP BY s.id, s.name, s.category
    ORDER BY revenue DESC
    LIMIT 10`,
    params
  );

  res.json({
    success: true,
    data: {
      summary: revenueResult.rows[0],
      payment_breakdown: paymentResult.rows,
      top_services: servicesResult.rows,
      period,
      date_range: { start: startDate, end: endDate },
    },
  });
});

/**
 * Get sales report with time series data
 * GET /api/v1/reports/sales
 */
export const getSalesReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id, group_by = 'day' } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const startDate = date_from ? new Date(date_from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = date_to ? new Date(date_to as string) : new Date();

  const branchCondition = branchId ? 'AND j.branch_id = $3' : '';
  const params = branchId ? [startDate, endDate, branchId] : [startDate, endDate];

  // Summary
  const summaryResult = await db.query(
    `SELECT
       COUNT(DISTINCT j.id) as total_jobs,
       COALESCE(SUM(j.total_amount), 0) as total_revenue,
       COALESCE(SUM(j.discount_amount), 0) as total_discounts,
       COALESCE(AVG(j.total_amount), 0) as average_ticket,
       COUNT(DISTINCT j.customer_id) as unique_customers
     FROM jobs j
     WHERE j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}`,
    params
  );

  // Payment breakdown
  const paymentResult = await db.query(
    `SELECT
       p.payment_method,
       COUNT(*) as count,
       COALESCE(SUM(p.amount), 0) as total
     FROM payments p
     JOIN jobs j ON p.job_id = j.id
     WHERE p.status = 'completed'
     AND p.created_at >= $1 AND p.created_at <= $2
     ${branchCondition}
     GROUP BY p.payment_method
     ORDER BY total DESC`,
    params
  );

  // Service breakdown
  const serviceResult = await db.query(
    `SELECT
       s.name,
       s.category,
       COUNT(js.id) as count,
       COALESCE(SUM(js.total), 0) as revenue
     FROM job_services js
     JOIN services s ON js.service_id = s.id
     JOIN jobs j ON js.job_id = j.id
     WHERE j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY s.id, s.name, s.category
     ORDER BY revenue DESC
     LIMIT 20`,
    params
  );

  // Time series data
  let dateFormat: string;
  switch (group_by) {
    case 'week':
      dateFormat = 'IYYY-IW';
      break;
    case 'month':
      dateFormat = 'YYYY-MM';
      break;
    case 'year':
      dateFormat = 'YYYY';
      break;
    default:
      dateFormat = 'YYYY-MM-DD';
  }

  const trendResult = await db.query(
    `SELECT
       TO_CHAR(j.created_at, '${dateFormat}') as period,
       COUNT(*) as jobs,
       COALESCE(SUM(j.total_amount), 0) as revenue
     FROM jobs j
     WHERE j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY period
     ORDER BY period ASC`,
    params
  );

  // Vehicle type breakdown
  const vehicleResult = await db.query(
    `SELECT
       v.vehicle_type,
       COUNT(j.id) as job_count,
       COALESCE(SUM(j.total_amount), 0) as revenue
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     WHERE j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY v.vehicle_type
     ORDER BY revenue DESC`,
    params
  );

  res.json({
    success: true,
    data: {
      summary: summaryResult.rows[0],
      payments: paymentResult.rows,
      services: serviceResult.rows,
      trends: trendResult.rows,
      vehicles: vehicleResult.rows,
    },
  });
});

/**
 * Get expenses report
 * GET /api/v1/reports/expenses
 */
export const getExpensesReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id, category } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const startDate = date_from ? new Date(date_from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = date_to ? new Date(date_to as string) : new Date();

  let conditions = ['e.expense_date >= $1', 'e.expense_date <= $2'];
  const params: any[] = [startDate, endDate];
  let paramIndex = 3;

  if (branchId) {
    conditions.push(`e.branch_id = $${paramIndex++}`);
    params.push(branchId);
  }

  if (category) {
    conditions.push(`e.category = $${paramIndex++}`);
    params.push(category);
  }

  const whereClause = conditions.join(' AND ');

  // Summary
  const summaryResult = await db.query(
    `SELECT
       COUNT(*) as total_expenses,
       COALESCE(SUM(amount), 0) as total_amount,
       COALESCE(AVG(amount), 0) as average_expense
     FROM expenses e
     WHERE ${whereClause}`,
    params
  );

  // By category
  const categoryResult = await db.query(
    `SELECT
       category,
       COUNT(*) as count,
       COALESCE(SUM(amount), 0) as total
     FROM expenses e
     WHERE ${whereClause}
     GROUP BY category
     ORDER BY total DESC`,
    params
  );

  // Trend
  const trendResult = await db.query(
    `SELECT
       TO_CHAR(expense_date, 'YYYY-MM-DD') as date,
       COALESCE(SUM(amount), 0) as total
     FROM expenses e
     WHERE ${whereClause}
     GROUP BY date
     ORDER BY date ASC`,
    params
  );

  res.json({
    success: true,
    data: {
      summary: summaryResult.rows[0],
      by_category: categoryResult.rows,
      trends: trendResult.rows,
    },
  });
});

/**
 * Get inventory consumption report
 * GET /api/v1/reports/inventory
 */
export const getInventoryReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const startDate = date_from ? new Date(date_from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = date_to ? new Date(date_to as string) : new Date();

  const branchCondition = branchId ? 'AND i.branch_id = $3' : '';
  const params = branchId ? [startDate, endDate, branchId] : [startDate, endDate];

  // Current stock levels
  const stockResult = await db.query(
    `SELECT
       i.id,
       i.name,
       i.category,
       i.unit,
       i.quantity,
       i.reorder_level,
       CASE
         WHEN i.quantity <= 0 THEN 'out_of_stock'
         WHEN i.quantity <= i.reorder_level THEN 'low_stock'
         ELSE 'in_stock'
       END as status
     FROM inventory_items i
     WHERE i.is_active = true ${branchCondition.replace('i.branch_id', 'i.branch_id')}
     ORDER BY 
       CASE
         WHEN i.quantity <= 0 THEN 1
         WHEN i.quantity <= i.reorder_level THEN 2
         ELSE 3
       END,
       i.name`,
    branchId ? [branchId] : []
  );

  // Consumption over period
  const consumptionResult = await db.query(
    `SELECT
       i.name,
       i.category,
       i.unit,
       COUNT(t.id) as transaction_count,
       COALESCE(SUM(CASE WHEN t.transaction_type = 'stock_out' THEN t.quantity ELSE 0 END), 0) as consumed,
       COALESCE(SUM(CASE WHEN t.transaction_type = 'stock_in' THEN t.quantity ELSE 0 END), 0) as restocked
     FROM inventory_items i
     LEFT JOIN inventory_transactions t ON i.id = t.item_id
       AND t.created_at >= $1 AND t.created_at <= $2
     WHERE i.is_active = true ${branchCondition}
     GROUP BY i.id, i.name, i.category, i.unit
     HAVING COUNT(t.id) > 0
     ORDER BY consumed DESC
     LIMIT 20`,
    params
  );

  // Low stock alerts
  const alertsResult = await db.query(
    `SELECT
       i.name,
       i.quantity,
       i.reorder_level,
       i.unit
     FROM inventory_items i
     WHERE i.is_active = true
     AND i.quantity <= i.reorder_level
     ${branchCondition}
     ORDER BY (i.quantity / NULLIF(i.reorder_level, 0)) ASC`,
    branchId ? [branchId] : []
  );

  res.json({
    success: true,
    data: {
      current_stock: stockResult.rows,
      consumption: consumptionResult.rows,
      low_stock_alerts: alertsResult.rows,
    },
  });
});

/**
 * Get staff performance report
 * GET /api/v1/reports/staff
 */
export const getStaffReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const startDate = date_from ? new Date(date_from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = date_to ? new Date(date_to as string) : new Date();

  const branchCondition = branchId ? 'AND u.branch_id = $3' : '';
  const params = branchId ? [startDate, endDate, branchId] : [startDate, endDate];

  // Staff performance
  const performanceResult = await db.query(
    `SELECT
       u.id,
       u.name,
       u.role,
       COUNT(DISTINCT j.id) as jobs_completed,
       COALESCE(SUM(j.total_amount), 0) as total_revenue,
       COALESCE(SUM(c.amount), 0) as total_commission,
       u.commission_rate
     FROM users u
     LEFT JOIN jobs j ON u.id = j.assigned_staff_id
       AND j.created_at >= $1 AND j.created_at <= $2
       AND j.status IN ('completed', 'paid')
     LEFT JOIN commissions c ON u.id = c.staff_id
       AND c.created_at >= $1 AND c.created_at <= $2
     WHERE u.status = 'active'
     AND u.role IN ('attendant', 'cashier', 'manager')
     ${branchCondition}
     GROUP BY u.id, u.name, u.role, u.commission_rate
     ORDER BY total_revenue DESC`,
    params
  );

  res.json({
    success: true,
    data: performanceResult.rows,
  });
});

/**
 * Get customer analytics
 * GET /api/v1/reports/customers
 */
export const getCustomersReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const startDate = date_from ? new Date(date_from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = date_to ? new Date(date_to as string) : new Date();

  const branchCondition = branchId ? 'AND j.branch_id = $3' : '';
  const params = branchId ? [startDate, endDate, branchId] : [startDate, endDate];

  // Customer summary
  const summaryResult = await db.query(
    `SELECT
       COUNT(DISTINCT c.id) as total_customers,
       COUNT(DISTINCT j.customer_id) as active_customers,
       COALESCE(AVG(customer_stats.visit_count), 0) as avg_visits_per_customer,
       COALESCE(AVG(customer_stats.total_spent), 0) as avg_spent_per_customer
     FROM customers c
     LEFT JOIN (
       SELECT
         customer_id,
         COUNT(*) as visit_count,
         SUM(total_amount) as total_spent
       FROM jobs
       WHERE created_at >= $1 AND created_at <= $2
       GROUP BY customer_id
     ) customer_stats ON c.id = customer_stats.customer_id
     LEFT JOIN jobs j ON c.id = j.customer_id
       AND j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}`,
    params
  );

  // Top customers
  const topCustomersResult = await db.query(
    `SELECT
       c.name,
       c.phone,
       COUNT(j.id) as visit_count,
       COALESCE(SUM(j.total_amount), 0) as total_spent,
       c.loyalty_points
     FROM customers c
     JOIN jobs j ON c.id = j.customer_id
     WHERE j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY c.id, c.name, c.phone, c.loyalty_points
     ORDER BY total_spent DESC
     LIMIT 20`,
    params
  );

  // New vs returning
  const segmentResult = await db.query(
    `SELECT
       CASE WHEN c.total_visits = 1 THEN 'new' ELSE 'returning' END as segment,
       COUNT(*) as count
     FROM customers c
     JOIN jobs j ON c.id = j.customer_id
     WHERE j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY segment`,
    params
  );

  res.json({
    success: true,
    data: {
      summary: summaryResult.rows[0],
      top_customers: topCustomersResult.rows,
      segmentation: segmentResult.rows,
    },
  });
});

/**
 * Get financial summary
 * GET /api/v1/reports/financial
 */
export const getFinancialReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const startDate = date_from ? new Date(date_from as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const endDate = date_to ? new Date(date_to as string) : new Date();

  const branchCondition = branchId ? 'AND branch_id = $3' : '';
  const params = branchId ? [startDate, endDate, branchId] : [startDate, endDate];

  // Revenue
  const revenueResult = await db.query(
    `SELECT COALESCE(SUM(total_amount), 0) as total_revenue
     FROM jobs
     WHERE created_at >= $1 AND created_at <= $2
     ${branchCondition}`,
    params
  );

  // Expenses
  const expensesResult = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as total_expenses
     FROM expenses
     WHERE expense_date >= $1 AND expense_date <= $2
     ${branchCondition}`,
    params
  );

  // Commissions
  const commissionsResult = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as total_commissions
     FROM commissions
     WHERE created_at >= $1 AND created_at <= $2
     ${branchCondition.replace('branch_id', 'staff_id IN (SELECT id FROM users WHERE branch_id')}`,
    params
  );

  const revenue = parseFloat(revenueResult.rows[0].total_revenue);
  const expenses = parseFloat(expensesResult.rows[0].total_expenses);
  const commissions = parseFloat(commissionsResult.rows[0].total_commissions);
  const netProfit = revenue - expenses - commissions;

  res.json({
    success: true,
    data: {
      revenue,
      expenses,
      commissions,
      net_profit: netProfit,
      profit_margin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0,
    },
  });
});

export default {
  getDashboardReport,
  getSalesReport,
  getExpensesReport,
  getInventoryReport,
  getStaffReport,
  getCustomersReport,
  getFinancialReport,
};
