'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { formatCurrency, formatTime, getRelativeTime } from '@/lib/utils';
import { PageContainer, PageHeader, Section } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge, PaymentMethodBadge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Skeleton, StatsGridSkeleton, CardSkeleton } from '@/components/ui/skeleton';
import {
  Car,
  DollarSign,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Package,
  Wrench,
  TrendingUp,
  Plus,
  ChevronRight,
  Activity,
  Droplets,
} from 'lucide-react';
import { Job, Bay, InventoryItem } from '@/types';

export default function DashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => dashboardApi.getMetrics(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => dashboardApi.getAlerts(),
    refetchInterval: 60000,
  });

  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ['dashboard-queue'],
    queryFn: () => dashboardApi.getQueue(),
    refetchInterval: 15000,
  });

  const { data: bayStatus, isLoading: baysLoading } = useQuery({
    queryKey: ['dashboard-bays'],
    queryFn: () => dashboardApi.getBayStatus(),
    refetchInterval: 15000,
  });

  const dashboardData = metrics?.data;
  const alertsList = alerts?.data?.alerts || [];
  const queue = queueData?.data || [];
  const bays = bayStatus?.data || [];

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {metricsLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Today's Revenue"
              value={formatCurrency(dashboardData?.today.total_revenue || 0)}
              icon={<DollarSign className="h-6 w-6" />}
              trend={
                dashboardData?.comparison.revenue_change
                  ? {
                      value: dashboardData.comparison.revenue_change,
                      isPositive: dashboardData.comparison.revenue_change > 0,
                    }
                  : undefined
              }
              description="vs yesterday"
            />
            <StatCard
              title="Cars Serviced"
              value={dashboardData?.today.completed_jobs || 0}
              icon={<Car className="h-6 w-6" />}
              trend={
                dashboardData?.comparison.jobs_change
                  ? {
                      value: dashboardData.comparison.jobs_change,
                      isPositive: dashboardData.comparison.jobs_change > 0,
                    }
                  : undefined
              }
              description="vs yesterday"
            />
            <StatCard
              title="In Queue"
              value={dashboardData?.today.vehicles_in_queue || 0}
              icon={<Clock className="h-6 w-6" />}
              description="vehicles waiting"
            />
            <StatCard
              title="Active Bays"
              value={`${dashboardData?.today.active_bays || 0} / ${bays.length}`}
              icon={<Wrench className="h-6 w-6" />}
              description="bays occupied"
            />
          </>
        )}
      </div>

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
                    {queue.slice(0, 5).map((job: Job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Car className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{job.vehicle?.registration_number}</div>
                            <div className="text-sm text-muted-foreground">
                              {job.services.map((s) => s.service.name).join(', ')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={job.status} />
                          <div className="text-xs text-muted-foreground mt-1">
                            {getRelativeTime(job.check_in_time)}
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
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {bays.map((bay: Bay) => (
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
                      {bay.current_job && (
                        <div className="mt-2 text-xs font-medium text-primary">
                          {bay.current_job.vehicle?.registration_number}
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
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !dashboardData?.low_stock_items || dashboardData.low_stock_items.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All items well stocked</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.low_stock_items.slice(0, 5).map((item: InventoryItem) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.current_stock} / {item.min_stock_level} {item.unit}
                        </div>
                      </div>
                      <Badge variant="warning" className="text-xs">
                        Low
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Payments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-destructive" />
                Pending Payments
              </CardTitle>
              <Link href="/pos">
                <Button variant="ghost" size="sm" className="gap-1">
                  View <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !dashboardData?.pending_payments || dashboardData.pending_payments.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No pending payments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.pending_payments.slice(0, 5).map((job: Job) => (
                    <div key={job.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          {job.vehicle?.registration_number}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {job.job_number}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">
                          {formatCurrency(job.total_amount)}
                        </div>
                        <StatusBadge status={job.payment_status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
