'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { PageContainer, PageHeader, Section } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { Badge, PaymentMethodBadge } from '@/components/ui/badge';
import { Progress, CircularProgress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Car,
  Users,
  Clock,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  CreditCard,
  Smartphone,
  Banknote,
  Package,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

const dateRanges = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = React.useState('sales');
  const [dateRange, setDateRange] = React.useState('month');
  const [startDate, setStartDate] = React.useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));

  // Update dates based on range selection
  React.useEffect(() => {
    const today = new Date();
    switch (dateRange) {
      case 'today':
        setStartDate(format(today, 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setStartDate(format(yesterday, 'yyyy-MM-dd'));
        setEndDate(format(yesterday, 'yyyy-MM-dd'));
        break;
      case 'week':
        setStartDate(format(startOfWeek(today), 'yyyy-MM-dd'));
        setEndDate(format(endOfWeek(today), 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
    }
  }, [dateRange]);

  // Fetch sales report
  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', startDate, endDate],
    queryFn: () =>
      reportsApi.getSales({
        start_date: startDate,
        end_date: endDate,
        group_by: 'day',
      }),
    enabled: activeTab === 'sales',
  });

  // Fetch operational report
  const { data: operationalReport, isLoading: operationalLoading } = useQuery({
    queryKey: ['operational-report', startDate, endDate],
    queryFn: () =>
      reportsApi.getOperational({
        start_date: startDate,
        end_date: endDate,
      }),
    enabled: activeTab === 'operational',
  });

  // Fetch customer report
  const { data: customerReport, isLoading: customerLoading } = useQuery({
    queryKey: ['customer-report', startDate, endDate],
    queryFn: () =>
      reportsApi.getCustomerReport({
        start_date: startDate,
        end_date: endDate,
        limit: 10,
      }),
    enabled: activeTab === 'customers',
  });

  // Fetch financial report
  const { data: financialReport, isLoading: financialLoading } = useQuery({
    queryKey: ['financial-report', startDate, endDate],
    queryFn: () =>
      reportsApi.getFinancialSummary({
        start_date: startDate,
        end_date: endDate,
      }),
    enabled: activeTab === 'financial',
  });

  const sales = salesReport?.data;
  const operational = operationalReport?.data;
  const customers = customerReport?.data;
  const financial = financialReport?.data;

  const handleExport = async (type: string) => {
    try {
      const blob = await reportsApi.exportReport(type, {
        start_date: startDate,
        end_date: endDate,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report-${startDate}-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Reports & Analytics"
        description="View detailed reports and analytics for your car wash"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports' },
        ]}
        actions={
          <Button variant="outline" onClick={() => handleExport(activeTab)} className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        }
      />

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <SimpleSelect
                value={dateRange}
                onValueChange={setDateRange}
                options={dateRanges}
                className="w-[150px]"
              />
            </div>
            {dateRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
              </>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formatDate(startDate, 'PP')} - {formatDate(endDate, 'PP')}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        {/* Sales Report */}
        <TabsContent value="sales">
          {salesLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(sales?.total_revenue || 0)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-success-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Jobs</p>
                        <p className="text-2xl font-bold">{sales?.total_jobs || 0}</p>
                      </div>
                      <Car className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Average Job Value</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(sales?.average_job_value || 0)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-info-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Daily Average</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(
                            (sales?.total_revenue || 0) / Math.max(1, sales?.by_day?.length || 1)
                          )}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-warning-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Revenue by Payment Method */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sales?.by_payment_method?.map((method) => {
                        const percentage = sales.total_revenue
                          ? (method.amount / sales.total_revenue) * 100
                          : 0;
                        const Icon =
                          method.method === 'cash'
                            ? Banknote
                            : method.method === 'mpesa'
                            ? Smartphone
                            : CreditCard;

                        return (
                          <div key={method.method} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium capitalize">
                                  {method.method === 'mpesa' ? 'M-Pesa' : method.method}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">
                                  {formatCurrency(method.amount)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {method.count} transactions
                                </div>
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Services */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sales?.by_service?.slice(0, 5).map((service, index) => (
                        <div
                          key={service.service_id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{service.service_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {service.count} times
                              </div>
                            </div>
                          </div>
                          <div className="font-semibold">{formatCurrency(service.revenue)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Operational Report */}
        <TabsContent value="operational">
          {operationalLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Jobs</p>
                        <p className="text-2xl font-bold">{operational?.total_jobs || 0}</p>
                      </div>
                      <Car className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="text-2xl font-bold text-success-600">
                          {operational?.completed_jobs || 0}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-success-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Wait Time</p>
                        <p className="text-2xl font-bold">
                          {operational?.average_wait_time || 0} min
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-warning-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Service Time</p>
                        <p className="text-2xl font-bold">
                          {operational?.average_service_time || 0} min
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-info-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Bay Utilization */}
                <Card>
                  <CardHeader>
                    <CardTitle>Bay Utilization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {operational?.bay_utilization?.map((bay) => (
                        <div key={bay.bay_id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{bay.bay_name}</span>
                            <div className="text-right">
                              <span className="font-semibold">
                                {bay.utilization_rate.toFixed(1)}%
                              </span>
                              <div className="text-xs text-muted-foreground">
                                {bay.jobs_completed} jobs
                              </div>
                            </div>
                          </div>
                          <Progress value={bay.utilization_rate} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Staff Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Staff Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {operational?.staff_performance?.map((staff) => (
                        <div key={staff.staff_id} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{staff.staff_name}</div>
                            <div className="text-xs text-muted-foreground">
                              Avg: {staff.average_time} min per job
                            </div>
                          </div>
                          <Badge variant="secondary">{staff.jobs_completed} jobs</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Customer Report */}
        <TabsContent value="customers">
          {customerLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Customers</p>
                        <p className="text-2xl font-bold">{customers?.total_customers || 0}</p>
                      </div>
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">New Customers</p>
                        <p className="text-2xl font-bold text-success-600">
                          {customers?.new_customers || 0}
                        </p>
                      </div>
                      <ArrowUpRight className="h-8 w-8 text-success-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Repeat Customers</p>
                        <p className="text-2xl font-bold">{customers?.repeat_customers || 0}</p>
                      </div>
                      <Users className="h-8 w-8 text-info-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Retention Rate</p>
                        <p className="text-2xl font-bold">
                          {customers?.total_customers
                            ? (
                                ((customers.repeat_customers || 0) / customers.total_customers) *
                                100
                              ).toFixed(1)
                            : 0}
                          %
                        </p>
                      </div>
                      <Percent className="h-8 w-8 text-warning-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Customers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Customers</CardTitle>
                  <CardDescription>Customers with highest spending this period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {customers?.top_customers?.map((item, index) => (
                      <div
                        key={item.customer.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{item.customer.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.total_visits} visits
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(item.total_spent)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Financial Report */}
        <TabsContent value="financial">
          {financialLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold text-success-600">
                          {formatCurrency(financial?.total_revenue || 0)}
                        </p>
                      </div>
                      <ArrowUpRight className="h-8 w-8 text-success-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-2xl font-bold text-destructive">
                          {formatCurrency(financial?.total_expenses || 0)}
                        </p>
                      </div>
                      <ArrowDownRight className="h-8 w-8 text-destructive" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Net Profit</p>
                        <p
                          className={cn(
                            'text-2xl font-bold',
                            (financial?.net_profit || 0) >= 0
                              ? 'text-success-600'
                              : 'text-destructive'
                          )}
                        >
                          {formatCurrency(financial?.net_profit || 0)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Revenue Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {financial?.revenue_by_method &&
                        Object.entries(financial.revenue_by_method).map(([method, amount]) => (
                          <div key={method} className="flex items-center justify-between">
                            <PaymentMethodBadge method={method} />
                            <span className="font-semibold">{formatCurrency(amount)}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Expenses Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Expenses by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {financial?.expenses_by_category &&
                        Object.entries(financial.expenses_by_category).map(([category, amount]) => (
                          <div key={category} className="flex items-center justify-between">
                            <Badge variant="secondary" className="capitalize">
                              {category.replace('_', ' ')}
                            </Badge>
                            <span className="font-semibold">{formatCurrency(amount)}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
