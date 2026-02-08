import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Get comprehensive dashboard report
 */
export const getDashboardReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { period = 'today' } = req.query;
  const branchId = req.user?.branch_id;
  const isSuperAdmin = req.user?.role === 'super_admin';

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

  const baseParams = [startDate.toISOString(), endDate.toISOString()];
  const withBranchParams = isSuperAdmin ? baseParams : [...baseParams, branchId];
  const branchWhere = isSuperAdmin ? '' : 'AND branch_id = $3';

  const revenueResult = await db.query(
    `SELECT
      COUNT(*) as total_jobs,
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(AVG(total_amount), 0) as average_job_value,
      COUNT(CASE WHEN status IN ('completed', 'paid') THEN 1 END) as completed_jobs,
      COUNT(CASE WHEN status IN ('checked_in', 'in_queue', 'washing', 'detailing') THEN 1 END) as active_jobs
    FROM jobs
    WHERE created_at >= $1 AND created_at <= $2 ${branchWhere}`,
    withBranchParams
  );

  const paymentResult = await db.query(
    `SELECT
      p.payment_method,
      COUNT(*) as transaction_count,
      COALESCE(SUM(p.amount), 0) as total_amount
    FROM payments p
    JOIN jobs j ON p.job_id = j.id
    WHERE p.created_at >= $1 AND p.created_at <= $2
    AND p.status = 'completed' ${isSuperAdmin ? '' : 'AND j.branch_id = $3'}
    GROUP BY p.payment_method`,
    withBranchParams
  );

  const servicesResult = await db.query(
    `SELECT
      s.name,
      s.category,
      COUNT(js.id) as service_count,
      COALESCE(SUM(js.total), 0) as revenue
    FROM job_services js
    JOIN services s ON js.service_id = s.id
    JOIN jobs j ON js.job_id = j.id
    WHERE j.created_at >= $1 AND j.created_at <= $2 ${isSuperAdmin ? '' : 'AND j.branch_id = $3'}
    GROUP BY s.id, s.name, s.category
    ORDER BY revenue DESC
    LIMIT 10`,
    withBranchParams
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
 * Get sales report
 */
export const getSalesReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id } = req.query;
  const userBranch = req.user?.branch_id;
  const isSuperAdmin = req.user?.role === 'super_admin';
  const branchId = branch_id || userBranch;

  const startDate = date_from ? new Date(date_from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = date_to ? new Date(date_to as string) : new Date();

  const baseParams = [startDate.toISOString(), endDate.toISOString()];
  const withBranchParams = (isSuperAdmin || !branchId) ? baseParams : [...baseParams, branchId];
  const branchWhere = (isSuperAdmin || !branchId) ? '' : 'AND j.branch_id = $3';

  const summaryResult = await db.query(
    `SELECT
       COUNT(DISTINCT j.id) as total_jobs,
       COALESCE(SUM(j.total_amount), 0) as total_revenue,
       COALESCE(SUM(j.discount_amount), 0) as total_discounts,
       COALESCE(AVG(j.total_amount), 0) as average_ticket,
       COUNT(DISTINCT j.customer_id) as unique_customers
     FROM jobs j
     WHERE j.created_at >= $1 AND j.created_at <= $2 ${branchWhere}`,
    withBranchParams
  );

  const paymentResult = await db.query(
    `SELECT
       p.payment_method,
       COUNT(*) as count,
       COALESCE(SUM(p.amount), 0) as total
     FROM payments p
     JOIN jobs j ON p.job_id = j.id
     WHERE p.status = 'completed'
     AND p.created_at >= $1 AND p.created_at <= $2 ${branchWhere}
     GROUP BY p.payment_method
     ORDER BY total DESC`,
    withBranchParams
  );

  const serviceResult = await db.query(
    `SELECT
       s.name,
       s.category,
       COUNT(js.id) as count,
       COALESCE(SUM(js.total), 0) as revenue
     FROM job_services js
     JOIN services s ON js.service_id = s.id
     JOIN jobs j ON js.job_id = j.id
     WHERE j.created_at >= $1 AND j.created_at <= $2 ${branchWhere}
     GROUP BY s.id, s.name, s.category
     ORDER BY revenue DESC
     LIMIT 20`,
    withBranchParams
  );

  res.json({
    success: true,
    data: {
      summary: summaryResult.rows[0],
      payments: paymentResult.rows,
      services: serviceResult.rows,
    },
  });
});

/**
 * Get expenses report
 */
export const getExpensesReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id, category } = req.query;
  const userBranch = req.user?.branch_id;
  const isSuperAdmin = req.user?.role === 'super_admin';
  const branchId = branch_id || userBranch;

  const startDate = date_from ? new Date(date_from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = date_to ? new Date(date_to as string) : new Date();

  const conditions: string[] = ['e.expense_date >= $1', 'e.expense_date <= $2'];
  const params: any[] = [startDate.toISOString(), endDate.toISOString()];
  let paramIndex = 3;

  if (!isSuperAdmin && branchId) {
    conditions.push(`e.branch_id = $${paramIndex++}`);
    params.push(String(branchId));
  }

  if (category) {
    conditions.push(`e.category = $${paramIndex++}`);
    params.push(category);
  }

  const whereClause = conditions.join(' AND ');

  const summaryResult = await db.query(
    `SELECT COUNT(*) as total_expenses, COALESCE(SUM(amount), 0) as total_amount, COALESCE(AVG(amount), 0) as average_expense
     FROM expenses e WHERE ${whereClause}`,
    params
  );

  const categoryResult = await db.query(
    `SELECT category, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
     FROM expenses e WHERE ${whereClause} GROUP BY category ORDER BY total DESC`,
    params
  );

  res.json({
    success: true,
    data: {
      summary: summaryResult.rows[0],
      by_category: categoryResult.rows,
    },
  });
});

/**
 * Get inventory report
 */
export const getInventoryReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id } = req.query;
  const userBranch = req.user?.branch_id;
  const isSuperAdmin = req.user?.role === 'super_admin';
  const branchId = branch_id || userBranch;

  const startDate = date_from ? new Date(date_from as string).toISOString() : new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
  const endDate = date_to ? new Date(date_to as string).toISOString() : new Date().toISOString();

  const branchParams = (isSuperAdmin || !branchId) ? [] : [branchId];
  const branchWhere = (isSuperAdmin || !branchId) ? '' : 'AND i.branch_id = $1';

  const stockResult = await db.query(
    `SELECT i.id, i.name, i.category, i.unit, i.quantity, i.reorder_level,
       CASE
         WHEN i.quantity <= 0 THEN 'out_of_stock'
         WHEN i.quantity <= i.reorder_level THEN 'low_stock'
         ELSE 'in_stock'
       END as stock_status
     FROM inventory_items i
     WHERE i.is_active = true ${branchWhere}
     ORDER BY CASE WHEN i.quantity <= 0 THEN 1 WHEN i.quantity <= i.reorder_level THEN 2 ELSE 3 END, i.name`,
    branchParams
  );

  const consumptionParams = (isSuperAdmin || !branchId) ? [startDate, endDate] : [startDate, endDate, branchId];
  const consumptionBranchWhere = (isSuperAdmin || !branchId) ? '' : 'AND i.branch_id = $3';

  const consumptionResult = await db.query(
    `SELECT i.name, i.category, i.unit, COUNT(t.id) as transaction_count,
       COALESCE(SUM(CASE WHEN t.transaction_type = 'stock_out' THEN t.quantity ELSE 0 END), 0) as consumed,
       COALESCE(SUM(CASE WHEN t.transaction_type = 'stock_in' THEN t.quantity ELSE 0 END), 0) as restocked
     FROM inventory_items i
     LEFT JOIN inventory_transactions t ON i.id = t.item_id AND t.created_at >= $1 AND t.created_at <= $2
     WHERE i.is_active = true ${consumptionBranchWhere}
     GROUP BY i.id, i.name, i.category, i.unit
     HAVING COUNT(t.id) > 0
     ORDER BY consumed DESC LIMIT 20`,
    consumptionParams
  );

  const alertsResult = await db.query(
    `SELECT i.name, i.quantity, i.reorder_level, i.unit
     FROM inventory_items i
     WHERE i.is_active = true AND i.quantity <= i.reorder_level ${branchWhere}
     ORDER BY (i.quantity / NULLIF(i.reorder_level, 0)) ASC`,
    branchParams
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
 */
export const getStaffReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id } = req.query;
  const userBranch = req.user?.branch_id;
  const isSuperAdmin = req.user?.role === 'super_admin';
  const branchId = branch_id || userBranch;

  const startDate = date_from ? new Date(date_from as string).toISOString() : new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
  const endDate = date_to ? new Date(date_to as string).toISOString() : new Date().toISOString();

  const params = [startDate, endDate];
  const branchWhere = (isSuperAdmin || !branchId) ? '' : 'AND u.branch_id = $3';
  if (!isSuperAdmin && branchId) params.push(String(branchId));

  const performanceResult = await db.query(
    `SELECT u.id, u.name, u.role, COUNT(DISTINCT j.id) as jobs_completed,
       COALESCE(SUM(j.total_amount), 0) as total_revenue,
       COALESCE(SUM(c.amount), 0) as total_commission,
       u.commission_rate
     FROM users u
     LEFT JOIN jobs j ON u.id = j.assigned_staff_id AND j.created_at >= $1 AND j.created_at <= $2 AND j.status IN ('completed', 'paid')
     LEFT JOIN commissions c ON u.id = c.staff_id AND c.created_at >= $1 AND c.created_at <= $2
     WHERE u.status = 'active' AND u.role IN ('attendant', 'cashier', 'manager') ${branchWhere}
     GROUP BY u.id, u.name, u.role, u.commission_rate
     ORDER BY total_revenue DESC`,
    params
  );

  res.json({ success: true, data: performanceResult.rows });
});

/**
 * Get customers report
 */
export const getCustomersReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id } = req.query;
  const userBranch = req.user?.branch_id;
  const isSuperAdmin = req.user?.role === 'super_admin';
  const branchId = branch_id || userBranch;

  const startDate = date_from ? new Date(date_from as string).toISOString() : new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
  const endDate = date_to ? new Date(date_to as string).toISOString() : new Date().toISOString();

  const params = [startDate, endDate];
  const branchWhere = (isSuperAdmin || !branchId) ? '' : 'AND j.branch_id = $3';
  if (!isSuperAdmin && branchId) params.push(String(branchId));

  const summaryResult = await db.query(
    `SELECT COUNT(DISTINCT c.id) as total_customers, COUNT(DISTINCT j.customer_id) as active_customers,
       COALESCE(AVG(customer_stats.visit_count), 0) as avg_visits_per_customer,
       COALESCE(AVG(customer_stats.total_spent), 0) as avg_spent_per_customer
     FROM customers c
     LEFT JOIN (
       SELECT customer_id, COUNT(*) as visit_count, SUM(total_amount) as total_spent
       FROM jobs WHERE created_at >= $1 AND created_at <= $2 GROUP BY customer_id
     ) customer_stats ON c.id = customer_stats.customer_id
     LEFT JOIN jobs j ON c.id = j.customer_id AND j.created_at >= $1 AND j.created_at <= $2
     WHERE 1=1 ${branchWhere}`,
    params
  );

  const topCustomersResult = await db.query(
    `SELECT c.name, c.phone, COUNT(j.id) as visit_count, COALESCE(SUM(j.total_amount), 0) as total_spent, c.loyalty_points
     FROM customers c
     JOIN jobs j ON c.id = j.customer_id
     WHERE j.created_at >= $1 AND j.created_at <= $2 ${branchWhere}
     GROUP BY c.id, c.name, c.phone, c.loyalty_points
     ORDER BY total_spent DESC LIMIT 20`,
    params
  );

  res.json({
    success: true,
    data: {
      summary: summaryResult.rows[0],
      top_customers: topCustomersResult.rows,
    },
  });
});

/**
 * Get financial summary
 */
export const getFinancialReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id } = req.query;
  const userBranch = req.user?.branch_id;
  const isSuperAdmin = req.user?.role === 'super_admin';
  const branchId = branch_id || userBranch;

  const startDate = date_from ? new Date(date_from as string).toISOString() : new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString();
  const endDate = date_to ? new Date(date_to as string).toISOString() : new Date().toISOString();

  const params = [startDate, endDate];
  const branchWhere = (isSuperAdmin || !branchId) ? '' : 'AND branch_id = $3';
  if (!isSuperAdmin && branchId) params.push(String(branchId));

  const revenueResult = await db.query(`SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM jobs WHERE created_at >= $1 AND created_at <= $2 ${branchWhere}`, params);
  const expensesResult = await db.query(`SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses WHERE expense_date >= $1 AND expense_date <= $2 ${branchWhere}`, params);

  const commissionParams = (isSuperAdmin || !branchId) ? params : [startDate, endDate, branchId];
  const commissionWhere = (isSuperAdmin || !branchId) ? '' : 'AND u.branch_id = $3';
  const commissionsResult = await db.query(
    `SELECT COALESCE(SUM(c.amount), 0) as total_commissions
     FROM commissions c
     JOIN users u ON c.staff_id = u.id
     WHERE c.created_at >= $1 AND c.created_at <= $2 ${commissionWhere}`,
    commissionParams
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
