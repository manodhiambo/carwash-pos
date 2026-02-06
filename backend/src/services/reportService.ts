import db from '../config/database';
import { getStartOfDay, getEndOfDay } from '../utils/helpers';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface SalesSummary {
  totalJobs: number;
  totalRevenue: number;
  totalDiscounts: number;
  averageTicket: number;
  uniqueCustomers: number;
}

interface DailyStats {
  date: string;
  jobs: number;
  revenue: number;
  cashRevenue: number;
  mpesaRevenue: number;
  cardRevenue: number;
}

interface ServicePerformance {
  serviceId: number;
  serviceName: string;
  category: string;
  usageCount: number;
  revenue: number;
  averagePrice: number;
}

interface StaffPerformance {
  staffId: number;
  staffName: string;
  jobsCompleted: number;
  averageServiceTime: number;
  revenueGenerated: number;
  customerRating?: number;
}

class ReportService {
  /**
   * Get sales summary for a date range
   */
  async getSalesSummary(dateRange: DateRange, branchId?: number): Promise<SalesSummary> {
    const branchCondition = branchId ? 'AND j.branch_id = $3' : '';
    const params = branchId
      ? [dateRange.startDate, dateRange.endDate, branchId]
      : [dateRange.startDate, dateRange.endDate];

    const result = await db.query(
      `SELECT
         COUNT(DISTINCT j.id)::int as total_jobs,
         COALESCE(SUM(j.final_amount), 0)::numeric as total_revenue,
         COALESCE(SUM(j.discount_amount), 0)::numeric as total_discounts,
         COALESCE(AVG(j.final_amount), 0)::numeric as average_ticket,
         COUNT(DISTINCT j.customer_id)::int as unique_customers
       FROM jobs j
       WHERE j.status = 'paid'
       AND j.created_at >= $1 AND j.created_at <= $2
       ${branchCondition}`,
      params
    );

    const row = result.rows[0];
    return {
      totalJobs: row.total_jobs,
      totalRevenue: parseFloat(row.total_revenue),
      totalDiscounts: parseFloat(row.total_discounts),
      averageTicket: parseFloat(row.average_ticket),
      uniqueCustomers: row.unique_customers,
    };
  }

  /**
   * Get daily statistics for a date range
   */
  async getDailyStats(dateRange: DateRange, branchId?: number): Promise<DailyStats[]> {
    const branchCondition = branchId ? 'AND j.branch_id = $3' : '';
    const params = branchId
      ? [dateRange.startDate, dateRange.endDate, branchId]
      : [dateRange.startDate, dateRange.endDate];

    const result = await db.query(
      `SELECT
         DATE(j.created_at) as date,
         COUNT(j.id)::int as jobs,
         COALESCE(SUM(j.final_amount), 0)::numeric as revenue,
         COALESCE(SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END), 0)::numeric as cash_revenue,
         COALESCE(SUM(CASE WHEN p.payment_method = 'mpesa' THEN p.amount ELSE 0 END), 0)::numeric as mpesa_revenue,
         COALESCE(SUM(CASE WHEN p.payment_method = 'card' THEN p.amount ELSE 0 END), 0)::numeric as card_revenue
       FROM jobs j
       LEFT JOIN payments p ON j.id = p.job_id AND p.status = 'completed'
       WHERE j.status = 'paid'
       AND j.created_at >= $1 AND j.created_at <= $2
       ${branchCondition}
       GROUP BY DATE(j.created_at)
       ORDER BY date`,
      params
    );

    return result.rows.map(row => ({
      date: row.date,
      jobs: row.jobs,
      revenue: parseFloat(row.revenue),
      cashRevenue: parseFloat(row.cash_revenue),
      mpesaRevenue: parseFloat(row.mpesa_revenue),
      cardRevenue: parseFloat(row.card_revenue),
    }));
  }

  /**
   * Get service performance metrics
   */
  async getServicePerformance(dateRange: DateRange, branchId?: number): Promise<ServicePerformance[]> {
    const branchCondition = branchId ? 'AND j.branch_id = $3' : '';
    const params = branchId
      ? [dateRange.startDate, dateRange.endDate, branchId]
      : [dateRange.startDate, dateRange.endDate];

    const result = await db.query(
      `SELECT
         s.id as service_id,
         s.name as service_name,
         s.category,
         COUNT(js.id)::int as usage_count,
         COALESCE(SUM(js.total), 0)::numeric as revenue,
         COALESCE(AVG(js.price), 0)::numeric as average_price
       FROM services s
       LEFT JOIN job_services js ON s.id = js.service_id
       LEFT JOIN jobs j ON js.job_id = j.id
         AND j.status = 'paid'
         AND j.created_at >= $1 AND j.created_at <= $2
         ${branchCondition}
       WHERE s.is_active = true
       GROUP BY s.id
       ORDER BY revenue DESC`,
      params
    );

    return result.rows.map(row => ({
      serviceId: row.service_id,
      serviceName: row.service_name,
      category: row.category,
      usageCount: row.usage_count,
      revenue: parseFloat(row.revenue),
      averagePrice: parseFloat(row.average_price),
    }));
  }

  /**
   * Get staff performance metrics
   */
  async getStaffPerformance(dateRange: DateRange, branchId?: number): Promise<StaffPerformance[]> {
    const branchCondition = branchId ? 'AND j.branch_id = $3' : '';
    const params = branchId
      ? [dateRange.startDate, dateRange.endDate, branchId]
      : [dateRange.startDate, dateRange.endDate];

    const result = await db.query(
      `SELECT
         u.id as staff_id,
         u.name as staff_name,
         COUNT(j.id)::int as jobs_completed,
         COALESCE(AVG(EXTRACT(EPOCH FROM (j.actual_completion - j.created_at)) / 60), 0)::numeric as average_service_time,
         COALESCE(SUM(j.final_amount), 0)::numeric as revenue_generated
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

    return result.rows.map(row => ({
      staffId: row.staff_id,
      staffName: row.staff_name,
      jobsCompleted: row.jobs_completed,
      averageServiceTime: parseFloat(row.average_service_time),
      revenueGenerated: parseFloat(row.revenue_generated),
    }));
  }

  /**
   * Get peak hours analysis
   */
  async getPeakHours(dateRange: DateRange, branchId?: number): Promise<Array<{ hour: number; jobs: number; revenue: number }>> {
    const branchCondition = branchId ? 'AND j.branch_id = $3' : '';
    const params = branchId
      ? [dateRange.startDate, dateRange.endDate, branchId]
      : [dateRange.startDate, dateRange.endDate];

    const result = await db.query(
      `SELECT
         EXTRACT(HOUR FROM j.created_at)::int as hour,
         COUNT(j.id)::int as jobs,
         COALESCE(SUM(j.final_amount), 0)::numeric as revenue
       FROM jobs j
       WHERE j.status = 'paid'
       AND j.created_at >= $1 AND j.created_at <= $2
       ${branchCondition}
       GROUP BY hour
       ORDER BY hour`,
      params
    );

    return result.rows.map(row => ({
      hour: row.hour,
      jobs: row.jobs,
      revenue: parseFloat(row.revenue),
    }));
  }

  /**
   * Get vehicle type distribution
   */
  async getVehicleTypeDistribution(dateRange: DateRange, branchId?: number): Promise<Array<{ vehicleType: string; count: number; revenue: number; percentage: number }>> {
    const branchCondition = branchId ? 'AND j.branch_id = $3' : '';
    const params = branchId
      ? [dateRange.startDate, dateRange.endDate, branchId]
      : [dateRange.startDate, dateRange.endDate];

    const result = await db.query(
      `SELECT
         v.vehicle_type,
         COUNT(j.id)::int as count,
         COALESCE(SUM(j.final_amount), 0)::numeric as revenue
       FROM jobs j
       JOIN vehicles v ON j.vehicle_id = v.id
       WHERE j.status = 'paid'
       AND j.created_at >= $1 AND j.created_at <= $2
       ${branchCondition}
       GROUP BY v.vehicle_type
       ORDER BY count DESC`,
      params
    );

    const total = result.rows.reduce((sum, row) => sum + row.count, 0);

    return result.rows.map(row => ({
      vehicleType: row.vehicle_type,
      count: row.count,
      revenue: parseFloat(row.revenue),
      percentage: total > 0 ? (row.count / total) * 100 : 0,
    }));
  }

  /**
   * Get customer retention metrics
   */
  async getCustomerRetention(dateRange: DateRange, branchId?: number): Promise<{
    newCustomers: number;
    returningCustomers: number;
    retentionRate: number;
  }> {
    const branchCondition = branchId ? 'AND j.branch_id = $3' : '';
    const params = branchId
      ? [dateRange.startDate, dateRange.endDate, branchId]
      : [dateRange.startDate, dateRange.endDate];

    // New customers (first job in this period)
    const newResult = await db.query(
      `SELECT COUNT(DISTINCT j.customer_id)::int as count
       FROM jobs j
       WHERE j.customer_id IS NOT NULL
       AND j.status = 'paid'
       AND j.created_at >= $1 AND j.created_at <= $2
       ${branchCondition}
       AND NOT EXISTS (
         SELECT 1 FROM jobs j2
         WHERE j2.customer_id = j.customer_id
         AND j2.created_at < $1
       )`,
      params
    );

    // Returning customers (had previous jobs before this period)
    const returningResult = await db.query(
      `SELECT COUNT(DISTINCT j.customer_id)::int as count
       FROM jobs j
       WHERE j.customer_id IS NOT NULL
       AND j.status = 'paid'
       AND j.created_at >= $1 AND j.created_at <= $2
       ${branchCondition}
       AND EXISTS (
         SELECT 1 FROM jobs j2
         WHERE j2.customer_id = j.customer_id
         AND j2.created_at < $1
       )`,
      params
    );

    const newCustomers = newResult.rows[0].count;
    const returningCustomers = returningResult.rows[0].count;
    const total = newCustomers + returningCustomers;

    return {
      newCustomers,
      returningCustomers,
      retentionRate: total > 0 ? (returningCustomers / total) * 100 : 0,
    };
  }

  /**
   * Get expense summary by category
   */
  async getExpenseSummary(dateRange: DateRange, branchId?: number): Promise<Array<{ category: string; count: number; total: number }>> {
    const branchCondition = branchId ? 'AND branch_id = $3' : '';
    const params = branchId
      ? [dateRange.startDate, dateRange.endDate, branchId]
      : [dateRange.startDate, dateRange.endDate];

    const result = await db.query(
      `SELECT
         category,
         COUNT(*)::int as count,
         COALESCE(SUM(amount), 0)::numeric as total
       FROM expenses
       WHERE expense_date >= $1 AND expense_date <= $2
       ${branchCondition}
       GROUP BY category
       ORDER BY total DESC`,
      params
    );

    return result.rows.map(row => ({
      category: row.category,
      count: row.count,
      total: parseFloat(row.total),
    }));
  }

  /**
   * Calculate profit/loss for a period
   */
  async getProfitLoss(dateRange: DateRange, branchId?: number): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    grossProfit: number;
    profitMargin: number;
  }> {
    const branchCondition = branchId ? 'AND j.branch_id = $3' : '';
    const expenseBranchCondition = branchId ? 'AND branch_id = $3' : '';
    const params = branchId
      ? [dateRange.startDate, dateRange.endDate, branchId]
      : [dateRange.startDate, dateRange.endDate];

    // Get revenue
    const revenueResult = await db.query(
      `SELECT COALESCE(SUM(p.amount), 0)::numeric as total
       FROM payments p
       JOIN jobs j ON p.job_id = j.id
       WHERE p.status = 'completed'
       AND p.created_at >= $1 AND p.created_at <= $2
       ${branchCondition}`,
      params
    );

    // Get expenses
    const expensesResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric as total
       FROM expenses
       WHERE expense_date >= $1 AND expense_date <= $2
       ${expenseBranchCondition}`,
      params
    );

    const totalRevenue = parseFloat(revenueResult.rows[0].total);
    const totalExpenses = parseFloat(expensesResult.rows[0].total);
    const grossProfit = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      totalExpenses,
      grossProfit,
      profitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
    };
  }

  /**
   * Get inventory usage report
   */
  async getInventoryUsage(dateRange: DateRange, branchId?: number): Promise<Array<{
    itemId: number;
    itemName: string;
    category: string;
    quantityUsed: number;
    totalCost: number;
  }>> {
    const branchCondition = branchId ? 'AND ii.branch_id = $3' : '';
    const params = branchId
      ? [dateRange.startDate, dateRange.endDate, branchId]
      : [dateRange.startDate, dateRange.endDate];

    const result = await db.query(
      `SELECT
         ii.id as item_id,
         ii.name as item_name,
         ii.category,
         COALESCE(SUM(it.quantity), 0)::numeric as quantity_used,
         COALESCE(SUM(it.total_cost), 0)::numeric as total_cost
       FROM inventory_items ii
       LEFT JOIN inventory_transactions it ON ii.id = it.item_id
         AND it.transaction_type = 'stock_out'
         AND it.created_at >= $1 AND it.created_at <= $2
       WHERE ii.is_active = true
       ${branchCondition}
       GROUP BY ii.id
       HAVING SUM(it.quantity) > 0
       ORDER BY quantity_used DESC`,
      params
    );

    return result.rows.map(row => ({
      itemId: row.item_id,
      itemName: row.item_name,
      category: row.category,
      quantityUsed: parseFloat(row.quantity_used),
      totalCost: parseFloat(row.total_cost),
    }));
  }

  /**
   * Generate comprehensive dashboard data
   */
  async getDashboardData(branchId?: number): Promise<{
    today: SalesSummary;
    thisWeek: SalesSummary;
    thisMonth: SalesSummary;
    hourlyStats: Array<{ hour: number; jobs: number }>;
    recentJobs: number;
    pendingPayments: number;
    lowStockCount: number;
  }> {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const monthStart = new Date(today);
    monthStart.setDate(1);

    const [todaySummary, weekSummary, monthSummary, hourlyStats] = await Promise.all([
      this.getSalesSummary({ startDate: getStartOfDay(today), endDate: getEndOfDay(today) }, branchId),
      this.getSalesSummary({ startDate: weekStart, endDate: today }, branchId),
      this.getSalesSummary({ startDate: monthStart, endDate: today }, branchId),
      this.getPeakHours({ startDate: getStartOfDay(today), endDate: getEndOfDay(today) }, branchId),
    ]);

    // Get additional counts
    const branchCondition = branchId ? 'AND branch_id = $1' : '';
    const jobBranchCondition = branchId ? 'AND j.branch_id = $1' : '';

    const recentJobsResult = await db.query(
      `SELECT COUNT(*)::int as count FROM jobs j
       WHERE status IN ('checked_in', 'in_queue', 'washing', 'detailing')
       ${jobBranchCondition}`,
      branchId ? [branchId] : []
    );

    const pendingPaymentsResult = await db.query(
      `SELECT COUNT(*)::int as count FROM jobs j
       WHERE status = 'completed'
       ${jobBranchCondition}`,
      branchId ? [branchId] : []
    );

    const lowStockResult = await db.query(
      `SELECT COUNT(*)::int as count FROM inventory_items
       WHERE quantity <= reorder_level AND is_active = true
       ${branchCondition}`,
      branchId ? [branchId] : []
    );

    return {
      today: todaySummary,
      thisWeek: weekSummary,
      thisMonth: monthSummary,
      hourlyStats: hourlyStats.map(h => ({ hour: h.hour, jobs: h.jobs })),
      recentJobs: recentJobsResult.rows[0].count,
      pendingPayments: pendingPaymentsResult.rows[0].count,
      lowStockCount: lowStockResult.rows[0].count,
    };
  }
}

export default new ReportService();
