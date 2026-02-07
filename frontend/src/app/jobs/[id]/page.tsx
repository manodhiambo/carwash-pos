'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { PageHeader, PageContainer, Section } from '@/components/layout/PageHeader';
import {
  Button,
  Card,
  Badge,
  StatusBadge,
  Dialog,
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
  MapPin,
  CreditCard,
  CheckCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Printer,
  MessageSquare,
  History,
  Wrench,
  DollarSign,
  Calendar,
  Timer,
  FileText,
  Send,
} from 'lucide-react';

interface JobDetail {
  id: string;
  jobNumber: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';

  // Vehicle info
  vehicle: {
    id: string;
    plate: string;
    make: string;
    model: string;
    color: string;
    type: string;
  };

  // Customer info
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    loyaltyPoints: number;
    totalVisits: number;
  } | null;

  // Services
  services: {
    id: string;
    name: string;
    price: number;
    duration: number;
    status: 'pending' | 'in_progress' | 'completed';
    assignedTo?: string;
  }[];

  // Bay
  bay: {
    id: string;
    name: string;
    status: string;
  } | null;

  // Attendant
  attendant: {
    id: string;
    name: string;
  } | null;

  // Pricing
  subtotal: number;
  discount: number;
  discountType?: 'percentage' | 'fixed';
  discountReason?: string;
  tax: number;
  total: number;

  // Payment
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  amountPaid: number;
  payments: {
    id: string;
    amount: number;
    method: string;
    reference?: string;
    createdAt: string;
  }[];

  // Timeline
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletion?: string;

  // Notes
  notes?: string;
  internalNotes?: string;

  // History
  history: {
    id: string;
    action: string;
    description: string;
    user: string;
    createdAt: string;
  }[];
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock job detail
      setJob({
        id: jobId,
        jobNumber: 'J-2024-0156',
        status: 'in_progress',
        priority: 'normal',
        vehicle: {
          id: 'v1',
          plate: 'KDA 123A',
          make: 'Toyota',
          model: 'Camry',
          color: 'Silver',
          type: 'saloon',
        },
        customer: {
          id: 'c1',
          name: 'John Kamau',
          phone: '+254 712 345 678',
          email: 'john.kamau@email.com',
          loyaltyPoints: 1245,
          totalVisits: 28,
        },
        services: [
          {
            id: 's1',
            name: 'Full Service Wash',
            price: 1200,
            duration: 45,
            status: 'completed',
            assignedTo: 'Peter Ochieng',
          },
          {
            id: 's2',
            name: 'Interior Vacuum',
            price: 300,
            duration: 15,
            status: 'in_progress',
            assignedTo: 'Peter Ochieng',
          },
          {
            id: 's3',
            name: 'Dashboard Polish',
            price: 200,
            duration: 10,
            status: 'pending',
          },
        ],
        bay: {
          id: 'b1',
          name: 'Bay 1',
          status: 'occupied',
        },
        attendant: {
          id: 'u3',
          name: 'Peter Ochieng',
        },
        subtotal: 1700,
        discount: 170,
        discountType: 'percentage',
        discountReason: 'Loyalty discount (10%)',
        tax: 245,
        total: 1775,
        paymentStatus: 'unpaid',
        amountPaid: 0,
        payments: [],
        createdAt: '2024-02-18T14:00:00Z',
        startedAt: '2024-02-18T14:05:00Z',
        estimatedCompletion: '2024-02-18T15:15:00Z',
        notes: 'Customer requested extra attention to floor mats',
        internalNotes: 'Regular customer - premium member',
        history: [
          {
            id: 'h1',
            action: 'Job Created',
            description: 'Job created and assigned to Bay 1',
            user: 'James Mwangi',
            createdAt: '2024-02-18T14:00:00Z',
          },
          {
            id: 'h2',
            action: 'Status Changed',
            description: 'Status changed from Pending to In Progress',
            user: 'Peter Ochieng',
            createdAt: '2024-02-18T14:05:00Z',
          },
          {
            id: 'h3',
            action: 'Service Completed',
            description: 'Full Service Wash completed',
            user: 'Peter Ochieng',
            createdAt: '2024-02-18T14:45:00Z',
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching job:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    try {
      // API call would go here
      setIsStatusDialogOpen(false);
      setStatusNote('');
      fetchJob();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAddNote = async () => {
    try {
      // API call would go here
      setIsNoteDialogOpen(false);
      setNewNote('');
      fetchJob();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'warning';
      case 'normal':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getServiceStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-primary" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center h-96">
            <Spinner size="lg" />
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  if (!job) {
    return (
      <MainLayout>
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
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title={`Job ${job.jobNumber}`}
          description={`Created on ${formatDate(job.createdAt, true)}`}
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
          {job.status !== 'completed' && job.status !== 'cancelled' && (
            <Button size="sm" onClick={() => setIsStatusDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Update Status
            </Button>
          )}
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Banner */}
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <StatusBadge status={getStatusColor(job.status)} className="text-base px-4 py-1">
                    {job.status.replace('_', ' ').toUpperCase()}
                  </StatusBadge>
                  <Badge variant={getPriorityColor(job.priority)}>
                    {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)} Priority
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {job.bay && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.bay.name}
                    </div>
                  )}
                  {job.attendant && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {job.attendant.name}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Vehicle & Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vehicle */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Vehicle Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plate Number</span>
                    <span className="font-mono font-medium">{job.vehicle.plate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Make & Model</span>
                    <span>{job.vehicle.make} {job.vehicle.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Color</span>
                    <span>{job.vehicle.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="outline" className="capitalize">{job.vehicle.type}</Badge>
                  </div>
                </div>
              </Card>

              {/* Customer */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </h3>
                {job.customer ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{job.customer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span>{job.customer.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loyalty Points</span>
                      <Badge variant="secondary">{job.customer.loyaltyPoints} pts</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Visits</span>
                      <span>{job.customer.totalVisits}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Walk-in customer (no details recorded)
                  </div>
                )}
              </Card>
            </div>

            {/* Services */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Services
              </h3>
              <div className="space-y-3">
                {job.services.map((service) => (
                  <div
                    key={service.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      service.status === 'completed' && 'bg-success/5 border-success/20',
                      service.status === 'in_progress' && 'bg-primary/5 border-primary/20'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {getServiceStatusIcon(service.status)}
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {service.duration} mins
                          {service.assignedTo && ` • ${service.assignedTo}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(service.price)}</div>
                      <Badge variant="outline" className="capitalize text-xs">
                        {service.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Notes */}
            {(job.notes || job.internalNotes) && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </h3>
                {job.notes && (
                  <div className="mb-4">
                    <Label className="text-muted-foreground">Customer Notes</Label>
                    <p className="mt-1 p-3 bg-muted rounded-lg">{job.notes}</p>
                  </div>
                )}
                {job.internalNotes && (
                  <div>
                    <Label className="text-muted-foreground">Internal Notes</Label>
                    <p className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                      {job.internalNotes}
                    </p>
                  </div>
                )}
              </Card>
            )}

            {/* History */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <History className="h-5 w-5" />
                Activity History
              </h3>
              <div className="space-y-4">
                {job.history.map((entry, index) => (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      {index < job.history.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{entry.action}</div>
                          <div className="text-sm text-muted-foreground">{entry.description}</div>
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          <div>{formatDate(entry.createdAt, true)}</div>
                          <div>{entry.user}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(job.subtotal)}</span>
                </div>
                {job.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span>-{formatCurrency(job.discount)}</span>
                  </div>
                )}
                {job.discountReason && (
                  <div className="text-xs text-muted-foreground pl-4">
                    {job.discountReason}
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (16%)</span>
                  <span>{formatCurrency(job.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(job.total)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="text-success">{formatCurrency(job.amountPaid)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Balance Due</span>
                  <span className={job.total - job.amountPaid > 0 ? 'text-destructive' : ''}>
                    {formatCurrency(job.total - job.amountPaid)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <StatusBadge
                  status={
                    job.paymentStatus === 'paid'
                      ? 'success'
                      : job.paymentStatus === 'partial'
                      ? 'warning'
                      : 'destructive'
                  }
                  className="w-full justify-center"
                >
                  {job.paymentStatus === 'paid'
                    ? 'Fully Paid'
                    : job.paymentStatus === 'partial'
                    ? 'Partially Paid'
                    : 'Unpaid'}
                </StatusBadge>
              </div>

              {job.paymentStatus !== 'paid' && (
                <Button
                  className="w-full mt-4"
                  onClick={() => router.push(`/pos?job=${job.id}`)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Process Payment
                </Button>
              )}
            </Card>

            {/* Timeline */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Timeline
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-sm">{formatDate(job.createdAt, true)}</span>
                </div>
                {job.startedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span className="text-sm">{formatDate(job.startedAt, true)}</span>
                  </div>
                )}
                {job.estimatedCompletion && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Completion</span>
                    <span className="text-sm">{formatDate(job.estimatedCompletion, true)}</span>
                  </div>
                )}
                {job.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="text-sm">{formatDate(job.completedAt, true)}</span>
                  </div>
                )}
              </div>

              {job.status === 'in_progress' && job.estimatedCompletion && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Time Remaining</div>
                  <div className="text-lg font-semibold">
                    {(() => {
                      const remaining = new Date(job.estimatedCompletion).getTime() - Date.now();
                      if (remaining <= 0) return 'Overdue';
                      const mins = Math.floor(remaining / 60000);
                      return `${mins} minutes`;
                    })()}
                  </div>
                </div>
              )}
            </Card>

            {/* Quick Actions */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {job.customer && (
                  <Button variant="outline" className="w-full justify-start">
                    <Send className="h-4 w-4 mr-2" />
                    Send SMS Notification
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Job Card
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/receipts/${job.id}`)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Receipt
                </Button>
                {job.status !== 'completed' && job.status !== 'cancelled' && (
                  <Button variant="outline" className="w-full justify-start text-destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Job
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Update Status Dialog */}
        <Dialog
          open={isStatusDialogOpen}
          onOpenChange={setIsStatusDialogOpen}
          title="Update Job Status"
        >
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <SimpleSelect
                value={newStatus}
                onValueChange={setNewStatus}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                placeholder="Select new status"
              />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Textarea
                placeholder="Add a note about this status change..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleStatusChange} disabled={!newStatus}>
                Update Status
              </Button>
            </div>
          </div>
        </Dialog>

        {/* Add Note Dialog */}
        <Dialog
          open={isNoteDialogOpen}
          onOpenChange={setIsNoteDialogOpen}
          title="Add Note"
        >
          <div className="space-y-4">
            <div>
              <Label>Note</Label>
              <Textarea
                placeholder="Enter your note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                Add Note
              </Button>
            </div>
          </div>
        </Dialog>
      </PageContainer>
    </MainLayout>
  );
}
