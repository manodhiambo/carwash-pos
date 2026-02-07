'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { PageHeader, PageContainer, Section } from '@/components/layout/PageHeader';
import {
  Button,
  Input,
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
  Switch,
  LabeledSwitch,
} from '@/components/ui';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
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
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Award,
  Percent,
  Car,
  History,
  ChevronRight,
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  vehicleType: string;
  price: number;
  duration: number;
  durationUnit: 'days' | 'weeks' | 'months';
  washLimit: number | null;
  services: string[];
  features: string[];
  isActive: boolean;
  subscriberCount?: number;
  createdAt: string;
}

interface CustomerSubscription {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  planId: string;
  planName: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleType: string;
  startDate: string;
  endDate: string;
  washesUsed: number;
  washLimit: number | null;
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  autoRenew: boolean;
  totalPaid: number;
  createdAt: string;
}

interface LoyaltyTransaction {
  id: string;
  customerId: string;
  customerName: string;
  type: 'earn' | 'redeem' | 'expire' | 'bonus' | 'adjustment';
  points: number;
  balance: number;
  description: string;
  jobId?: string;
  createdAt: string;
}

interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  multiplier: number;
  benefits: string[];
  color: string;
  icon: string;
  memberCount?: number;
}

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Plans state
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    vehicleType: 'saloon',
    price: '',
    duration: '30',
    durationUnit: 'days' as 'days' | 'weeks' | 'months',
    washLimit: '',
    services: [] as string[],
    features: '',
    isActive: true,
  });

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<CustomerSubscription | null>(null);

  // Loyalty state
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTier[]>([]);
  const [isTierDialogOpen, setIsTierDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<LoyaltyTier | null>(null);

  // Stats
  const [stats, setStats] = useState({
    activeSubscriptions: 0,
    totalRevenue: 0,
    expiringThisWeek: 0,
    totalLoyaltyPoints: 0,
    activeMembers: 0,
    pointsRedeemed: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Simulate API calls with mock data
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock subscription plans
      setPlans([
        {
          id: '1',
          name: 'Basic Monthly',
          description: 'Perfect for regular car owners who wash once a week',
          vehicleType: 'saloon',
          price: 2500,
          duration: 30,
          durationUnit: 'days',
          washLimit: 4,
          services: ['exterior-wash', 'interior-vacuum'],
          features: ['Priority queue', '10% off extras'],
          isActive: true,
          subscriberCount: 45,
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          name: 'Premium Monthly',
          description: 'Unlimited washes with full service included',
          vehicleType: 'saloon',
          price: 4500,
          duration: 30,
          durationUnit: 'days',
          washLimit: null,
          services: ['full-service', 'interior-cleaning', 'exterior-polish'],
          features: ['Unlimited washes', 'Priority queue', '20% off extras', 'Free air freshener'],
          isActive: true,
          subscriberCount: 28,
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '3',
          name: 'SUV Premium',
          description: 'Premium package for SUVs and large vehicles',
          vehicleType: 'suv',
          price: 6000,
          duration: 30,
          durationUnit: 'days',
          washLimit: null,
          services: ['full-service', 'engine-cleaning', 'undercarriage-wash'],
          features: ['Unlimited washes', 'Priority queue', '25% off extras'],
          isActive: true,
          subscriberCount: 15,
          createdAt: '2024-02-01T10:00:00Z',
        },
        {
          id: '4',
          name: 'Fleet Basic',
          description: 'Economical option for fleet vehicles',
          vehicleType: 'saloon',
          price: 1800,
          duration: 30,
          durationUnit: 'days',
          washLimit: 8,
          services: ['exterior-wash'],
          features: ['Priority queue'],
          isActive: true,
          subscriberCount: 60,
          createdAt: '2024-02-15T10:00:00Z',
        },
      ]);

      // Mock customer subscriptions
      setSubscriptions([
        {
          id: '1',
          customerId: 'c1',
          customerName: 'John Kamau',
          customerPhone: '+254712345678',
          planId: '2',
          planName: 'Premium Monthly',
          vehicleId: 'v1',
          vehiclePlate: 'KDA 123A',
          vehicleType: 'saloon',
          startDate: '2024-01-20T00:00:00Z',
          endDate: '2024-02-20T00:00:00Z',
          washesUsed: 8,
          washLimit: null,
          status: 'active',
          autoRenew: true,
          totalPaid: 4500,
          createdAt: '2024-01-20T10:00:00Z',
        },
        {
          id: '2',
          customerId: 'c2',
          customerName: 'Mary Wanjiku',
          customerPhone: '+254723456789',
          planId: '1',
          planName: 'Basic Monthly',
          vehicleId: 'v2',
          vehiclePlate: 'KCA 456B',
          vehicleType: 'saloon',
          startDate: '2024-02-01T00:00:00Z',
          endDate: '2024-03-01T00:00:00Z',
          washesUsed: 3,
          washLimit: 4,
          status: 'active',
          autoRenew: false,
          totalPaid: 2500,
          createdAt: '2024-02-01T10:00:00Z',
        },
        {
          id: '3',
          customerId: 'c3',
          customerName: 'Peter Ochieng',
          customerPhone: '+254734567890',
          planId: '3',
          planName: 'SUV Premium',
          vehicleId: 'v3',
          vehiclePlate: 'KDB 789C',
          vehicleType: 'suv',
          startDate: '2024-01-15T00:00:00Z',
          endDate: '2024-02-15T00:00:00Z',
          washesUsed: 12,
          washLimit: null,
          status: 'expired',
          autoRenew: false,
          totalPaid: 6000,
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '4',
          customerId: 'c4',
          customerName: 'Sarah Muthoni',
          customerPhone: '+254745678901',
          planId: '4',
          planName: 'Fleet Basic',
          vehicleId: 'v4',
          vehiclePlate: 'KBZ 012D',
          vehicleType: 'saloon',
          startDate: '2024-02-10T00:00:00Z',
          endDate: '2024-03-10T00:00:00Z',
          washesUsed: 5,
          washLimit: 8,
          status: 'active',
          autoRenew: true,
          totalPaid: 1800,
          createdAt: '2024-02-10T10:00:00Z',
        },
      ]);

      // Mock loyalty transactions
      setLoyaltyTransactions([
        {
          id: '1',
          customerId: 'c1',
          customerName: 'John Kamau',
          type: 'earn',
          points: 45,
          balance: 1245,
          description: 'Points earned from Premium wash',
          jobId: 'j123',
          createdAt: '2024-02-18T14:30:00Z',
        },
        {
          id: '2',
          customerId: 'c2',
          customerName: 'Mary Wanjiku',
          type: 'redeem',
          points: -500,
          balance: 320,
          description: 'Redeemed for free interior cleaning',
          createdAt: '2024-02-17T11:20:00Z',
        },
        {
          id: '3',
          customerId: 'c3',
          customerName: 'Peter Ochieng',
          type: 'bonus',
          points: 200,
          balance: 890,
          description: 'Birthday bonus points',
          createdAt: '2024-02-15T09:00:00Z',
        },
        {
          id: '4',
          customerId: 'c4',
          customerName: 'Sarah Muthoni',
          type: 'earn',
          points: 30,
          balance: 580,
          description: 'Points earned from Basic wash',
          jobId: 'j124',
          createdAt: '2024-02-14T16:45:00Z',
        },
        {
          id: '5',
          customerId: 'c1',
          customerName: 'John Kamau',
          type: 'earn',
          points: 60,
          balance: 1200,
          description: 'Points earned from Full detail',
          jobId: 'j122',
          createdAt: '2024-02-12T10:15:00Z',
        },
      ]);

      // Mock loyalty tiers
      setLoyaltyTiers([
        {
          id: '1',
          name: 'Bronze',
          minPoints: 0,
          maxPoints: 499,
          multiplier: 1,
          benefits: ['1 point per KES 100', 'Birthday bonus'],
          color: 'amber',
          icon: 'medal',
          memberCount: 120,
        },
        {
          id: '2',
          name: 'Silver',
          minPoints: 500,
          maxPoints: 1499,
          multiplier: 1.5,
          benefits: ['1.5x points', 'Birthday bonus', '5% discount on services'],
          color: 'gray',
          icon: 'medal',
          memberCount: 65,
        },
        {
          id: '3',
          name: 'Gold',
          minPoints: 1500,
          maxPoints: 4999,
          multiplier: 2,
          benefits: ['2x points', 'Birthday bonus', '10% discount', 'Priority queue'],
          color: 'yellow',
          icon: 'crown',
          memberCount: 28,
        },
        {
          id: '4',
          name: 'Platinum',
          minPoints: 5000,
          maxPoints: null,
          multiplier: 3,
          benefits: ['3x points', 'Birthday bonus', '15% discount', 'Priority queue', 'Free monthly detail'],
          color: 'purple',
          icon: 'diamond',
          memberCount: 8,
        },
      ]);

      // Mock stats
      setStats({
        activeSubscriptions: 148,
        totalRevenue: 485000,
        expiringThisWeek: 12,
        totalLoyaltyPoints: 125000,
        activeMembers: 221,
        pointsRedeemed: 45000,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlan = async () => {
    try {
      // API call would go here
      setIsPlanDialogOpen(false);
      setSelectedPlan(null);
      resetPlanForm();
      fetchData();
    } catch (error) {
      console.error('Error saving plan:', error);
    }
  };

  const resetPlanForm = () => {
    setPlanForm({
      name: '',
      description: '',
      vehicleType: 'saloon',
      price: '',
      duration: '30',
      durationUnit: 'days',
      washLimit: '',
      services: [],
      features: '',
      isActive: true,
    });
  };

  const openEditPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description,
      vehicleType: plan.vehicleType,
      price: plan.price.toString(),
      duration: plan.duration.toString(),
      durationUnit: plan.durationUnit,
      washLimit: plan.washLimit?.toString() || '',
      services: plan.services,
      features: plan.features.join('\n'),
      isActive: plan.isActive,
    });
    setIsPlanDialogOpen(true);
  };

  const getSubscriptionStatusColor = (status: CustomerSubscription['status']) => {
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

  const getLoyaltyTypeColor = (type: LoyaltyTransaction['type']) => {
    switch (type) {
      case 'earn':
        return 'success';
      case 'redeem':
        return 'primary';
      case 'bonus':
        return 'warning';
      case 'expire':
        return 'destructive';
      case 'adjustment':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getTierColor = (color: string) => {
    switch (color) {
      case 'amber':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'gray':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.planName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Subscriptions & Loyalty"
          description="Manage subscription plans and loyalty programs"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="Active Subscriptions"
            value={stats.activeSubscriptions}
            icon={<CreditCard className="h-5 w-5" />}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Subscription Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Expiring This Week"
            value={stats.expiringThisWeek}
            icon={<AlertTriangle className="h-5 w-5" />}
            className="border-warning/50"
          />
          <StatCard
            title="Total Points Issued"
            value={stats.totalLoyaltyPoints.toLocaleString()}
            icon={<Star className="h-5 w-5" />}
          />
          <StatCard
            title="Loyalty Members"
            value={stats.activeMembers}
            icon={<Users className="h-5 w-5" />}
            trend={{ value: 5, isPositive: true }}
          />
          <StatCard
            title="Points Redeemed"
            value={stats.pointsRedeemed.toLocaleString()}
            icon={<Gift className="h-5 w-5" />}
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
            <TabsTrigger value="loyalty">
              <Star className="h-4 w-4 mr-2" />
              Loyalty Program
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Points History
            </TabsTrigger>
          </TabsList>

          {/* Customer Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card className="p-4">
              {/* Filters */}
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
                    { value: 'suspended', label: 'Suspended' },
                  ]}
                  className="w-40"
                />
              </div>

              {/* Subscriptions Table */}
              {isLoading ? (
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
                        <TableHead>Auto-Renew</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscriptions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8}>
                            <TableEmpty message="No subscriptions found" />
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSubscriptions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{sub.customerName}</div>
                                <div className="text-sm text-muted-foreground">{sub.customerPhone}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono">{sub.vehiclePlate}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{sub.planName}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{formatDate(sub.startDate)}</div>
                                <div className="text-muted-foreground">to {formatDate(sub.endDate)}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {sub.washLimit ? (
                                <div className="text-sm">
                                  <span className="font-medium">{sub.washesUsed}</span>
                                  <span className="text-muted-foreground">/{sub.washLimit} washes</span>
                                </div>
                              ) : (
                                <div className="text-sm">
                                  <span className="font-medium">{sub.washesUsed}</span>
                                  <span className="text-muted-foreground"> washes (unlimited)</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={getSubscriptionStatusColor(sub.status)}>
                                {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>
                              {sub.autoRenew ? (
                                <CheckCircle className="h-5 w-5 text-success" />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {sub.status === 'active' && (
                                  <Button variant="ghost" size="sm">
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <div className="col-span-3 flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                plans.map((plan) => (
                  <Card key={plan.id} className={cn('p-6', !plan.isActive && 'opacity-60')}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                      <Badge variant={plan.isActive ? 'success' : 'secondary'}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="mb-4">
                      <div className="text-3xl font-bold text-primary">
                        {formatCurrency(plan.price)}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{plan.duration} {plan.durationUnit}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">{plan.vehicleType}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {plan.washLimit ? `${plan.washLimit} washes` : 'Unlimited washes'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{plan.subscriberCount || 0} subscribers</span>
                      </div>
                    </div>

                    <div className="border-t pt-4 mb-4">
                      <h4 className="text-sm font-medium mb-2">Features</h4>
                      <ul className="space-y-1">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-3 w-3 text-success flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

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
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Loyalty Program Tab */}
          <TabsContent value="loyalty">
            <div className="space-y-6">
              {/* Loyalty Settings */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">Loyalty Program Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>Points per KES 100</Label>
                    <Input type="number" defaultValue="1" className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Base points earned per KES 100 spent
                    </p>
                  </div>
                  <div>
                    <Label>Points Expiry (days)</Label>
                    <Input type="number" defaultValue="365" className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Days before points expire (0 = never)
                    </p>
                  </div>
                  <div>
                    <Label>Redemption Value</Label>
                    <Input type="number" defaultValue="10" className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">
                      KES value per 100 points redeemed
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button>Save Settings</Button>
                </div>
              </Card>

              {/* Loyalty Tiers */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">Loyalty Tiers</h3>
                  <Button size="sm" onClick={() => setIsTierDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tier
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {loyaltyTiers.map((tier) => (
                    <Card
                      key={tier.id}
                      className={cn('p-4 border-2', getTierColor(tier.color))}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          <h4 className="font-semibold">{tier.name}</h4>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="text-sm mb-3">
                        <span className="font-medium">{tier.minPoints.toLocaleString()}</span>
                        {tier.maxPoints ? (
                          <span> - {tier.maxPoints.toLocaleString()} pts</span>
                        ) : (
                          <span>+ pts</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mb-3">
                        <Percent className="h-4 w-4" />
                        <span className="text-sm font-medium">{tier.multiplier}x points</span>
                      </div>

                      <div className="text-xs space-y-1 mb-3">
                        {tier.benefits.map((benefit, index) => (
                          <div key={index} className="flex items-center gap-1">
                            <ChevronRight className="h-3 w-3" />
                            {benefit}
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t">
                        <div className="text-xs">
                          <span className="font-medium">{tier.memberCount}</span> members
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Points History Tab */}
          <TabsContent value="history">
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <SearchInput
                  placeholder="Search by customer name..."
                  className="flex-1"
                />
                <SimpleSelect
                  value="all"
                  onValueChange={() => {}}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'earn', label: 'Earned' },
                    { value: 'redeem', label: 'Redeemed' },
                    { value: 'bonus', label: 'Bonus' },
                    { value: 'expire', label: 'Expired' },
                  ]}
                  className="w-40"
                />
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loyaltyTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="text-sm">
                            {formatDate(transaction.createdAt, true)}
                          </TableCell>
                          <TableCell className="font-medium">{transaction.customerName}</TableCell>
                          <TableCell>
                            <StatusBadge status={getLoyaltyTypeColor(transaction.type)}>
                              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {transaction.description}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                'font-medium',
                                transaction.points > 0 ? 'text-success' : 'text-destructive'
                              )}
                            >
                              {transaction.points > 0 ? '+' : ''}
                              {transaction.points}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {transaction.balance.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
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
          title={selectedPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label required>Plan Name</Label>
                <Input
                  placeholder="e.g., Premium Monthly"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of the plan..."
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label required>Vehicle Type</Label>
                <SimpleSelect
                  value={planForm.vehicleType}
                  onValueChange={(value) => setPlanForm({ ...planForm, vehicleType: value })}
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

              <div>
                <Label required>Price (KES)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                />
              </div>

              <div>
                <Label required>Duration</Label>
                <Input
                  type="number"
                  placeholder="30"
                  value={planForm.duration}
                  onChange={(e) => setPlanForm({ ...planForm, duration: e.target.value })}
                />
              </div>

              <div>
                <Label required>Duration Unit</Label>
                <SimpleSelect
                  value={planForm.durationUnit}
                  onValueChange={(value) =>
                    setPlanForm({ ...planForm, durationUnit: value as 'days' | 'weeks' | 'months' })
                  }
                  options={[
                    { value: 'days', label: 'Days' },
                    { value: 'weeks', label: 'Weeks' },
                    { value: 'months', label: 'Months' },
                  ]}
                />
              </div>

              <div className="col-span-2">
                <Label>Wash Limit</Label>
                <Input
                  type="number"
                  placeholder="Leave empty for unlimited"
                  value={planForm.washLimit}
                  onChange={(e) => setPlanForm({ ...planForm, washLimit: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of washes allowed. Leave empty for unlimited.
                </p>
              </div>

              <div className="col-span-2">
                <Label>Features (one per line)</Label>
                <Textarea
                  placeholder="Priority queue&#10;10% off extras&#10;Free air freshener"
                  value={planForm.features}
                  onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="col-span-2">
                <LabeledSwitch
                  label="Active"
                  description="Only active plans can be purchased by customers"
                  checked={planForm.isActive}
                  onCheckedChange={(checked) => setPlanForm({ ...planForm, isActive: checked })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePlan}>
                {selectedPlan ? 'Update Plan' : 'Create Plan'}
              </Button>
            </div>
          </div>
        </Dialog>
      </PageContainer>
    </MainLayout>
  );
}
