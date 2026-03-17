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
import { DollarSign, TrendingUp, Clock, CheckCircle, Percent, Car } from 'lucide-react';

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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-blue-100 font-medium">Total Jobs</p>
              <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-3 w-3 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{summaryData?.total_jobs || 0}</p>
            <p className="text-xs text-blue-200 mt-1">This month</p>
          </div>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-purple-100 font-medium">Total Earnings</p>
              <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center">
                <DollarSign className="h-3 w-3 text-white" />
              </div>
            </div>
            <p className="text-xl font-bold text-white">
              {formatCurrency(parseFloat(summaryData?.total_earnings || '0'))}
            </p>
            <p className="text-xs text-purple-200 mt-1">All time</p>
          </div>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-yellow-100 font-medium">Pending</p>
              <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center">
                <Clock className="h-3 w-3 text-white" />
              </div>
            </div>
            <p className="text-xl font-bold text-white">
              {formatCurrency(parseFloat(summaryData?.pending_commission || '0'))}
            </p>
            <p className="text-xs text-yellow-100 mt-1">Awaiting payment</p>
          </div>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-br from-green-500 to-green-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-green-100 font-medium">Paid Out</p>
              <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle className="h-3 w-3 text-white" />
              </div>
            </div>
            <p className="text-xl font-bold text-white">
              {formatCurrency(parseFloat(summaryData?.paid_commission || '0'))}
            </p>
            <p className="text-xs text-green-200 mt-1">Received</p>
          </div>
        </Card>
      </div>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Commission History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commissionsList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-medium">No commissions yet</p>
              <p className="text-sm mt-1">Complete jobs to start earning commissions!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {commissionsList.map((commission: any) => (
                <div
                  key={commission.id}
                  className={`p-4 border rounded-xl transition-all ${
                    commission.status === 'paid'
                      ? 'bg-green-50/50 border-green-200'
                      : 'bg-yellow-50/50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        commission.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        <Car className={`h-5 w-5 ${commission.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{commission.job_no}</span>
                          <Badge variant={commission.status === 'paid' ? 'success' : 'warning'}>
                            {commission.status === 'paid' ? 'Paid' : 'Pending'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(commission.job_date), { addSuffix: true })}
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-white rounded-full border text-xs font-medium text-primary">
                            <Percent className="h-3 w-3" />
                            {commission.commission_rate}% rate
                          </div>
                          <div className="text-xs text-muted-foreground">
                            on {formatCurrency(parseFloat(commission.base_amount || 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`font-bold text-lg ${
                        commission.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {formatCurrency(parseFloat(commission.amount || 0))}
                      </div>
                      <div className="text-xs text-muted-foreground">earned</div>
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
