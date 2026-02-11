'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, usersApi, commissionsApi } from '@/lib/api';
import { PageHeader, PageContainer } from '@/components/layout/PageHeader';
import {
  Button,
  Card,
  Badge,
  StatusBadge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  SimpleSelect,
  Spinner,
  Label,
  Textarea,
  Separator,
} from '@/components/ui';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  ArrowLeft,
  Car,
  User,
  Phone,
  Clock,
  CheckCircle,
  AlertTriangle,
  Printer,
  MessageSquare,
  DollarSign,
  UserCog,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobId = params.id as string;

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [noteText, setNoteText] = useState('');

  // Fetch job details
  const { data: jobData, isLoading, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobsApi.getById(jobId),
  });

  // Fetch staff for assignment
  const { data: staffData } = useQuery({
    queryKey: ['staff-active'],
    queryFn: () => usersApi.getAll({ limit: 100 }),
  });

  // Update job mutation
  const updateJobMutation = useMutation({
    mutationFn: (data: any) => jobsApi.update(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('Job updated successfully');
    },
    onError: () => {
      toast.error('Failed to update job');
    },
  });

  // Assign staff mutation
  const assignStaffMutation = useMutation({
    mutationFn: (staffId: string) => jobsApi.assignStaff(jobId, staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('Staff assigned successfully');
      setIsAssignDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to assign staff');
    },
  });

  // Calculate commission mutation
  const calculateCommissionMutation = useMutation({
    mutationFn: () => commissionsApi.calculate(jobId),
    onSuccess: () => {
      toast.success('Commission calculated successfully');
    },
    onError: (error: any) => {
      toast.error(error.error || 'Failed to calculate commission');
    },
  });

  const job = jobData?.data;
  const staff = staffData?.data || [];
  const activeStaff = staff.filter((s: any) => s.is_active && ['attendant', 'manager'].includes(s.role));

  const handleStatusChange = (newStatus: string) => {
    updateJobMutation.mutate({ status: newStatus });
  };

  const handleAssignStaff = () => {
    if (selectedStaff) {
      assignStaffMutation.mutate(selectedStaff);
    }
  };

  const handleCalculateCommission = () => {
    if (job?.status === 'completed' && job?.assigned_staff_id) {
      calculateCommissionMutation.mutate();
    } else {
      toast.error('Job must be completed and have assigned staff');
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (error || !job) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-96">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The job you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => router.push('/jobs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </PageContainer>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Job ${job.job_number}`}
        description={`Created on ${formatDate(job.created_at)}`}
        backLink="/jobs"
      >
        <Button variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIsNoteDialogOpen(true)}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Add Note
        </Button>
        <SimpleSelect
          value={job.status}
          onValueChange={handleStatusChange}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Information */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plate Number</p>
                <p className="font-mono font-medium">{job.vehicle?.registration_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Make & Model</p>
                <p className="font-medium">
                  {job.vehicle?.make} {job.vehicle?.model}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Color</p>
                <p>{job.vehicle?.color || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge variant="outline" className="capitalize">
                  {job.vehicle?.vehicle_type || 'N/A'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Customer Information */}
          {job.customer && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{job.customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {job.customer.phone}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Loyalty Points</p>
                  <p className="font-bold text-primary">
                    {job.customer.loyalty_points?.toLocaleString() || 0} pts
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Visits</p>
                  <p className="font-medium">{job.customer.total_visits || 0}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Services */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Services</h3>
            <div className="space-y-3">
              {job.services?.map((service: any) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{service.service?.name || 'Service'}</p>
                    <p className="text-sm text-muted-foreground">
                      {service.staff && (
                        <span className="flex items-center gap-1">
                          <UserCog className="h-3 w-3" />
                          {service.staff.name}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(service.price)}</p>
                    <StatusBadge status={service.status === 'completed' ? 'success' : 'warning'}>
                      {service.status}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Notes */}
          {job.notes && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Notes</h3>
              <p className="text-sm">{job.notes}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Job Status</h3>
            <StatusBadge status={getStatusColor(job.status)} className="text-base px-4 py-2">
              {job.status}
            </StatusBadge>

            {job.bay && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Bay</p>
                <p className="font-medium">{job.bay.name}</p>
              </div>
            )}

            {job.assigned_staff && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Assigned To</p>
                <p className="font-medium">{job.assigned_staff.name}</p>
              </div>
            )}

            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => setIsAssignDialogOpen(true)}
            >
              <UserCog className="h-4 w-4 mr-2" />
              {job.assigned_staff_id ? 'Reassign Staff' : 'Assign Staff'}
            </Button>
          </Card>

          {/* Payment Summary */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(job.total_amount)}</span>
              </div>
              {job.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">
                    -{formatCurrency(job.discount_amount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT (16%)</span>
                <span>{formatCurrency(job.tax_amount ?? 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(job.total_amount)}</span>
              </div>

              
            </div>

            {job.status === 'completed' && (
              <Button
                className="w-full mt-4"
                onClick={() => router.push(`/pos?job=${job.id}`)}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Process Payment
              </Button>
            )}
          </Card>

          {/* Commission */}
          {job.assigned_staff_id && job.status === 'completed' && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Commission</h3>
              <Button
                className="w-full"
                variant="outline"
                onClick={handleCalculateCommission}
                disabled={calculateCommissionMutation.isPending}
              >
                {calculateCommissionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Calculate Commission
              </Button>
            </Card>
          )}

          {/* Timeline */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Timeline</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(job.created_at)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Assign Staff Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Staff Member</Label>
              <SimpleSelect
                value={selectedStaff}
                onValueChange={setSelectedStaff}
                options={[
                  { value: '', label: 'Select staff...' },
                  ...activeStaff.map((s: any) => ({
                    value: s.id,
                    label: `${s.name} (${s.role})`,
                  })),
                ]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignStaff}
              disabled={!selectedStaff || assignStaffMutation.isPending}
            >
              {assignStaffMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Note</Label>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="Enter note..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateJobMutation.mutate({ notes: noteText });
                setIsNoteDialogOpen(false);
              }}
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
