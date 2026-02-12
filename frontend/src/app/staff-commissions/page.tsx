'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionsApi } from '@/lib/api';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Badge,
  Button,
  Input,
} from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, Users, CheckCircle, Clock, ChevronDown, ChevronRight, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffCommissionsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: summaries, isLoading } = useQuery({
    queryKey: ['commission-summaries', startDate, endDate],
    queryFn: () => commissionsApi.getAllSummaries({
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    }),
  });

  // Fetch individual commissions when a staff row is expanded
  const { data: staffCommissions, isLoading: staffCommissionsLoading } = useQuery({
    queryKey: ['staff-commissions-detail', expandedStaff, startDate, endDate],
    queryFn: () => commissionsApi.getStaffCommissions(expandedStaff!, {
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    }),
    enabled: !!expandedStaff,
  });

  const markPaidMutation = useMutation({
    mutationFn: (commissionId: string) => commissionsApi.markPaid(commissionId, 'Paid via admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-summaries'] });
      queryClient.invalidateQueries({ queryKey: ['staff-commissions-detail'] });
      toast.success('Commission marked as paid');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark commission as paid');
    },
  });

  const payAllStaffMutation = useMutation({
    mutationFn: (staffId: string) => commissionsApi.payAllForStaff(staffId, 'Bulk payment via admin'),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['commission-summaries'] });
      queryClient.invalidateQueries({ queryKey: ['staff-commissions-detail'] });
      toast.success(`${data.data?.count || 0} commissions paid out`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to pay commissions');
    },
  });

  const payDailyMutation = useMutation({
    mutationFn: () => commissionsApi.payDaily('Evening closeout'),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['commission-summaries'] });
      queryClient.invalidateQueries({ queryKey: ['staff-commissions-detail'] });
      toast.success(`${data.data?.count || 0} commissions paid out`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to process closeout');
    },
  });

  const staffSummaries = summaries?.data || [];

  // Calculate totals
  const totalPending = staffSummaries.reduce(
    (sum: number, staff: any) => sum + parseFloat(staff.pending_commission || '0'),
    0
  );
  const totalPaid = staffSummaries.reduce(
    (sum: number, staff: any) => sum + parseFloat(staff.paid_commission || '0'),
    0
  );
  const totalJobs = staffSummaries.reduce(
    (sum: number, staff: any) => sum + parseInt(staff.total_jobs || '0'),
    0
  );

  // Filter staff
  const filteredStaff = staffSummaries.filter((staff: any) =>
    staff.staff_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (staffId: string) => {
    setExpandedStaff(expandedStaff === staffId ? null : staffId);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Staff Commissions"
        description="Manage and track staff commissions"
      >
        <Button
          onClick={() => {
            if (totalPending <= 0) {
              toast.error('No pending commissions to pay');
              return;
            }
            if (confirm(`Pay out all pending commissions (${formatCurrency(totalPending)})? This action cannot be undone.`)) {
              payDailyMutation.mutate();
            }
          }}
          disabled={payDailyMutation.isPending || totalPending <= 0}
          variant="default"
          className="gap-2"
        >
          <CreditCard className="h-4 w-4" />
          {payDailyMutation.isPending ? 'Processing...' : 'Evening Closeout'}
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffSummaries.length}</div>
            <p className="text-xs text-muted-foreground">Active staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(totalPending)}
            </div>
            <p className="text-xs text-muted-foreground">To be paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Period</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">Already paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Staff Commission Summary</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
                placeholder="Start date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
                placeholder="End date"
              />
              <Input
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No staff found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStaff.map((staff: any) => {
                const isExpanded = expandedStaff === staff.staff_id.toString();
                const pendingAmount = parseFloat(staff.pending_commission || '0');

                return (
                  <div key={staff.staff_id} className="border rounded-lg">
                    {/* Staff Row */}
                    <div
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(staff.staff_id.toString())}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="font-semibold text-lg">{staff.staff_name}</div>
                            <Badge variant="outline">{staff.commission_rate}% rate</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Jobs: </span>
                              <span className="font-medium">{staff.total_jobs}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Pending: </span>
                              <span className="font-medium text-yellow-600">
                                {formatCurrency(staff.pending_commission)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Paid: </span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(staff.paid_commission)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-xl">
                            {formatCurrency(staff.total_earnings)}
                          </div>
                          <div className="text-xs text-muted-foreground">Total earnings</div>
                        </div>
                        {pendingAmount > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Pay all pending commissions for ${staff.staff_name} (${formatCurrency(pendingAmount)})?`)) {
                                payAllStaffMutation.mutate(staff.staff_id.toString());
                              }
                            }}
                            disabled={payAllStaffMutation.isPending}
                          >
                            Pay All
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="border-t px-4 py-3 bg-muted/30">
                        {staffCommissionsLoading ? (
                          <div className="flex justify-center py-4">
                            <Spinner size="sm" />
                          </div>
                        ) : !staffCommissions?.data?.length ? (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            No commission records found
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-muted-foreground border-b">
                                  <th className="pb-2 pr-4">Job #</th>
                                  <th className="pb-2 pr-4">Date</th>
                                  <th className="pb-2 pr-4 text-right">Base Amount</th>
                                  <th className="pb-2 pr-4 text-right">Rate</th>
                                  <th className="pb-2 pr-4 text-right">Commission</th>
                                  <th className="pb-2 pr-4">Status</th>
                                  <th className="pb-2">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {staffCommissions.data.map((commission: any) => (
                                  <tr key={commission.id} className="border-b last:border-0">
                                    <td className="py-2 pr-4 font-medium">{commission.job_no || '-'}</td>
                                    <td className="py-2 pr-4">
                                      {commission.created_at
                                        ? new Date(commission.created_at).toLocaleDateString()
                                        : '-'}
                                    </td>
                                    <td className="py-2 pr-4 text-right">
                                      {formatCurrency(commission.base_amount || 0)}
                                    </td>
                                    <td className="py-2 pr-4 text-right">
                                      {commission.commission_rate || '-'}%
                                    </td>
                                    <td className="py-2 pr-4 text-right font-medium">
                                      {formatCurrency(commission.amount)}
                                    </td>
                                    <td className="py-2 pr-4">
                                      <Badge
                                        variant={commission.status === 'paid' ? 'default' : 'secondary'}
                                        className={commission.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                                      >
                                        {commission.status}
                                      </Badge>
                                    </td>
                                    <td className="py-2">
                                      {commission.status === 'pending' && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => markPaidMutation.mutate(commission.id.toString())}
                                          disabled={markPaidMutation.isPending}
                                        >
                                          Mark Paid
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
