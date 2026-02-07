/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, vehiclesApi, jobsApi } from '@/lib/api';
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
} from '@/components/ui';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Car,
  Star,
  Calendar,
  Edit,
  Trash2,
  Plus,
  Gift,
  Send,
  Award,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const customerId = params.id as string;

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

  const [vehicleForm, setVehicleForm] = useState<{
    registration_number: string;
    make: string;
    model: string;
    color: string;
    vehicle_type: string;
  }>({
    registration_number: '',
    make: '',
    model: '',
    color: '',
    vehicle_type: 'saloon',
  });

  const [pointsForm, setPointsForm] = useState({
    type: 'add',
    points: '',
    reason: '',
  });

  // Fetch customer data
  const { data: customerData, isLoading, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersApi.getById(customerId),
  });

  // Fetch customer job history
  const { data: jobsData } = useQuery({
    queryKey: ['customer-jobs', customerId],
    queryFn: () => customersApi.getHistory(customerId, { limit: 50 }),
    enabled: !!customerId,
  });

  // Update customer mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<typeof editForm>) =>
      customersApi.update(customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      toast.success('Customer updated successfully');
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to update customer');
    },
  });

  // Add vehicle mutation
  const addVehicleMutation = useMutation({
    mutationFn: (data: typeof vehicleForm) =>
      vehiclesApi.create({
        ...data,
        customer_id: customerId,
      } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      toast.success('Vehicle added successfully');
      setIsVehicleDialogOpen(false);
      setVehicleForm({
        registration_number: '',
        make: '',
        model: '',
        color: '',
        vehicle_type: 'saloon',
      });
    },
    onError: () => {
      toast.error('Failed to add vehicle');
    },
  });

  // Adjust loyalty points mutation
  const adjustPointsMutation = useMutation({
    mutationFn: () => {
      const points = parseInt(pointsForm.points);
      const finalPoints = pointsForm.type === 'add' ? points : -points;
      return customersApi.addLoyaltyPoints(customerId, finalPoints, pointsForm.reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      toast.success('Loyalty points adjusted successfully');
      setIsPointsDialogOpen(false);
      setPointsForm({ type: 'add', points: '', reason: '' });
    },
    onError: () => {
      toast.error('Failed to adjust loyalty points');
    },
  });

  const customer = customerData?.data;
  const jobs = jobsData?.data || [];

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
    switch (tier?.toLowerCase()) {
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

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (error || !customer) {
    return (
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
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={customer.name}
        description={`Customer since ${formatDate(customer.created_at)}`}
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
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{customer.name}</h2>
                {customer.loyalty_tier && customer.loyalty_tier.length > 0 && customer.loyalty_tier.length > 0 && (
                  <Badge className={getTierColor(customer.loyalty_tier)}>
                    <Award className="h-3 w-3 mr-1" />
                    {customer.loyalty_tier}
                  </Badge>
                )}
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

          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 md:ml-auto">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {customer.loyalty_points?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-muted-foreground">Loyalty Points</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{customer.total_visits || 0}</div>
              <div className="text-xs text-muted-foreground">Total Visits</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {formatCurrency(customer.total_spent || 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Spent</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {formatCurrency(
                  customer.total_visits > 0
                    ? (customer.total_spent || 0) / customer.total_visits
                    : 0
                )}
              </div>
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
            Vehicles ({customer.vehicles?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="jobs">Job History</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Jobs */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Recent Jobs</h3>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setActiveTab('jobs')}
                  >
                    View All
                  </Button>
                </div>
                <div className="space-y-3">
                  {jobs.slice(0, 5).map((job) => (
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
                          <div className="font-medium">{job.job_no}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(job.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(job.final_amount)}
                        </div>
                        <StatusBadge status={job.status === 'completed' ? 'success' : 'warning'}>
                          {job.status}
                        </StatusBadge>
                      </div>
                    </div>
                  ))}
                  {jobs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No jobs yet
                    </div>
                  )}
                </div>
              </Card>

              {/* Vehicles */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Vehicles</h3>
                  <Button size="sm" onClick={() => setIsVehicleDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Vehicle
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {customer.vehicles?.map((vehicle) => (
                    <div key={vehicle.id} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Car className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-mono font-medium">
                            {vehicle.registration_number}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {vehicle.make} {vehicle.model}
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {vehicle.vehicle_type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {(!customer.vehicles || customer.vehicles.length === 0) && (
                    <div className="col-span-2 text-center py-8 text-muted-foreground">
                      No vehicles registered
                    </div>
                  )}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPointsDialogOpen(true)}
                  >
                    Adjust
                  </Button>
                </div>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-primary mb-1">
                    {customer.loyalty_points?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Available Points</div>
                  {customer.loyalty_tier && customer.loyalty_tier.length > 0 && customer.loyalty_tier.length > 0 && (
                    <Badge className={cn('mt-2', getTierColor(customer.loyalty_tier))}>
                      <Award className="h-3 w-3 mr-1" />
                      {customer.loyalty_tier} Member
                    </Badge>
                  )}
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
                    <span>Member since {formatDate(customer.created_at)}</span>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.vehicles?.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-mono font-medium">
                      {vehicle.registration_number}
                    </TableCell>
                    <TableCell>
                      {vehicle.make} {vehicle.model}
                    </TableCell>
                    <TableCell>{vehicle.color || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {vehicle.vehicle_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!customer.vehicles || customer.vehicles.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No vehicles registered
                    </TableCell>
                  </TableRow>
                )}
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
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.job_no}</TableCell>
                    <TableCell>{formatDate(job.created_at)}</TableCell>
                    <TableCell className="font-mono">
                      {job.vehicle?.registration_no || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(job.final_amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status === 'completed' ? 'success' : 'warning'}>
                        {job.status}
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
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No jobs yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Loyalty Tab */}
        <TabsContent value="loyalty">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Loyalty Status</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPointsDialogOpen(true)}
              >
                <Gift className="h-4 w-4 mr-2" />
                Adjust Points
              </Button>
            </div>
            <div className="text-center py-8">
              <div className="h-20 w-20 mx-auto rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                <Award className="h-10 w-10 text-yellow-600" />
              </div>
              {customer.loyalty_tier && customer.loyalty_tier.length > 0 && customer.loyalty_tier.length > 0 && (
                <Badge className={cn('text-lg px-4 py-1', getTierColor(customer.loyalty_tier))}>
                  {customer.loyalty_tier} Member
                </Badge>
              )}
              <div className="mt-4 text-4xl font-bold text-primary">
                {customer.loyalty_points?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-muted-foreground">Available Points</div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} title="Edit Customer">
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
            <Button onClick={() => updateMutation.mutate(editForm)}>Save Changes</Button>
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
              value={vehicleForm.registration_number}
              onChange={(e) =>
                setVehicleForm({
                  ...vehicleForm,
                  registration_number: e.target.value.toUpperCase(),
                })
              }
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
                value={vehicleForm.vehicle_type}
                onValueChange={(value) =>
                  setVehicleForm({ ...vehicleForm, vehicle_type: value })
                }
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
            <Button onClick={() => addVehicleMutation.mutate(vehicleForm)}>
              Add Vehicle
            </Button>
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
            <div className="text-3xl font-bold">
              {customer.loyalty_points?.toLocaleString() || 0} pts
            </div>
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
                    (customer.loyalty_points || 0) +
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
              onClick={() => adjustPointsMutation.mutate()}
              disabled={!pointsForm.points || !pointsForm.reason}
            >
              Confirm Adjustment
            </Button>
          </div>
        </div>
      </Dialog>
    </PageContainer>
  );
}
