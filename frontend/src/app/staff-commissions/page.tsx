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
import { DollarSign, Users, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffCommissionsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: summaries, isLoading } = useQuery({
    queryKey: ['commission-summaries'],
    queryFn: () => commissionsApi.getAllSummaries(),
  });

  const markPaidMutation = useMutation({
    mutationFn: (commissionId: string) => commissionsApi.markPaid(commissionId, 'Paid via admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-summaries'] });
      toast.success('Commission marked as paid');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark commission as paid');
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
      />

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
            <p className="text-xs text-muted-foreground">This month</p>
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
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
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
          <div className="flex items-center justify-between">
            <CardTitle>Staff Commission Summary</CardTitle>
            <Input
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No staff found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStaff.map((staff: any) => (
                <div
                  key={staff.staff_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
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
                  <div className="text-right">
                    <div className="font-bold text-xl">
                      {formatCurrency(staff.total_earnings)}
                    </div>
                    <div className="text-xs text-muted-foreground">Total earnings</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
