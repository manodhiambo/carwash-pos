'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api';
import { formatCurrency, formatTime, getRelativeTime, cn } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/input';
import { SimpleSelect } from '@/components/ui/select';
import { Badge, StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
  TableSkeleton,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog } from '@/components/ui/dialog';
import {
  Car,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Eye,
  DollarSign,
  User,
  Clock,
  Wrench,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Job, JobStatus } from '@/types';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'in_queue', label: 'In Queue' },
  { value: 'washing', label: 'Washing' },
  { value: 'detailing', label: 'Detailing' },
  { value: 'completed', label: 'Completed' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

const paymentStatusOptions = [
  { value: '', label: 'All Payment Status' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
];

export default function JobsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [paymentFilter, setPaymentFilter] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('active');
  const [cancelDialog, setCancelDialog] = React.useState<{ open: boolean; job: Job | null }>({
    open: false,
    job: null,
  });

  // Fetch jobs
  const { data: jobsData, isLoading, refetch } = useQuery({
    queryKey: ['jobs', { status: statusFilter, payment_status: paymentFilter, search }],
    queryFn: () =>
      jobsApi.getAll({
        status: statusFilter || undefined,
        payment_status: paymentFilter || undefined,
        search: search || undefined,
        limit: 50,
      }),
    refetchInterval: 15000,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) =>
      jobsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job status updated');
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to update status');
    },
  });

  // Cancel job mutation
  const cancelJobMutation = useMutation({
    mutationFn: (id: string) => jobsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job cancelled');
      setCancelDialog({ open: false, job: null });
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to cancel job');
    },
  });

  const jobs = jobsData?.data || [];

  // Filter jobs by tab
  const filteredJobs = React.useMemo(() => {
    if (activeTab === 'active') {
      return jobs.filter((j) =>
        ['checked_in', 'in_queue', 'washing', 'detailing'].includes(j.status)
      );
    } else if (activeTab === 'completed') {
      return jobs.filter((j) => j.status === 'completed' || j.status === 'paid');
    } else if (activeTab === 'unpaid') {
      return jobs.filter((j) => j.payment_status !== 'paid' && j.status === 'completed');
    }
    return jobs;
  }, [jobs, activeTab]);

  // Get next status
  const getNextStatus = (currentStatus: JobStatus): JobStatus | null => {
    const flow: Record<string, JobStatus> = {
      checked_in: 'in_queue',
      in_queue: 'washing',
      washing: 'detailing',
      detailing: 'completed',
    };
    return flow[currentStatus] || null;
  };

  const handleStatusChange = (job: Job, newStatus: JobStatus) => {
    updateStatusMutation.mutate({ id: job.id, status: newStatus });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Job Queue"
        description="Manage vehicle wash jobs and track progress"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Jobs' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Link href="/check-in">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Check-In
              </Button>
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px] max-w-md">
          <SearchInput
            placeholder="Search by job #, registration..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <SimpleSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={statusOptions}
          className="w-[180px]"
        />
        <SimpleSelect
          value={paymentFilter}
          onValueChange={setPaymentFilter}
          options={paymentStatusOptions}
          className="w-[180px]"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="active">
            Active Jobs
            <Badge variant="secondary" className="ml-2">
              {jobs.filter((j) =>
                ['checked_in', 'in_queue', 'washing', 'detailing'].includes(
                  j.status
                )
              ).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="unpaid">
            Unpaid
            <Badge variant="warning" className="ml-2">
              {jobs.filter((j) => j.payment_status !== 'paid' && j.status === 'completed').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all">All Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {/* Mobile card view */}
          <div className="sm:hidden space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
              ))
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Car className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No jobs found</p>
                <p className="text-sm mt-1">
                  {activeTab === 'active' ? 'Check in a vehicle to get started.' : 'No jobs match your filters.'}
                </p>
                <Link href="/check-in">
                  <Button className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    New Check-In
                  </Button>
                </Link>
              </div>
            ) : (
              filteredJobs.map((job) => {
                const nextStatus = getNextStatus(job.status as JobStatus);
                const isActive = !['completed', 'paid', 'cancelled'].includes(job.status);
                return (
                  <div
                    key={job.id}
                    className="bg-card rounded-xl border shadow-sm overflow-hidden"
                  >
                    {/* Card header — colored by status */}
                    <div className={cn(
                      'px-4 py-2.5 flex items-center justify-between',
                      job.status === 'completed' || job.status === 'paid'
                        ? 'bg-green-50 dark:bg-green-950/30'
                        : job.status === 'cancelled'
                        ? 'bg-red-50 dark:bg-red-950/30'
                        : job.status === 'washing' || job.status === 'detailing'
                        ? 'bg-blue-50 dark:bg-blue-950/30'
                        : 'bg-orange-50 dark:bg-orange-950/30'
                    )}>
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-white shadow-sm flex items-center justify-center">
                          <Car className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-wide">{job.vehicle?.registration_number}</p>
                          <p className="text-xs text-muted-foreground capitalize">{job.vehicle?.vehicle_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={job.status} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/jobs/${job.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            {isActive && nextStatus && (
                              <DropdownMenuItem onClick={() => handleStatusChange(job, nextStatus)}>
                                <Play className="h-4 w-4 mr-2" />
                                Move to {nextStatus.replace('_', ' ')}
                              </DropdownMenuItem>
                            )}
                            {job.status === 'completed' && job.payment_status !== 'paid' && (
                              <DropdownMenuItem asChild>
                                <Link href={`/pos?job=${job.id}`}>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Process Payment
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {isActive && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setCancelDialog({ open: true, job })}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Job
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="px-4 py-3 space-y-2">
                      {/* Services */}
                      <div className="flex flex-wrap gap-1">
                        {(job.services ?? []).slice(0, 3).map((s) => (
                          <Badge key={s.id} variant="secondary" className="text-xs">
                            {s.service.name}
                          </Badge>
                        ))}
                        {(job.services ?? []).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(job.services ?? []).length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* Footer row */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getRelativeTime(job.check_in_time ?? job.created_at ?? '')}
                          </span>
                          {job.bay && (
                            <span className="flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              {job.bay.name}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(job.total_amount)}</p>
                          <StatusBadge status={job.payment_status ?? 'unpaid'} className="text-[10px]" />
                        </div>
                      </div>
                    </div>

                    {/* Quick action bar for active jobs */}
                    {isActive && nextStatus && (
                      <div className="border-t px-4 py-2 flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs gap-1"
                          onClick={() => handleStatusChange(job, nextStatus)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Play className="h-3 w-3" />
                          Move to {nextStatus.replace('_', ' ')}
                        </Button>
                        <Link href={`/jobs/${job.id}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1">
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        </Link>
                      </div>
                    )}
                    {job.status === 'completed' && job.payment_status !== 'paid' && (
                      <div className="border-t px-4 py-2">
                        <Link href={`/pos?job=${job.id}`}>
                          <Button size="sm" className="w-full h-8 text-xs gap-1 bg-green-600 hover:bg-green-700">
                            <DollarSign className="h-3 w-3" />
                            Collect Payment — {formatCurrency(job.total_amount)}
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop table view */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job #</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bay / Staff</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeleton columns={9} rows={5} />
                  ) : filteredJobs.length === 0 ? (
                    <TableEmpty
                      colSpan={9}
                      title="No jobs found"
                      description={
                        activeTab === 'active'
                          ? 'No active jobs at the moment. Check in a vehicle to get started.'
                          : 'No jobs match your filters.'
                      }
                      icon={<Car className="h-12 w-12" />}
                      action={
                        <Link href="/check-in">
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Check-In
                          </Button>
                        </Link>
                      }
                    />
                  ) : (
                    filteredJobs.map((job) => {
                      const nextStatus = getNextStatus(job.status as JobStatus);

                      return (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div className="font-mono font-medium">{job.job_number}</div>
                            <PriorityBadge priority={job.priority ?? 'normal'} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Car className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">
                                  {job.vehicle?.registration_number}
                                </div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {job.vehicle?.vehicle_type}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              {(job.services ?? []).slice(0, 2).map((s) => (
                                <Badge key={s.id} variant="secondary" className="mr-1 mb-1 text-xs">
                                  {s.service.name}
                                </Badge>
                              ))}
                              {(job.services ?? []).length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(job.services ?? []).length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={job.status} />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {job.bay ? (
                                <div className="flex items-center gap-1">
                                  <Wrench className="h-3 w-3" />
                                  {job.bay.name}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                              {job.assigned_staff && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  {job.assigned_staff.name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatCurrency(job.total_amount)}</div>
                            {job.discount_amount > 0 && (
                              <div className="text-xs text-muted-foreground">
                                -{formatCurrency(job.discount_amount)} discount
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={job.payment_status ?? 'unpaid'} />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {getRelativeTime(job.check_in_time ?? job.created_at ?? '')}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {job.estimated_duration} min
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/jobs/${job.id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                {job.status !== 'completed' &&
                                  job.status !== 'paid' &&
                                  job.status !== 'cancelled' &&
                                  nextStatus && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(job, nextStatus)}>
                                      <Play className="h-4 w-4 mr-2" />
                                      Move to {nextStatus.replace('_', ' ')}
                                    </DropdownMenuItem>
                                  )}
                                {job.status === 'completed' && job.payment_status !== 'paid' && (
                                  <DropdownMenuItem asChild>
                                    <Link href={`/pos?job=${job.id}`}>
                                      <DollarSign className="h-4 w-4 mr-2" />
                                      Process Payment
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {job.status !== 'completed' &&
                                  job.status !== 'paid' &&
                                  job.status !== 'cancelled' && (
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => setCancelDialog({ open: true, job })}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Cancel Job
                                    </DropdownMenuItem>
                                  )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <AlertDialog
        open={cancelDialog.open}
        onOpenChange={(open) => setCancelDialog({ open, job: open ? cancelDialog.job : null })}
        title="Cancel Job"
        description={`Are you sure you want to cancel job ${cancelDialog.job?.job_number}? This action cannot be undone.`}
        confirmText="Cancel Job"
        cancelText="Keep Job"
        onConfirm={() => cancelDialog.job && cancelJobMutation.mutate(cancelDialog.job.id)}
        variant="destructive"
        loading={cancelJobMutation.isPending}
      />
    </PageContainer>
  );
}
