'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '@/lib/api';
import { PageHeader, PageContainer } from '@/components/layout/PageHeader';
import {
  Button,
  SearchInput,
  Card,
  StatCard,
  Badge,
  StatusBadge,
  Dialog,
  SimpleSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Label,
  Textarea,
  Input,
  LabeledSwitch,
} from '@/components/ui';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  Plus,
  Download,
  Gift,
  CreditCard,
  Users,
  Calendar,
  Star,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Award,
  Percent,
  Car,
  History,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    vehicle_type: 'saloon',
    price: '',
    duration_days: '30',
    wash_limit: '',
    features: '',
    is_active: true,
  });

  // Fetch subscription plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptionsApi.getPlans({ limit: 100 }),
  });

  // Fetch active subscriptions
  const { data: subscriptionsData, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['subscriptions', statusFilter],
    queryFn: () => subscriptionsApi.getAll({
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 100,
    }),
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: (data: any) => subscriptionsApi.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Plan created successfully');
      setIsPlanDialogOpen(false);
      resetPlanForm();
    },
    onError: () => {
      toast.error('Failed to create plan');
    },
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      subscriptionsApi.updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Plan updated successfully');
      setIsPlanDialogOpen(false);
      setSelectedPlan(null);
      resetPlanForm();
    },
    onError: () => {
      toast.error('Failed to update plan');
    },
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => subscriptionsApi.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Plan deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete plan');
    },
  });

  const plans = plansData?.data || [];
  const subscriptions = subscriptionsData?.data || [];

  const handleSavePlan = () => {
    const data = {
      name: planForm.name,
      description: planForm.description,
      vehicle_type: planForm.vehicle_type,
      price: parseFloat(planForm.price),
      duration_days: parseInt(planForm.duration_days),
      wash_limit: planForm.wash_limit ? parseInt(planForm.wash_limit) : null,
      features: planForm.features.split('\n').filter(f => f.trim()),
      is_active: planForm.is_active,
    };

    if (selectedPlan) {
      updatePlanMutation.mutate({ id: selectedPlan.id, data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const resetPlanForm = () => {
    setPlanForm({
      name: '',
      description: '',
      vehicle_type: 'saloon',
      price: '',
      duration_days: '30',
      wash_limit: '',
      features: '',
      is_active: true,
    });
  };

  const openEditPlan = (plan: any) => {
    setSelectedPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description || '',
      vehicle_type: plan.vehicle_type,
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      wash_limit: plan.wash_limit?.toString() || '',
      features: (plan.features || []).join('\n'),
      is_active: plan.is_active,
    });
    setIsPlanDialogOpen(true);
  };

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'expired':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      case 'suspended':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub: any) => {
    const matchesSearch =
      sub.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.vehicle?.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.plan?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Calculate stats
  const stats = {
    activeSubscriptions: subscriptions.filter((s: any) => s.status === 'active').length,
    totalRevenue: subscriptions.reduce((sum: number, s: any) => sum + (s.amount_paid || 0), 0),
    expiringThisWeek: subscriptions.filter((s: any) => {
      if (s.status !== 'active') return false;
      const endDate = new Date(s.end_date);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return endDate <= weekFromNow && endDate >= new Date();
    }).length,
  };

  return (
    <PageContainer>
      <PageHeader
        title="Subscriptions & Loyalty"
        description="Manage subscription plans and customer subscriptions"
      >
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button size="sm" onClick={() => setIsPlanDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Plan
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions}
          icon={<CreditCard className="h-5 w-5" />}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Expiring This Week"
          value={stats.expiringThisWeek}
          icon={<AlertTriangle className="h-5 w-5" />}
          className="border-warning/50"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">
            <CreditCard className="h-4 w-4 mr-2" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="plans">
            <Calendar className="h-4 w-4 mr-2" />
            Plans
          </TabsTrigger>
        </TabsList>

        {/* Customer Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <SearchInput
                placeholder="Search by customer, plate, or plan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <SimpleSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'expired', label: 'Expired' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                className="w-40"
              />
            </div>

            {subscriptionsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <TableEmpty message="No subscriptions found" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubscriptions.map((sub: any) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{sub.customer?.name || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">
                                {sub.customer?.phone || ''}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono">
                                {sub.vehicle?.registration_number || 'N/A'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{sub.plan?.name || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{formatDate(sub.start_date)}</div>
                              <div className="text-muted-foreground">
                                to {formatDate(sub.end_date)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {sub.wash_limit ? (
                              <div className="text-sm">
                                <span className="font-medium">{sub.washes_used || 0}</span>
                                <span className="text-muted-foreground">/{sub.wash_limit}</span>
                              </div>
                            ) : (
                              <div className="text-sm">
                                <span className="font-medium">{sub.washes_used || 0}</span>
                                <span className="text-muted-foreground"> (unlimited)</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={getSubscriptionStatusColor(sub.status)}>
                              {sub.status}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Subscription Plans Tab */}
        <TabsContent value="plans">
          {plansLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan: any) => (
                <Card key={plan.id} className={cn('p-6', !plan.is_active && 'opacity-60')}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                    <Badge variant={plan.is_active ? 'success' : 'secondary'}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="mb-4">
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(plan.price)}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{plan.duration_days} days
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{plan.vehicle_type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {plan.wash_limit ? `${plan.wash_limit} washes` : 'Unlimited'}
                      </span>
                    </div>
                  </div>

                  {plan.features && plan.features.length > 0 && (
                    <div className="border-t pt-4 mb-4">
                      <h4 className="text-sm font-medium mb-2">Features</h4>
                      <ul className="space-y-1">
                        {plan.features.map((feature: string, index: number) => (
                          <li
                            key={index}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <CheckCircle className="h-3 w-3 text-success flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditPlan(plan)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this plan?')) {
                          deletePlanMutation.mutate(plan.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              {plans.length === 0 && (
                <div className="col-span-3 text-center py-8 text-muted-foreground">
                  No subscription plans yet
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Plan Dialog */}
      <Dialog
        open={isPlanDialogOpen}
        onOpenChange={(open) => {
          setIsPlanDialogOpen(open);
          if (!open) {
            setSelectedPlan(null);
            resetPlanForm();
          }
        }}
        title={selectedPlan ? 'Edit Plan' : 'Create Plan'}
      >
        <div className="space-y-4">
          <div>
            <Label required>Plan Name</Label>
            <Input
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              placeholder="e.g., Premium Monthly"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Vehicle Type</Label>
              <SimpleSelect
                value={planForm.vehicle_type}
                onValueChange={(value) => setPlanForm({ ...planForm, vehicle_type: value })}
                options={[
                  { value: 'saloon', label: 'Saloon' },
                  { value: 'suv', label: 'SUV' },
                  { value: 'pickup', label: 'Pickup' },
                  { value: 'van', label: 'Van' },
                ]}
              />
            </div>

            <div>
              <Label required>Price (KES)</Label>
              <Input
                type="number"
                value={planForm.price}
                onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Duration (days)</Label>
              <Input
                type="number"
                value={planForm.duration_days}
                onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })}
              />
            </div>

            <div>
              <Label>Wash Limit</Label>
              <Input
                type="number"
                value={planForm.wash_limit}
                onChange={(e) => setPlanForm({ ...planForm, wash_limit: e.target.value })}
                placeholder="Empty = unlimited"
              />
            </div>
          </div>

          <div>
            <Label>Features (one per line)</Label>
            <Textarea
              value={planForm.features}
              onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
              rows={4}
              placeholder="Priority queue\n10% off extras"
            />
          </div>

          <LabeledSwitch
            label="Active"
            description="Plan is available for purchase"
            checked={planForm.is_active}
            onCheckedChange={(checked) => setPlanForm({ ...planForm, is_active: checked })}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePlan}
              disabled={!planForm.name || !planForm.price || !planForm.duration_days}
            >
              {selectedPlan ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Dialog>
    </PageContainer>
  );
}
