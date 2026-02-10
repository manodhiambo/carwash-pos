'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { commissionsApi, authApi } from '@/lib/api';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Badge,
} from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export default function MyCommissionsPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user
    authApi.getCurrentUser().then((response) => {
      setUserId(response.data.id.toString());
    }).catch(() => {
      window.location.href = '/login';
    });
  }, []);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['my-commission-summary', userId],
    queryFn: () => commissionsApi.getSummary(userId || ''),
    enabled: !!userId,
  });

  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['my-commissions', userId],
    queryFn: () => commissionsApi.getStaffCommissions(userId || ''),
    enabled: !!userId,
  });

  const summaryData = summary?.data;
  const commissionsList = commissions?.data || [];

  if (!userId || summaryLoading || commissionsLoading) {
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
        title="My Commissions"
        description="Track your earnings and commission history"
      />

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData?.total_jobs || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(parseFloat(summaryData?.total_earnings || '0'))}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(parseFloat(summaryData?.pending_commission || '0'))}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(parseFloat(summaryData?.paid_commission || '0'))}
            </div>
            <p className="text-xs text-muted-foreground">Received</p>
          </CardContent>
        </Card>
      </div>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
        </CardHeader>
        <CardContent>
          {commissionsList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No commissions yet. Complete jobs to earn commissions!
            </div>
          ) : (
            <div className="space-y-4">
              {commissionsList.map((commission: any) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold">{commission.job_no}</div>
                      <Badge
                        variant={commission.status === 'paid' ? 'success' : 'warning'}
                      >
                        {commission.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(commission.job_date), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {formatCurrency(commission.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {commission.commission_rate}% of {formatCurrency(commission.base_amount)}
                    </div>
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
