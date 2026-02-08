'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  SimpleSelect,
  Button,
  Spinner,
  Badge,
} from '@/components/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Download,
} from 'lucide-react';

export default function ReportsPage() {
  const [period, setPeriod] = useState('today');
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  // Dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['reports', 'dashboard', period],
    queryFn: () => reportsApi.getDashboard({ period }),
  });

  // Sales report
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['reports', 'sales', dateRange],
    queryFn: () => reportsApi.getSales({
      date_from: dateRange.from,
      date_to: dateRange.to
    }),
  });

  // Expenses report
  const { data: expensesData } = useQuery({
    queryKey: ['reports', 'expenses', dateRange],
    queryFn: () => reportsApi.getExpenses({
      date_from: dateRange.from,
      date_to: dateRange.to
    }),
  });

  // Inventory report
  const { data: inventoryData } = useQuery({
    queryKey: ['reports', 'inventory', dateRange],
    queryFn: () => reportsApi.getInventory({
      date_from: dateRange.from,
      date_to: dateRange.to
    }),
  });

  // Staff report
  const { data: staffData } = useQuery({
    queryKey: ['reports', 'staff', dateRange],
    queryFn: () => reportsApi.getStaff({
      date_from: dateRange.from,
      date_to: dateRange.to
    }),
  });

  // Customers report
  const { data: customersData } = useQuery({
    queryKey: ['reports', 'customers', dateRange],
    queryFn: () => reportsApi.getCustomers({
      date_from: dateRange.from,
      date_to: dateRange.to
    }),
  });

  // Financial report
  const { data: financialData } = useQuery({
    queryKey: ['reports', 'financial', dateRange],
    queryFn: () => reportsApi.getFinancial({
      date_from: dateRange.from,
      date_to: dateRange.to
    }),
  });

  const dashboard = dashboardData?.data;
  const sales = salesData?.data;
  const expenses = expensesData?.data;
  const inventory = inventoryData?.data;
  const staff = staffData?.data;
  const customers = customersData?.data;
  const financial = financialData?.data;

  const periodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'year', label: 'Last Year' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive business intelligence and insights"
      >
        <div className="flex items-center gap-2">
          <SimpleSelect
            value={period}
            onValueChange={setPeriod}
            options={periodOptions}
          />
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </PageHeader>

      {dashboardLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(dashboard?.summary?.total_revenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboard?.summary?.total_jobs || 0} jobs completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Job Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(dashboard?.summary?.average_job_value || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboard?.summary?.active_jobs || 0} active jobs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboard?.summary?.completed_jobs || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {period === 'today' ? 'Today' : `Last ${period}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboard?.payment_breakdown?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active payment types
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <Spinner />
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Jobs</p>
                      <p className="text-2xl font-bold">{sales?.summary?.total_jobs || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(sales?.summary?.total_revenue || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Average Ticket</p>
                      <p className="text-2xl font-bold">{formatCurrency(sales?.summary?.average_ticket || 0)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales?.payments?.length > 0 ? (
                      sales.payments.map((payment: any) => (
                        <TableRow key={payment.payment_method}>
                          <TableCell className="font-medium capitalize">
                            {payment.payment_method}
                          </TableCell>
                          <TableCell>{payment.count}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(payment.total)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No payment data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Services</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales?.services?.length > 0 ? (
                      sales.services.slice(0, 10).map((service: any) => (
                        <TableRow key={service.name}>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {service.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{service.count}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(service.revenue)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No service data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Expenses Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold">{formatCurrency(expenses?.summary?.total_amount || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transaction Count</p>
                  <p className="text-2xl font-bold">{expenses?.summary?.total_expenses || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Expense</p>
                  <p className="text-2xl font-bold">{formatCurrency(expenses?.summary?.average_expense || 0)}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses?.by_category?.length > 0 ? (
                    expenses.by_category.map((category: any) => (
                      <TableRow key={category.category}>
                        <TableCell className="font-medium capitalize">{category.category}</TableCell>
                        <TableCell>{category.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(category.total)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No expenses recorded for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory?.low_stock_alerts?.length > 0 ? (
                      inventory.low_stock_alerts.map((item: any) => (
                        <TableRow key={item.name}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{item.quantity}</Badge>
                          </TableCell>
                          <TableCell>{item.reorder_level}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          All items are adequately stocked
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Consumed Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Consumed</TableHead>
                      <TableHead>Restocked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory?.consumption?.length > 0 ? (
                      inventory.consumption.map((item: any) => (
                        <TableRow key={item.name}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="capitalize">{item.category}</TableCell>
                          <TableCell>{item.consumed} {item.unit}</TableCell>
                          <TableCell>{item.restocked} {item.unit}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No consumption data for this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Jobs Completed</TableHead>
                    <TableHead>Revenue Generated</TableHead>
                    <TableHead>Commission Earned</TableHead>
                    <TableHead>Commission Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff?.length > 0 ? (
                    staff.map((member: any) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell className="capitalize">{member.role}</TableCell>
                        <TableCell>{member.jobs_completed}</TableCell>
                        <TableCell>{formatCurrency(member.total_revenue)}</TableCell>
                        <TableCell>{formatCurrency(member.total_commission)}</TableCell>
                        <TableCell>{member.commission_rate}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No staff performance data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Customers</p>
                    <p className="text-2xl font-bold">{customers?.summary?.total_customers || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Customers</p>
                    <p className="text-2xl font-bold">{customers?.summary?.active_customers || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Visits</p>
                    <p className="text-2xl font-bold">{parseFloat(customers?.summary?.avg_visits_per_customer || 0).toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Spent</p>
                    <p className="text-2xl font-bold">{formatCurrency(customers?.summary?.avg_spent_per_customer || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Visits</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Loyalty Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers?.top_customers?.length > 0 ? (
                      customers.top_customers.map((customer: any) => (
                        <TableRow key={customer.phone}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{customer.phone}</TableCell>
                          <TableCell>{customer.visit_count}</TableCell>
                          <TableCell>{formatCurrency(customer.total_spent)}</TableCell>
                          <TableCell>{customer.loyalty_points} pts</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No customer data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(financial?.revenue || 0)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-3xl font-bold text-red-600">
                    {formatCurrency(financial?.expenses || 0)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Staff Commissions</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {formatCurrency(financial?.commissions || 0)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className={`text-3xl font-bold ${(financial?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(financial?.net_profit || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {financial?.profit_margin || 0}% margin
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
