'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, commissionsApi, authApi } from '@/lib/api';
import { formatCurrency, getRelativeTime } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';
import {
  Car,
  DollarSign,
  Clock,
  AlertTriangle,
  Package,
  Wrench,
  TrendingUp,
  Plus,
  ChevronRight,
  Activity,
  Droplets,
  CheckCircle,
} from 'lucide-react';

// Dashboard metrics type matching backend response
interface DashboardMetrics {
  carsServicedToday: number;
  activeJobs: number;
  completedUnpaid: number;
  revenueToday: {
    cash: number;
    mpesa: number;
    card: number;
    total: number;
  };
  averageServiceTime: number;
  staffOnDuty: number;
  lowStockItems: number;
}

// Queue job type
interface QueueJob {
  id: number;
  job_no: string;
  status: string;
  created_at: string;
  registration_no: string;
  vehicle_type: string;
  customer_name?: string;
  bay_name?: string;
  services: string[];
  wait_time_minutes: number;
  is_long_wait: boolean;
}

// Bay status type
interface BayStatus {
  id: number;
  name: string;
  bay_number: number;
  bay_type: string;
  status: string;
  job_id?: number;
  registration_no?: string;
  elapsed_minutes?: number;
}

export default function DashboardPage() {
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => dashboardApi.getMetrics(),
    refetchInterval: 30000,
    retry: 2,
  });

  // Get current user and commission summary
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    authApi.getCurrentUser().then((response) => {
      setUserId(response.data.id.toString());
      setUserRole(response.data.role);
    });
  }, []);

  const { data: commissionSummary } = useQuery({
    queryKey: ['my-commission-summary', userId],
    queryFn: () => commissionsApi.getSummary(userId || ''),
    enabled: !!userId,
  });

  const myCommissions = commissionSummary?.data;

  const isAdminOrManager = userRole === 'admin' || userRole === 'manager';

  const { data: allCommissionSummaries } = useQuery({
    queryKey: ['all-commission-summaries'],
    queryFn: () => commissionsApi.getAllSummaries(),
    enabled: isAdminOrManager,
  });

  const { data: alerts } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => dashboardApi.getAlerts(),
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ['dashboard-queue'],
    queryFn: () => dashboardApi.getQueue(),
    refetchInterval: 15000,
    retry: 1,
  });

  const { data: bayStatus, isLoading: baysLoading } = useQuery({
    queryKey: ['dashboard-bays'],
    queryFn: () => dashboardApi.getBayStatus(),
    refetchInterval: 15000,
    retry: 1,
  });

  const dashboardData = metrics?.data as DashboardMetrics | undefined;
  const alertsData = alerts?.data as { bayCongestion?: boolean; longWaitVehicles?: unknown[]; lowInventoryItems?: unknown[] } | undefined;
  const queue = (queueData?.data || []) as unknown as QueueJob[];
  const bays = (bayStatus?.data || []) as unknown as BayStatus[];

  // Build alerts list from alerts data
  const alertsList: { type: string; message: string; severity: string }[] = [];
  if (alertsData?.bayCongestion) {
    alertsList.push({ type: 'bay', message: 'All bays are occupied', severity: 'high' });
  }
  if (alertsData?.longWaitVehicles && (alertsData.longWaitVehicles as unknown[]).length > 0) {
    alertsList.push({ type: 'wait', message: `${(alertsData.longWaitVehicles as unknown[]).length} vehicles waiting too long`, severity: 'medium' });
  }
  if (alertsData?.lowInventoryItems && (alertsData.lowInventoryItems as unknown[]).length > 0) {
    alertsList.push({ type: 'inventory', message: `${(alertsData.lowInventoryItems as unknown[]).length} items low on stock`, severity: 'medium' });
  }

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's what's happening today."
        actions={
          <Link href="/check-in">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Check-In
            </Button>
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        {metricsLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </>
        ) : metricsError ? (
          <div className="col-span-4 text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load dashboard metrics</p>
          </div>
        ) : (
          <>
            <Card className="overflow-hidden border-0 shadow-md">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm text-blue-100 font-medium">Today&apos;s Revenue</p>
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {formatCurrency(dashboardData?.revenueToday?.total || 0)}
                </p>
                <p className="text-xs text-blue-200 mt-1">Cash + M-Pesa + Card</p>
              </div>
            </Card>
            <Card className="overflow-hidden border-0 shadow-md">
              <div className="bg-gradient-to-br from-green-500 to-green-700 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm text-green-100 font-medium">Cars Serviced</p>
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Car className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {dashboardData?.carsServicedToday || 0}
                </p>
                <p className="text-xs text-green-200 mt-1">Completed today</p>
              </div>
            </Card>
            <Card className="overflow-hidden border-0 shadow-md">
              <div className="bg-gradient-to-br from-orange-500 to-orange-700 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm text-orange-100 font-medium">Active Jobs</p>
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {dashboardData?.activeJobs || 0}
                </p>
                <p className="text-xs text-orange-200 mt-1">In progress now</p>
              </div>
            </Card>
            <Card className="overflow-hidden border-0 shadow-md">
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm text-purple-100 font-medium">Staff on Duty</p>
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Wrench className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {dashboardData?.staffOnDuty || 0}
                </p>
                <p className="text-xs text-purple-200 mt-1">Attendants working</p>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Commission Summary */}
      {isAdminOrManager && allCommissionSummaries?.data && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link href="/staff-commissions">
            <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-yellow-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
                <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(
                    (allCommissionSummaries.data as any[]).reduce(
                      (sum: number, s: any) => sum + parseFloat(s.pending_commission || '0'),
                      0
                    )
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(allCommissionSummaries.data as any[]).filter((s: any) => parseFloat(s.pending_commission || '0') > 0).length} staff with pending payouts
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/staff-commissions">
            <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-green-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    (allCommissionSummaries.data as any[]).reduce(
                      (sum: number, s: any) => sum + parseFloat(s.paid_commission || '0'),
                      0
                    )
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Total commissions paid out</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {!isAdminOrManager && myCommissions && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            My Commission Earnings
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/my-commissions">
              <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-yellow-400">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground font-medium">Pending Payout</p>
                    <div className="h-7 w-7 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Clock className="h-3 w-3 text-yellow-600" />
                    </div>
                  </div>
                  <div className="text-xl font-bold text-yellow-600">
                    {formatCurrency(parseFloat(String(myCommissions.pending_commission || 0)))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{myCommissions.total_jobs || 0} jobs this month</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/my-commissions">
              <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-green-400">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground font-medium">Total Received</p>
                    <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    </div>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(parseFloat(String(myCommissions.paid_commission || 0)))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Commissions received</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alertsList.length > 0 && (
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {alertsList.map((alert, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  alert.severity === 'high'
                    ? 'bg-destructive/10 text-destructive'
                    : alert.severity === 'medium'
                    ? 'bg-warning-100 text-warning-600'
                    : 'bg-info-100 text-info-600'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Queue & Recent Jobs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Queue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Vehicle Queue
              </CardTitle>
              <Link href="/jobs">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : queue.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No vehicles in queue</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {queue.slice(0, 5).map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Car className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{job.registration_no}</div>
                            <div className="text-sm text-muted-foreground">
                              {Array.isArray(job.services) ? job.services.filter(Boolean).join(', ') : '-'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={job.status} />
                          <div className="text-xs text-muted-foreground mt-1">
                            {job.wait_time_minutes} min
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Bay Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-primary" />
                Bay Status
              </CardTitle>
              <Link href="/bays">
                <Button variant="ghost" size="sm" className="gap-1">
                  Manage <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {baysLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : bays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No bays configured</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {bays.map((bay) => (
                    <div
                      key={bay.id}
                      className={`relative p-4 rounded-lg border-2 ${
                        bay.status === 'available'
                          ? 'border-success-500/50 bg-success-50'
                          : bay.status === 'occupied'
                          ? 'border-warning-500/50 bg-warning-50'
                          : 'border-destructive/50 bg-destructive/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{bay.name}</span>
                        <div
                          className={`h-2 w-2 rounded-full ${
                            bay.status === 'available'
                              ? 'bg-success-500'
                              : bay.status === 'occupied'
                              ? 'bg-warning-500 animate-pulse'
                              : 'bg-destructive'
                          }`}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {bay.status}
                      </div>
                      {bay.registration_no && (
                        <div className="mt-2 text-xs font-medium text-primary">
                          {bay.registration_no}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Alerts & Low Stock */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/check-in">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Car className="h-4 w-4" />
                  New Check-In
                </Button>
              </Link>
              <Link href="/pos">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <DollarSign className="h-4 w-4" />
                  Process Payment
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <TrendingUp className="h-4 w-4" />
                  View Reports
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-warning-500" />
                Low Stock Alerts
              </CardTitle>
              <Link href="/inventory">
                <Button variant="ghost" size="sm" className="gap-1">
                  View <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : !dashboardData?.lowStockItems || dashboardData.lowStockItems === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All items well stocked</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-warning-600">
                    {dashboardData.lowStockItems}
                  </div>
                  <p className="text-sm text-muted-foreground">items need restocking</p>
                  <Link href="/inventory?low_stock=true">
                    <Button variant="outline" size="sm" className="mt-3">
                      View Items
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Payments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-destructive" />
                Unpaid Jobs
              </CardTitle>
              <Link href="/pos">
                <Button variant="ghost" size="sm" className="gap-1">
                  View <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : !dashboardData?.completedUnpaid || dashboardData.completedUnpaid === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No pending payments</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-destructive">
                    {dashboardData.completedUnpaid}
                  </div>
                  <p className="text-sm text-muted-foreground">completed jobs awaiting payment</p>
                  <Link href="/pos">
                    <Button variant="outline" size="sm" className="mt-3">
                      Process Payments
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
