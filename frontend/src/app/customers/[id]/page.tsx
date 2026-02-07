'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { PageHeader, PageContainer } from '@/components/layout/PageHeader';
import {
  Button,
  Card,
  Badge,
  StatusBadge,
  Dialog,
  Input,
  SimpleSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner,
  Label,
  Textarea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  StatCard,
} from '@/components/ui';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Car,
  Star,
  CreditCard,
  Calendar,
  Edit,
  Trash2,
  Plus,
  Gift,
  History,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send,
  FileText,
  Award,
  DollarSign,
  MapPin,
} from 'lucide-react';

interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  totalSpent: number;
  totalVisits: number;
  averageSpend: number;
  lastVisit?: string;
  createdAt: string;
  notes?: string;
  tags: string[];

  vehicles: {
    id: string;
    plate: string;
    make: string;
    model: string;
    color: string;
    type: string;
    lastWash?: string;
    totalWashes: number;
  }[];

  recentJobs: {
    id: string;
    jobNumber: string;
    date: string;
    vehiclePlate: string;
    services: string[];
    total: number;
    status: string;
    paymentStatus: string;
  }[];

  subscriptions: {
    id: string;
    planName: string;
    vehiclePlate: string;
    startDate: string;
    endDate: string;
    status: string;
    washesUsed: number;
    washLimit: number | null;
  }[];

  loyaltyHistory: {
    id: string;
    type: 'earn' | 'redeem' | 'bonus' | 'expire';
    points: number;
    balance: number;
    description: string;
    date: string;
  }[];
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [isPointsDialogOpen, setIsPointsDialogOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const [vehicleForm, setVehicleForm] = useState({
    plate: '',
    make: '',
    model: '',
    color: '',
    type: 'saloon',
  });

  const [pointsForm, setPointsForm] = useState({
    type: 'add',
    points: '',
    reason: '',
  });

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const fetchCustomer = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock customer detail
      setCustomer({
        id: customerId,
        name: 'John Kamau',
        phone: '+254 712 345 678',
        email: 'john.kamau@email.com',
        address: 'Westlands, Nairobi',
        loyaltyPoints: 1245,
        loyaltyTier: 'Gold',
        totalSpent: 156500,
        totalVisits: 28,
        averageSpend: 5589,
        lastVisit: '2024-02-18T14:30:00Z',
        createdAt: '2023-06-15T10:00:00Z',
        notes: 'Prefers full service wash. VIP customer.',
        tags: ['VIP', 'Fleet', 'Corporate'],
        vehicles: [
          {
            id: 'v1',
            plate: 'KDA 123A',
            make: 'Toyota',
            model: 'Camry',
            color: 'Silver',
            type: 'saloon',
            lastWash: '2024-02-18T14:30:00Z',
            totalWashes: 18,
          },
          {
            id: 'v2',
            plate: 'KCA 456B',
            make: 'Honda',
            model: 'CR-V',
            color: 'Black',
            type: 'suv',
            lastWash: '2024-02-10T11:00:00Z',
            totalWashes: 10,
          },
        ],
        recentJobs: [
          {
            id: 'j1',
            jobNumber: 'J-2024-0156',
            date: '2024-02-18T14:30:00Z',
            vehiclePlate: 'KDA 123A',
            services: ['Full Service Wash', 'Interior Vacuum'],
            total: 1500,
            status: 'in_progress',
            paymentStatus: 'unpaid',
          },
          {
            id: 'j2',
            jobNumber: 'J-2024-0142',
            date: '2024-02-10T11:00:00Z',
            vehiclePlate: 'KCA 456B',
            services: ['Premium Wash', 'Engine Clean'],
            total: 2800,
            status: 'completed',
            paymentStatus: 'paid',
          },
          {
            id: 'j3',
            jobNumber: 'J-2024-0128',
            date: '2024-02-03T09:30:00Z',
            vehiclePlate: 'KDA 123A',
            services: ['Full Service Wash'],
            total: 1200,
            status: 'completed',
            paymentStatus: 'paid',
          },
        ],
        subscriptions: [
          {
            id: 's1',
            planName: 'Premium Monthly',
            vehiclePlate: 'KDA 123A',
            startDate: '2024-02-01T00:00:00Z',
            endDate: '2024-03-01T00:00:00Z',
            status: 'active',
            washesUsed: 6,
            washLimit: null,
          },
        ],
        loyaltyHistory: [
          {
            id: 'l1',
            type: 'earn',
            points: 45,
            balance: 1245,
            description: 'Points earned from Job #J-2024-0156',
            date: '2024-02-18T14:30:00Z',
          },
          {
            id: 'l2',
            type: 'earn',
            points: 84,
            balance: 1200,
            description: 'Points earned from Job #J-2024-0142',
            date: '2024-02-10T11:00:00Z',
          },
          {
            id: 'l3',
            type: 'redeem',
            points: -200,
            balance: 1116,
            description: 'Redeemed for discount',
            date: '2024-02-05T15:00:00Z',
          },
          {
            id: 'l4',
            type: 'bonus',
            points: 500,
            balance: 1316,
            description: 'Welcome bonus for Gold tier upgrade',
            date: '2024-01-15T10:00:00Z',
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCustomer = async () => {
    try {
      // API call would go here
      setIsEditDialogOpen(false);
      fetchCustomer();
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  const handleAddVehicle = async () => {
    try {
      // API call would go here
      setIsVehicleDialogOpen(false);
      setVehicleForm({ plate: '', make: '', model: '', color: '', type: 'saloon' });
      fetchCustomer();
    } catch (error) {
      console.error('Error adding vehicle:', error);
    }
  };

  const handleAdjustPoints = async () => {
    try {
      // API call would go here
      setIsPointsDialogOpen(false);
      setPointsForm({ type: 'add', points: '', reason: '' });
      fetchCustomer();
    } catch (error) {
      console.error('Error adjusting points:', error);
    }
  };

  const openEditDialog = () => {
    if (customer) {
      setEditForm({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        notes: customer.notes || '',
      });
      setIsEditDialogOpen(true);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'bronze':
        return 'bg-amber-100 text-amber-800';
      case 'silver':
        return 'bg-gray-100 text-gray-800';
      case 'gold':
        return 'bg-yellow-100 text-yellow-800';
      case 'platinum':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPointsColor = (type: string) => {
    switch (type) {
      case 'earn':
        return 'text-success';
      case 'redeem':
        return 'text-primary';
      case 'bonus':
        return 'text-warning';
      case 'expire':
        return 'text-destructive';
      default:
        return '';
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

  if (!customer) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center h-96">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Customer Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The customer you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => router.push('/customers')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
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
          title={customer.name}
          description={`Customer since ${formatDate(customer.createdAt)}`}
          backLink="/customers"
        >
          <Button variant="outline" size="sm">
            <Send className="h-4 w-4 mr-2" />
            Send SMS
          </Button>
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button size="sm" onClick={() => router.push(`/check-in?customer=${customer.id}`)}>
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
        </PageHeader>

        {/* Customer Header Card */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar & Basic Info */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">{customer.name}</h2>
                  <Badge className={getTierColor(customer.loyaltyTier)}>
                    <Award className="h-3 w-3 mr-1" />
                    {customer.loyaltyTier}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {customer.email}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 md:ml-auto">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {customer.loyaltyPoints.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Loyalty Points</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{customer.totalVisits}</div>
                <div className="text-xs text-muted-foreground">Total Visits</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{formatCurrency(customer.totalSpent)}</div>
                <div className="text-xs text-muted-foreground">Total Spent</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{formatCurrency(customer.averageSpend)}</div>
                <div className="text-xs text-muted-foreground">Avg. Spend</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vehicles">
              Vehicles ({customer.vehicles.length})
            </TabsTrigger>
            <TabsTrigger value="jobs">Job History</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Recent Jobs</h3>
                    <Button variant="link" size="sm" onClick={() => setActiveTab('jobs')}>
                      View All
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {customer.recentJobs.slice(0, 3).map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => router.push(`/jobs/${job.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Car className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium">{job.jobNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {job.vehiclePlate} • {formatDate(job.date)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(job.total)}</div>
                          <StatusBadge
                            status={
                              job.status === 'completed'
                                ? 'success'
                                : job.status === 'in_progress'
                                ? 'primary'
                                : 'warning'
                            }
                          >
                            {job.status.replace('_', ' ')}
                          </StatusBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Vehicles Summary */}
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Vehicles</h3>
                    <Button size="sm" onClick={() => setIsVehicleDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Vehicle
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customer.vehicles.map((vehicle) => (
                      <div key={vehicle.id} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <Car className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="font-mono font-medium">{vehicle.plate}</div>
                            <div className="text-sm text-muted-foreground">
                              {vehicle.make} {vehicle.model} • {vehicle.color}
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {vehicle.type}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {vehicle.totalWashes} washes • Last: {vehicle.lastWash ? formatDate(vehicle.lastWash) : 'Never'}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Loyalty Card */}
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Loyalty
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setIsPointsDialogOpen(true)}>
                      Adjust
                    </Button>
                  </div>
                  <div className="text-center py-4">
                    <div className="text-4xl font-bold text-primary mb-1">
                      {customer.loyaltyPoints.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Available Points</div>
                    <Badge className={cn('mt-2', getTierColor(customer.loyaltyTier))}>
                      <Award className="h-3 w-3 mr-1" />
                      {customer.loyaltyTier} Member
                    </Badge>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">
                    Points can be redeemed for discounts
                  </div>
                </Card>

                {/* Contact Info */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Member since {formatDate(customer.createdAt)}</span>
                    </div>
                  </div>
                </Card>

                {/* Notes */}
                {customer.notes && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground">{customer.notes}</p>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Vehicles Tab */}
          <TabsContent value="vehicles">
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Registered Vehicles</h3>
                <Button size="sm" onClick={() => setIsVehicleDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plate Number</TableHead>
                    <TableHead>Make & Model</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Total Washes</TableHead>
                    <TableHead>Last Wash</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-mono font-medium">{vehicle.plate}</TableCell>
                      <TableCell>{vehicle.make} {vehicle.model}</TableCell>
                      <TableCell>{vehicle.color}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{vehicle.type}</Badge>
                      </TableCell>
                      <TableCell>{vehicle.totalWashes}</TableCell>
                      <TableCell>
                        {vehicle.lastWash ? formatDate(vehicle.lastWash) : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Job History</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.recentJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.jobNumber}</TableCell>
                      <TableCell>{formatDate(job.date)}</TableCell>
                      <TableCell className="font-mono">{job.vehiclePlate}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm">
                          {job.services.join(', ')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(job.total)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={
                            job.status === 'completed'
                              ? 'success'
                              : job.status === 'in_progress'
                              ? 'primary'
                              : 'warning'
                          }
                        >
                          {job.status.replace('_', ' ')}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={
                            job.paymentStatus === 'paid' ? 'success' : 'destructive'
                          }
                        >
                          {job.paymentStatus}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/jobs/${job.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Active Subscriptions</h3>
              {customer.subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active subscriptions
                </div>
              ) : (
                <div className="space-y-4">
                  {customer.subscriptions.map((sub) => (
                    <div key={sub.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold">{sub.planName}</h4>
                          <div className="text-sm text-muted-foreground">
                            Vehicle: {sub.vehiclePlate}
                          </div>
                        </div>
                        <StatusBadge
                          status={sub.status === 'active' ? 'success' : 'secondary'}
                        >
                          {sub.status}
                        </StatusBadge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Period</div>
                          <div>
                            {formatDate(sub.startDate)} - {formatDate(sub.endDate)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Usage</div>
                          <div>
                            {sub.washesUsed} {sub.washLimit ? `/ ${sub.washLimit}` : ''} washes
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Limit</div>
                          <div>{sub.washLimit ? `${sub.washLimit} washes` : 'Unlimited'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Loyalty Tab */}
          <TabsContent value="loyalty">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Points History</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.loyaltyHistory.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{formatDate(entry.date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {entry.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{entry.description}</TableCell>
                          <TableCell className={cn('text-right font-medium', getPointsColor(entry.type))}>
                            {entry.points > 0 ? '+' : ''}
                            {entry.points}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.balance.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              <div>
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Loyalty Status</h3>
                  <div className="text-center py-4">
                    <div className="h-20 w-20 mx-auto rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                      <Award className="h-10 w-10 text-yellow-600" />
                    </div>
                    <Badge className={cn('text-lg px-4 py-1', getTierColor(customer.loyaltyTier))}>
                      {customer.loyaltyTier} Member
                    </Badge>
                    <div className="mt-4 text-4xl font-bold text-primary">
                      {customer.loyaltyPoints.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Available Points</div>
                  </div>
                  <div className="mt-4 pt-4 border-t text-sm">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Points Earned</span>
                      <span className="font-medium text-success">
                        +{customer.loyaltyHistory
                          .filter((h) => h.points > 0)
                          .reduce((sum, h) => sum + h.points, 0)
                          .toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Points Redeemed</span>
                      <span className="font-medium text-primary">
                        {customer.loyaltyHistory
                          .filter((h) => h.points < 0)
                          .reduce((sum, h) => sum + h.points, 0)
                          .toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setIsPointsDialogOpen(true)}
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Adjust Points
                  </Button>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Customer Dialog */}
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          title="Edit Customer"
        >
          <div className="space-y-4">
            <div>
              <Label required>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label required>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditCustomer}>Save Changes</Button>
            </div>
          </div>
        </Dialog>

        {/* Add Vehicle Dialog */}
        <Dialog
          open={isVehicleDialogOpen}
          onOpenChange={setIsVehicleDialogOpen}
          title="Add Vehicle"
        >
          <div className="space-y-4">
            <div>
              <Label required>Plate Number</Label>
              <Input
                placeholder="e.g., KDA 123A"
                value={vehicleForm.plate}
                onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Make</Label>
                <Input
                  placeholder="e.g., Toyota"
                  value={vehicleForm.make}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                />
              </div>
              <div>
                <Label required>Model</Label>
                <Input
                  placeholder="e.g., Camry"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Color</Label>
                <Input
                  placeholder="e.g., Silver"
                  value={vehicleForm.color}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                />
              </div>
              <div>
                <Label required>Type</Label>
                <SimpleSelect
                  value={vehicleForm.type}
                  onValueChange={(value) => setVehicleForm({ ...vehicleForm, type: value })}
                  options={[
                    { value: 'saloon', label: 'Saloon' },
                    { value: 'suv', label: 'SUV' },
                    { value: 'pickup', label: 'Pickup' },
                    { value: 'van', label: 'Van' },
                    { value: 'motorcycle', label: 'Motorcycle' },
                    { value: 'truck', label: 'Truck' },
                    { value: 'trailer', label: 'Trailer' },
                  ]}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsVehicleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddVehicle}>Add Vehicle</Button>
            </div>
          </div>
        </Dialog>

        {/* Adjust Points Dialog */}
        <Dialog
          open={isPointsDialogOpen}
          onOpenChange={setIsPointsDialogOpen}
          title="Adjust Loyalty Points"
        >
          <div className="space-y-4">
            <div className="text-center py-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Current Balance</div>
              <div className="text-3xl font-bold">{customer.loyaltyPoints.toLocaleString()} pts</div>
            </div>
            <div>
              <Label required>Action</Label>
              <SimpleSelect
                value={pointsForm.type}
                onValueChange={(value) => setPointsForm({ ...pointsForm, type: value })}
                options={[
                  { value: 'add', label: 'Add Points' },
                  { value: 'remove', label: 'Remove Points' },
                ]}
              />
            </div>
            <div>
              <Label required>Points</Label>
              <Input
                type="number"
                placeholder="Enter points"
                value={pointsForm.points}
                onChange={(e) => setPointsForm({ ...pointsForm, points: e.target.value })}
              />
            </div>
            <div>
              <Label required>Reason</Label>
              <Textarea
                placeholder="Reason for adjustment..."
                value={pointsForm.reason}
                onChange={(e) => setPointsForm({ ...pointsForm, reason: e.target.value })}
                rows={2}
              />
            </div>
            {pointsForm.points && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="flex justify-between">
                  <span>New Balance</span>
                  <span className="font-bold">
                    {(
                      customer.loyaltyPoints +
                      (pointsForm.type === 'add' ? 1 : -1) * parseInt(pointsForm.points || '0')
                    ).toLocaleString()}{' '}
                    pts
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsPointsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAdjustPoints}
                disabled={!pointsForm.points || !pointsForm.reason}
              >
                Confirm Adjustment
              </Button>
            </div>
          </div>
        </Dialog>
      </PageContainer>
    </MainLayout>
  );
}
