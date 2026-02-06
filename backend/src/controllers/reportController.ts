import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { getStartOfDay, getEndOfDay } from '../utils/helpers';

/**
 * Get sales report
 * GET /api/v1/reports/sales
 */
export const getSalesReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id, group_by = 'day' } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const startDate = date_from ? new Date(date_from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = date_to ? new Date(date_to as string) : new Date();

  const branchCondition = branchId ? 'AND j.branch_id = $3' : '';
  const params = branchId ? [startDate, endDate, branchId] : [startDate, endDate];

  // Get summary
  const summaryResult = await db.query(
    `SELECT
       COUNT(DISTINCT j.id) as total_jobs,
       SUM(j.final_amount) as total_revenue,
       SUM(j.discount_amount) as total_discounts,
       AVG(j.final_amount) as average_ticket,
       COUNT(DISTINCT j.customer_id) as unique_customers
     FROM jobs j
     WHERE j.status = 'paid'
     AND j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}`,
    params
  );

  // Get payment breakdown
  const paymentResult = await db.query(
    `SELECT
       p.payment_method,
       COUNT(*) as count,
       SUM(p.amount) as total
     FROM payments p
     JOIN jobs j ON p.job_id = j.id
     WHERE p.status = 'completed'
     AND p.created_at >= $1 AND p.created_at <= $2
     ${branchCondition}
     GROUP BY p.payment_method
     ORDER BY total DESC`,
    params
  );

  // Get service breakdown
  const serviceResult = await db.query(
    `SELECT
       s.name,
       s.category,
       COUNT(js.id) as count,
       SUM(js.total) as revenue
     FROM job_services js
     JOIN services s ON js.service_id = s.id
     JOIN jobs j ON js.job_id = j.id
     WHERE j.status = 'paid'
     AND j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY s.id
     ORDER BY revenue DESC
     LIMIT 20`,
    params
  );

  // Get daily/weekly/monthly trend
  let dateFormat: string;
  switch (group_by) {
    case 'week':
      dateFormat = 'IYYY-IW';
      break;
    case 'month':
      dateFormat = 'YYYY-MM';
      break;
    default:
      dateFormat = 'YYYY-MM-DD';
  }

  const trendResult = await db.query(
    `SELECT
       TO_CHAR(j.created_at, '${dateFormat}') as period,
       COUNT(*) as jobs,
       SUM(j.final_amount) as revenue
     FROM jobs j
     WHERE j.status = 'paid'
     AND j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY period
     ORDER BY period ASC`,
    params
  );

  // Get vehicle type breakdown
  const vehicleResult = await db.query(
    `SELECT
       v.vehicle_type,
       COUNT(j.id) as count,
       SUM(j.final_amount) as revenue
     FROM jobs j
     JOIN vehicles v ON j.vehicle_id = v.id
     WHERE j.status = 'paid'
     AND j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY v.vehicle_type
     ORDER BY revenue DESC`,
    params
  );

  res.json({
    success: true,
    data: {
      period: {
        from: startDate,
        to: endDate,
      },
      summary: summaryResult.rows[0],
      payment_breakdown: paymentResult.rows,
      service_breakdown: serviceResult.rows,
      daily_trend: trendResult.rows,
      vehicle_breakdown: vehicleResult.rows,
    },
  });
});

/**
 * Get operational report
 * GET /api/v1/reports/operational
 */
export const getOperationalReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const startDate = date_from ? new Date(date_from as string) : getStartOfDay();
  const endDate = date_to ? new Date(date_to as string) : getEndOfDay();

  const branchCondition = branchId ? 'AND j.branch_id = $3' : '';
  const params = branchId ? [startDate, endDate, branchId] : [startDate, endDate];

  // Job statistics
  const jobStatsResult = await db.query(
    `SELECT
       COUNT(*) as total_jobs,
       COUNT(*) FILTER (WHERE status = 'paid') as completed_jobs,
       COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_jobs,
       COUNT(*) FILTER (WHERE is_rewash = true) as rewash_jobs,
       AVG(EXTRACT(EPOCH FROM (actual_completion - created_at)) / 60) FILTER (WHERE actual_completion IS NOT NULL) as avg_service_time
     FROM jobs j
     WHERE j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}`,
    params
  );

  // Bay utilization
  const bayUtilResult = await db.query(
    `SELECT
       b.id, b.name, b.bay_number,
       COUNT(j.id) as jobs_count,
       COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(j.actual_completion, CURRENT_TIMESTAMP) - j.created_at)) / 3600), 0) as hours_used,
       COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(j.actual_completion, CURRENT_TIMESTAMP) - j.created_at)) / 60), 0) as avg_minutes
     FROM bays b
     LEFT JOIN jobs j ON b.id = j.bay_id
       AND j.created_at >= $1 AND j.created_at <= $2
       AND j.status != 'cancelled'
       ${branchCondition}
     WHERE b.is_active = true
     ${branchId ? 'AND b.branch_id = $3' : ''}
     GROUP BY b.id
     ORDER BY b.bay_number`,
    params
  );

  // Staff performance
  const staffResult = await db.query(
    `SELECT
       u.id, u.name,
       COUNT(j.id) as jobs_completed,
       COALESCE(AVG(EXTRACT(EPOCH FROM (j.actual_completion - j.created_at)) / 60), 0) as avg_time,
       COALESCE(SUM(j.final_amount), 0) as revenue_generated
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

  // Hourly distribution
  const hourlyResult = await db.query(
    `SELECT
       EXTRACT(HOUR FROM j.created_at) as hour,
       COUNT(*) as jobs,
       SUM(j.final_amount) as revenue
     FROM jobs j
     WHERE j.status = 'paid'
     AND j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY hour
     ORDER BY hour`,
    params
  );

  // Peak times
  const peakResult = await db.query(
    `SELECT
       EXTRACT(DOW FROM j.created_at) as day_of_week,
       EXTRACT(HOUR FROM j.created_at) as hour,
       COUNT(*) as jobs
     FROM jobs j
     WHERE j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY day_of_week, hour
     ORDER BY jobs DESC
     LIMIT 10`,
    params
  );

  res.json({
    success: true,
    data: {
      period: {
        from: startDate,
        to: endDate,
      },
      job_statistics: jobStatsResult.rows[0],
      bay_utilization: bayUtilResult.rows,
      staff_performance: staffResult.rows,
      hourly_distribution: hourlyResult.rows,
      peak_times: peakResult.rows,
    },
  });
});

/**
 * Get customer report
 * GET /api/v1/reports/customers
 */
export const getCustomerReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id, limit = 20 } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const startDate = date_from ? new Date(date_from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = date_to ? new Date(date_to as string) : new Date();

  const branchCondition = branchId ? 'AND j.branch_id = $3' : '';
  const params = branchId ? [startDate, endDate, branchId] : [startDate, endDate];

  // Customer summary
  const summaryResult = await db.query(
    `SELECT
       COUNT(DISTINCT j.customer_id) FILTER (WHERE j.customer_id IS NOT NULL) as total_customers,
       COUNT(DISTINCT CASE WHEN c.created_at >= $1 THEN c.id END) as new_customers,
       COUNT(DISTINCT CASE WHEN (SELECT COUNT(*) FROM jobs j2 WHERE j2.customer_id = c.id) > 1 THEN c.id END) as repeat_customers
     FROM jobs j
     LEFT JOIN customers c ON j.customer_id = c.id
     WHERE j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}`,
    params
  );

  // Top customers by revenue
  const topRevenueResult = await db.query(
    `SELECT
       c.id, c.name, c.phone, c.customer_type, c.is_vip,
       COUNT(j.id) as visits,
       SUM(j.final_amount) as total_spent
     FROM customers c
     JOIN jobs j ON c.id = j.customer_id
     WHERE j.status = 'paid'
     AND j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY c.id
     ORDER BY total_spent DESC
     LIMIT $${params.length + 1}`,
    [...params, limit]
  );

  // Top customers by visits
  const topVisitsResult = await db.query(
    `SELECT
       c.id, c.name, c.phone, c.customer_type, c.is_vip,
       COUNT(j.id) as visits,
       SUM(j.final_amount) as total_spent
     FROM customers c
     JOIN jobs j ON c.id = j.customer_id
     WHERE j.status = 'paid'
     AND j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY c.id
     ORDER BY visits DESC
     LIMIT $${params.length + 1}`,
    [...params, limit]
  );

  // Customer type breakdown
  const typeResult = await db.query(
    `SELECT
       c.customer_type,
       COUNT(DISTINCT c.id) as customers,
       COUNT(j.id) as jobs,
       SUM(j.final_amount) as revenue
     FROM customers c
     JOIN jobs j ON c.id = j.customer_id
     WHERE j.status = 'paid'
     AND j.created_at >= $1 AND j.created_at <= $2
     ${branchCondition}
     GROUP BY c.customer_type`,
    params
  );

  // Subscription stats
  const subscriptionResult = await db.query(
    `SELECT
       sp.name as plan_name,
       COUNT(cs.id) as subscriptions,
       SUM(sp.price) as revenue
     FROM customer_subscriptions cs
     JOIN subscription_plans sp ON cs.plan_id = sp.id
     WHERE cs.created_at >= $1 AND cs.created_at <= $2
     ${branchId ? 'AND sp.branch_id = $3' : ''}
     GROUP BY sp.id
     ORDER BY subscriptions DESC`,
    params
  );

  res.json({
    success: true,
    data: {
      period: {
        from: startDate,
        to: endDate,
      },
      summary: summaryResult.rows[0],
      top_by_revenue: topRevenueResult.rows,
      top_by_visits: topVisitsResult.rows,
      by_customer_type: typeResult.rows,
      subscriptions: subscriptionResult.rows,
    },
  });
});

/**
 * Get financial report (P&L)
 * GET /api/v1/reports/financial
 */
export const getFinancialReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const startDate = date_from ? new Date(date_from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = date_to ? new Date(date_to as string) : new Date();

  const branchCondition = branchId ? 'AND branch_id = $3' : '';
  const jobBranchCondition = branchId ? 'AND j.branch_id = $3' : '';
  const params = branchId ? [startDate, endDate, branchId] : [startDate, endDate];

  // Revenue
  const revenueResult = await db.query(
    `SELECT
       SUM(p.amount) as total_revenue,
       SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END) as cash_revenue,
       SUM(CASE WHEN p.payment_method = 'mpesa' THEN p.amount ELSE 0 END) as mpesa_revenue,
       SUM(CASE WHEN p.payment_method = 'card' THEN p.amount ELSE 0 END) as card_revenue
     FROM payments p
     JOIN jobs j ON p.job_id = j.id
     WHERE p.status = 'completed'
     AND p.created_at >= $1 AND p.created_at <= $2
     ${jobBranchCondition}`,
    params
  );

  // Discounts given
  const discountResult = await db.query(
    `SELECT SUM(discount_amount) as total_discounts
     FROM jobs j
     WHERE status = 'paid'
     AND created_at >= $1 AND created_at <= $2
     ${jobBranchCondition}`,
    params
  );

  // Expenses by category
  const expensesResult = await db.query(
    `SELECT
       category,
       SUM(amount) as total
     FROM expenses
     WHERE expense_date >= $1 AND expense_date <= $2
     ${branchCondition}
     GROUP BY category
     ORDER BY total DESC`,
    params
  );

  // Total expenses
  const totalExpensesResult = await db.query(
    `SELECT SUM(amount) as total_expenses
     FROM expenses
     WHERE expense_date >= $1 AND expense_date <= $2
     ${branchCondition}`,
    params
  );

  // Inventory value change
  const inventoryResult = await db.query(
    `SELECT
       SUM(CASE WHEN transaction_type = 'stock_in' THEN total_cost ELSE 0 END) as stock_in_value,
       SUM(CASE WHEN transaction_type = 'stock_out' THEN total_cost ELSE 0 END) as stock_out_value
     FROM inventory_transactions it
     JOIN inventory_items ii ON it.item_id = ii.id
     WHERE it.created_at >= $1 AND it.created_at <= $2
     ${branchId ? 'AND ii.branch_id = $3' : ''}`,
    params
  );

  // Daily breakdown
  const dailyResult = await db.query(
    `SELECT
       DATE(p.created_at) as date,
       SUM(p.amount) as revenue
     FROM payments p
     JOIN jobs j ON p.job_id = j.id
     WHERE p.status = 'completed'
     AND p.created_at >= $1 AND p.created_at <= $2
     ${jobBranchCondition}
     GROUP BY date
     ORDER BY date`,
    params
  );

  const totalRevenue = parseFloat(revenueResult.rows[0]?.total_revenue || 0);
  const totalExpenses = parseFloat(totalExpensesResult.rows[0]?.total_expenses || 0);
  const grossProfit = totalRevenue - totalExpenses;

  res.json({
    success: true,
    data: {
      period: {
        from: startDate,
        to: endDate,
      },
      revenue: {
        total: totalRevenue,
        by_payment_method: revenueResult.rows[0],
        discounts: parseFloat(discountResult.rows[0]?.total_discounts || 0),
      },
      expenses: {
        total: totalExpenses,
        by_category: expensesResult.rows,
      },
      inventory: inventoryResult.rows[0],
      profit_loss: {
        gross_revenue: totalRevenue,
        total_expenses: totalExpenses,
        gross_profit: grossProfit,
        profit_margin: totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : 0,
      },
      daily_revenue: dailyResult.rows,
    },
  });
});

/**
 * Get inventory report
 * GET /api/v1/reports/inventory
 */
export const getInventoryReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date_from, date_to, branch_id } = req.query;
  const branchId = branch_id || req.user?.branch_id;

  const startDate = date_from ? new Date(date_from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = date_to ? new Date(date_to as string) : new Date();

  const branchCondition = branchId ? 'AND ii.branch_id = $3' : '';
  const params = branchId ? [startDate, endDate, branchId] : [startDate, endDate];

  // Stock summary
  const summaryResult = await db.query(
    `SELECT
       COUNT(*) as total_items,
       SUM(quantity * unit_cost) as total_value,
       COUNT(*) FILTER (WHERE quantity <= reorder_level) as low_stock_items
     FROM inventory_items ii
     WHERE is_active = true
     ${branchId ? 'AND branch_id = $1' : ''}`,
    branchId ? [branchId] : []
  );

  // Movement summary
  const movementResult = await db.query(
    `SELECT
       transaction_type,
       COUNT(*) as count,
       SUM(quantity) as total_quantity,
       SUM(total_cost) as total_value
     FROM inventory_transactions it
     JOIN inventory_items ii ON it.item_id = ii.id
     WHERE it.created_at >= $1 AND it.created_at <= $2
     ${branchCondition}
     GROUP BY transaction_type`,
    params
  );

  // Top consumed items
  const topConsumedResult = await db.query(
    `SELECT
       ii.id, ii.name, ii.category, ii.unit,
       SUM(it.quantity) as consumed,
       SUM(it.total_cost) as value
     FROM inventory_transactions it
     JOIN inventory_items ii ON it.item_id = ii.id
     WHERE it.transaction_type = 'stock_out'
     AND it.created_at >= $1 AND it.created_at <= $2
     ${branchCondition}
     GROUP BY ii.id
     ORDER BY consumed DESC
     LIMIT 10`,
    params
  );

  // Low stock items
  const lowStockResult = await db.query(
    `SELECT
       id, name, category, unit, quantity, reorder_level, unit_cost
     FROM inventory_items ii
     WHERE quantity <= reorder_level
     AND is_active = true
     ${branchId ? 'AND branch_id = $1' : ''}
     ORDER BY (quantity / NULLIF(reorder_level, 0)) ASC`,
    branchId ? [branchId] : []
  );

  // Category breakdown
  const categoryResult = await db.query(
    `SELECT
       category,
       COUNT(*) as items,
       SUM(quantity) as total_quantity,
       SUM(quantity * unit_cost) as total_value
     FROM inventory_items ii
     WHERE is_active = true
     ${branchId ? 'AND branch_id = $1' : ''}
     GROUP BY category
     ORDER BY total_value DESC`,
    branchId ? [branchId] : []
  );

  res.json({
    success: true,
    data: {
      period: {
        from: startDate,
        to: endDate,
      },
      summary: summaryResult.rows[0],
      movement_summary: movementResult.rows,
      top_consumed: topConsumedResult.rows,
      low_stock: lowStockResult.rows,
      by_category: categoryResult.rows,
    },
  });
});

/**
 * Export report data
 * GET /api/v1/reports/export/:type
 */
export const exportReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { type } = req.params;
  const { format = 'json', ...filters } = req.query;

  // This would normally generate CSV/PDF files
  // For now, return the data in requested format

  let data: unknown;

  switch (type) {
    case 'sales':
      // Get sales data
      const salesResult = await db.query(
        `SELECT j.job_no, j.created_at, j.final_amount, j.status,
                v.registration_no, v.vehicle_type,
                c.name as customer_name
         FROM jobs j
         JOIN vehicles v ON j.vehicle_id = v.id
         LEFT JOIN customers c ON j.customer_id = c.id
         WHERE j.status = 'paid'
         ORDER BY j.created_at DESC
         LIMIT 1000`
      );
      data = salesResult.rows;
      break;

    case 'payments':
      const paymentsResult = await db.query(
        `SELECT p.*, j.job_no, v.registration_no
         FROM payments p
         JOIN jobs j ON p.job_id = j.id
         JOIN vehicles v ON j.vehicle_id = v.id
         WHERE p.status = 'completed'
         ORDER BY p.created_at DESC
         LIMIT 1000`
      );
      data = paymentsResult.rows;
      break;

    case 'expenses':
      const expensesResult = await db.query(
        `SELECT * FROM expenses ORDER BY expense_date DESC LIMIT 1000`
      );
      data = expensesResult.rows;
      break;

    default:
      res.status(400).json({
        success: false,
        error: 'Invalid report type',
      });
      return;
  }

  if (format === 'csv') {
    // Convert to CSV format
    const rows = data as Record<string, unknown>[];
    if (rows.length === 0) {
      res.status(200).send('');
      return;
    }

    const headers = Object.keys(rows[0]).join(',');
    const csvRows = rows.map(row =>
      Object.values(row).map(val =>
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_report.csv`);
    res.send([headers, ...csvRows].join('\n'));
    return;
  }

  res.json({
    success: true,
    data,
  });
});

export default {
  getSalesReport,
  getOperationalReport,
  getCustomerReport,
  getFinancialReport,
  getInventoryReport,
  exportReport,
};
