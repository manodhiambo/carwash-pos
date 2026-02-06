'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, paymentsApi } from '@/lib/api';
import { formatCurrency, normalizePhoneNumber, cn } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, SearchInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge, StatusBadge, PaymentMethodBadge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Car,
  Search,
  DollarSign,
  Smartphone,
  CreditCard,
  Banknote,
  Gift,
  Receipt,
  CheckCircle,
  Loader2,
  XCircle,
  Printer,
  Clock,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Job, PaymentMethod } from '@/types';

const paymentMethods: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'mpesa', label: 'M-Pesa', icon: Smartphone },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'loyalty_points', label: 'Points', icon: Gift },
];

export default function POSPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const preselectedJobId = searchParams.get('job');

  const [search, setSearch] = React.useState('');
  const [selectedJob, setSelectedJob] = React.useState<Job | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('cash');
  const [mpesaPhone, setMpesaPhone] = React.useState('');
  const [referenceNumber, setReferenceNumber] = React.useState('');
  const [amountTendered, setAmountTendered] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [mpesaDialog, setMpesaDialog] = React.useState<{
    open: boolean;
    status: 'pending' | 'completed' | 'failed';
    checkoutRequestId?: string;
  }>({ open: false, status: 'pending' });
  const [successDialog, setSuccessDialog] = React.useState<{
    open: boolean;
    job?: Job;
  }>({ open: false });

  // Fetch unpaid completed jobs
  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['unpaid-jobs', search],
    queryFn: () =>
      jobsApi.getAll({
        status: 'completed',
        payment_status: 'unpaid',
        search: search || undefined,
        limit: 20,
      }),
  });

  // Fetch preselected job
  const { data: preselectedJob } = useQuery({
    queryKey: ['job', preselectedJobId],
    queryFn: () => (preselectedJobId ? jobsApi.getById(preselectedJobId) : null),
    enabled: !!preselectedJobId,
  });

  // Set preselected job on load
  React.useEffect(() => {
    if (preselectedJob?.data) {
      setSelectedJob(preselectedJob.data);
    }
  }, [preselectedJob]);

  const unpaidJobs = jobsData?.data || [];

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data: {
      job_id: string;
      amount: number;
      payment_method: PaymentMethod;
      reference_number?: string;
      mpesa_phone?: string;
    }) => {
      if (data.payment_method === 'mpesa') {
        // Initiate M-Pesa STK Push
        const response = await paymentsApi.initiateMpesa(
          data.job_id,
          data.mpesa_phone!,
          data.amount
        );
        return { ...response, type: 'mpesa' };
      } else {
        // Create direct payment
        const response = await paymentsApi.create({
          job_id: data.job_id,
          amount: data.amount,
          payment_method: data.payment_method,
          reference_number: data.reference_number,
        });
        return { ...response, type: 'direct' };
      }
    },
    onSuccess: (data) => {
      if (data.type === 'mpesa') {
        // Show M-Pesa waiting dialog
        const mpesaData = data.data as { checkout_request_id: string; merchant_request_id: string };
        setMpesaDialog({
          open: true,
          status: 'pending',
          checkoutRequestId: mpesaData.checkout_request_id,
        });
        // Start polling for status
        pollMpesaStatus(mpesaData.checkout_request_id);
      } else {
        // Direct payment success
        queryClient.invalidateQueries({ queryKey: ['unpaid-jobs'] });
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        setSuccessDialog({ open: true, job: selectedJob! });
        setSelectedJob(null);
        setAmountTendered('');
        setReferenceNumber('');
      }
      setIsProcessing(false);
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Payment failed');
      setIsProcessing(false);
    },
  });

  // Poll M-Pesa status
  const pollMpesaStatus = async (checkoutRequestId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds total

    const poll = async () => {
      try {
        const response = await paymentsApi.checkMpesaStatus(checkoutRequestId);

        if (response.data.status === 'completed') {
          setMpesaDialog({ open: true, status: 'completed' });
          queryClient.invalidateQueries({ queryKey: ['unpaid-jobs'] });
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          setTimeout(() => {
            setMpesaDialog({ open: false, status: 'pending' });
            setSuccessDialog({ open: true, job: selectedJob! });
            setSelectedJob(null);
            setMpesaPhone('');
          }, 2000);
          return;
        } else if (response.data.status === 'failed') {
          setMpesaDialog({ open: true, status: 'failed' });
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setMpesaDialog({ open: true, status: 'failed' });
          toast.error('M-Pesa payment timed out');
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        }
      }
    };

    poll();
  };

  // Handle payment
  const handlePayment = () => {
    if (!selectedJob) return;

    if (paymentMethod === 'mpesa' && !mpesaPhone) {
      toast.error('Please enter M-Pesa phone number');
      return;
    }

    setIsProcessing(true);
    createPaymentMutation.mutate({
      job_id: selectedJob.id,
      amount: selectedJob.total_amount,
      payment_method: paymentMethod,
      reference_number: referenceNumber || undefined,
      mpesa_phone: paymentMethod === 'mpesa' ? normalizePhoneNumber(mpesaPhone) : undefined,
    });
  };

  // Calculate change
  const calculateChange = () => {
    if (!selectedJob || !amountTendered) return 0;
    const tendered = parseFloat(amountTendered);
    if (isNaN(tendered)) return 0;
    return Math.max(0, tendered - selectedJob.total_amount);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Point of Sale"
        description="Process payments for completed jobs"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'POS' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left - Job Selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Select Job
              </CardTitle>
              <CardDescription>Choose a completed job to process payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SearchInput
                placeholder="Search by job # or reg..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
              />

              <ScrollArea className="h-[400px]">
                {jobsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : unpaidJobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No unpaid jobs found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unpaidJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className={cn(
                          'p-3 rounded-lg border cursor-pointer transition-all',
                          selectedJob?.id === job.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm">{job.job_number}</span>
                          <span className="font-semibold">
                            {formatCurrency(job.total_amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Car className="h-4 w-4" />
                          {job.vehicle?.registration_number}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {job.services.slice(0, 2).map((s) => (
                            <Badge key={s.id} variant="secondary" className="text-xs">
                              {s.service.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right - Payment */}
        <div className="lg:col-span-2">
          {selectedJob ? (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Car className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-lg">
                          {selectedJob.vehicle?.registration_number}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Job #{selectedJob.job_number}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={selectedJob.status} />
                  </div>

                  <div className="space-y-2">
                    {selectedJob.services.map((s) => (
                      <div key={s.id} className="flex items-center justify-between">
                        <span>{s.service.name}</span>
                        <span className="font-medium">{formatCurrency(s.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedJob.subtotal)}</span>
                    </div>
                    {selectedJob.discount_amount > 0 && (
                      <div className="flex items-center justify-between text-sm text-success-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(selectedJob.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span>Tax</span>
                      <span>{formatCurrency(selectedJob.tax_amount)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-primary">
                      {formatCurrency(selectedJob.total_amount)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setPaymentMethod(method.value)}
                          className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                            paymentMethod === method.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-6 w-6',
                              paymentMethod === method.value
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            )}
                          />
                          <span
                            className={cn(
                              'text-sm font-medium',
                              paymentMethod === method.value
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            )}
                          >
                            {method.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Payment Details */}
                  <div className="space-y-4 pt-4">
                    {paymentMethod === 'cash' && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Amount Tendered</Label>
                          <Input
                            type="number"
                            placeholder="Enter amount"
                            value={amountTendered}
                            onChange={(e) => setAmountTendered(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Change</Label>
                          <div className="h-10 px-3 py-2 rounded-md bg-muted flex items-center font-semibold text-lg">
                            {formatCurrency(calculateChange())}
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'mpesa' && (
                      <div className="space-y-2">
                        <Label>M-Pesa Phone Number</Label>
                        <Input
                          type="tel"
                          placeholder="0712 345 678"
                          value={mpesaPhone}
                          onChange={(e) => setMpesaPhone(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          An STK push will be sent to this number
                        </p>
                      </div>
                    )}

                    {paymentMethod === 'card' && (
                      <div className="space-y-2">
                        <Label>Reference Number</Label>
                        <Input
                          placeholder="Card transaction reference"
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Process Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handlePayment}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="mr-2 h-5 w-5" />
                        Process Payment - {formatCurrency(selectedJob.total_amount)}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="flex items-center justify-center h-[500px]">
              <div className="text-center text-muted-foreground">
                <Receipt className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold">Select a Job</h3>
                <p className="mt-1">Choose a completed job from the list to process payment</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* M-Pesa Dialog */}
      <Dialog open={mpesaDialog.open} onOpenChange={(open) => !open && setMpesaDialog({ ...mpesaDialog, open: false })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-600" />
              M-Pesa Payment
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            {mpesaDialog.status === 'pending' && (
              <div className="text-center space-y-4">
                <div className="h-20 w-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Waiting for Payment</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please check your phone and enter your M-Pesa PIN
                  </p>
                </div>
                <Progress value={undefined} className="w-full" />
              </div>
            )}
            {mpesaDialog.status === 'completed' && (
              <div className="text-center space-y-4">
                <div className="h-20 w-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-green-600">Payment Successful!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    M-Pesa payment has been received
                  </p>
                </div>
              </div>
            )}
            {mpesaDialog.status === 'failed' && (
              <div className="text-center space-y-4">
                <div className="h-20 w-20 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-red-600">Payment Failed</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    The M-Pesa payment was not completed. Please try again.
                  </p>
                </div>
                <Button onClick={() => setMpesaDialog({ open: false, status: 'pending' })}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialog.open} onOpenChange={(open) => setSuccessDialog({ open, job: undefined })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Payment Successful!</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="h-20 w-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            {successDialog.job && (
              <div className="space-y-2">
                <p className="text-lg font-semibold">
                  {formatCurrency(successDialog.job.total_amount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Payment received for {successDialog.job.vehicle?.registration_number}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSuccessDialog({ open: false })}>
              Close
            </Button>
            <Button onClick={() => {
              // Print receipt
              if (successDialog.job) {
                window.open(`/receipts/${successDialog.job.id}`, '_blank');
              }
              setSuccessDialog({ open: false });
            }}>
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
