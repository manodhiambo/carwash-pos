'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { PageHeader, PageContainer, Section } from '@/components/layout/PageHeader';
import {
  Button,
  Input,
  SearchInput,
  Card,
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
  Separator,
} from '@/components/ui';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  Plus,
  Settings,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  CreditCard,
  Smartphone,
  Printer,
  Bell,
  Shield,
  Users,
  Tag,
  Percent,
  Calendar,
  Gift,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Save,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  Zap,
  Database,
  Key,
  FileText,
  Receipt,
} from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  email?: string;
  manager?: string;
  isActive: boolean;
  isMain: boolean;
  operatingHours: {
    open: string;
    close: string;
  };
  createdAt: string;
}

interface Promotion {
  id: string;
  name: string;
  code: string;
  type: 'percentage' | 'fixed' | 'service';
  value: number;
  minSpend?: number;
  maxDiscount?: number;
  applicableServices: string[];
  startDate: string;
  endDate: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

interface SystemSettings {
  business: {
    name: string;
    tagline: string;
    logo?: string;
    currency: string;
    timezone: string;
    dateFormat: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
    address: string;
  };
  operations: {
    operatingHours: { open: string; close: string };
    defaultBay: string;
    autoAssignBay: boolean;
    requireCustomerInfo: boolean;
    allowWalkIns: boolean;
  };
  payments: {
    acceptCash: boolean;
    acceptMpesa: boolean;
    acceptCard: boolean;
    mpesaPaybill: string;
    mpesaTillNumber: string;
    mpesaShortcode: string;
    cardTerminalId?: string;
  };
  loyalty: {
    enabled: boolean;
    pointsPerAmount: number;
    amountPerPoint: number;
    redemptionValue: number;
    pointsExpiry: number;
  };
  receipts: {
    printAutomatically: boolean;
    showLogo: boolean;
    showBarcode: boolean;
    footerMessage: string;
    includeVAT: boolean;
    vatRate: number;
    vatNumber?: string;
  };
  notifications: {
    smsEnabled: boolean;
    emailEnabled: boolean;
    jobCompleteNotify: boolean;
    promotionalMessages: boolean;
    lowStockAlert: boolean;
    lowStockThreshold: number;
  };
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Branches state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    manager: '',
    openTime: '07:00',
    closeTime: '19:00',
    isActive: true,
  });

  // Promotions state
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isPromotionDialogOpen, setIsPromotionDialogOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [promotionForm, setPromotionForm] = useState({
    name: '',
    code: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'service',
    value: '',
    minSpend: '',
    maxDiscount: '',
    startDate: '',
    endDate: '',
    usageLimit: '',
    isActive: true,
  });

  // Password visibility
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock system settings
      setSettings({
        business: {
          name: 'Sparkle Car Wash',
          tagline: 'Where Every Car Shines',
          currency: 'KES',
          timezone: 'Africa/Nairobi',
          dateFormat: 'DD/MM/YYYY',
        },
        contact: {
          phone: '+254 712 345 678',
          email: 'info@sparklecarwash.co.ke',
          website: 'www.sparklecarwash.co.ke',
          address: 'Moi Avenue, Nairobi, Kenya',
        },
        operations: {
          operatingHours: { open: '07:00', close: '19:00' },
          defaultBay: 'auto',
          autoAssignBay: true,
          requireCustomerInfo: false,
          allowWalkIns: true,
        },
        payments: {
          acceptCash: true,
          acceptMpesa: true,
          acceptCard: true,
          mpesaPaybill: '123456',
          mpesaTillNumber: '7890123',
          mpesaShortcode: '174379',
          cardTerminalId: 'TRM-001',
        },
        loyalty: {
          enabled: true,
          pointsPerAmount: 1,
          amountPerPoint: 100,
          redemptionValue: 10,
          pointsExpiry: 365,
        },
        receipts: {
          printAutomatically: true,
          showLogo: true,
          showBarcode: true,
          footerMessage: 'Thank you for choosing Sparkle Car Wash! Drive clean!',
          includeVAT: true,
          vatRate: 16,
          vatNumber: 'P051234567X',
        },
        notifications: {
          smsEnabled: true,
          emailEnabled: true,
          jobCompleteNotify: true,
          promotionalMessages: false,
          lowStockAlert: true,
          lowStockThreshold: 10,
        },
      });

      // Mock branches
      setBranches([
        {
          id: '1',
          name: 'Nairobi Main',
          code: 'NRB-001',
          address: 'Moi Avenue, CBD',
          city: 'Nairobi',
          phone: '+254 712 345 678',
          email: 'main@sparklecarwash.co.ke',
          manager: 'James Mwangi',
          isActive: true,
          isMain: true,
          operatingHours: { open: '07:00', close: '19:00' },
          createdAt: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Westlands Branch',
          code: 'WL-001',
          address: 'Westlands Road, Westlands',
          city: 'Nairobi',
          phone: '+254 723 456 789',
          email: 'westlands@sparklecarwash.co.ke',
          manager: 'Mary Wanjiku',
          isActive: true,
          isMain: false,
          operatingHours: { open: '07:00', close: '20:00' },
          createdAt: '2023-06-15T00:00:00Z',
        },
        {
          id: '3',
          name: 'Mombasa Branch',
          code: 'MSA-001',
          address: 'Nyali Road, Nyali',
          city: 'Mombasa',
          phone: '+254 734 567 890',
          isActive: false,
          isMain: false,
          operatingHours: { open: '08:00', close: '18:00' },
          createdAt: '2024-01-10T00:00:00Z',
        },
      ]);

      // Mock promotions
      setPromotions([
        {
          id: '1',
          name: 'New Year Special',
          code: 'NY2024',
          type: 'percentage',
          value: 20,
          minSpend: 500,
          maxDiscount: 300,
          applicableServices: [],
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
          usageLimit: 100,
          usageCount: 45,
          isActive: false,
          createdAt: '2023-12-20T00:00:00Z',
        },
        {
          id: '2',
          name: 'Valentine Special',
          code: 'LOVE24',
          type: 'fixed',
          value: 200,
          minSpend: 1000,
          applicableServices: [],
          startDate: '2024-02-01T00:00:00Z',
          endDate: '2024-02-29T23:59:59Z',
          usageLimit: 50,
          usageCount: 12,
          isActive: true,
          createdAt: '2024-01-25T00:00:00Z',
        },
        {
          id: '3',
          name: 'Loyalty Bonus',
          code: 'LOYAL100',
          type: 'percentage',
          value: 10,
          applicableServices: [],
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
          usageCount: 234,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '4',
          name: 'Free Interior Clean',
          code: 'FREEINT',
          type: 'service',
          value: 0,
          minSpend: 1500,
          applicableServices: ['interior-cleaning'],
          startDate: '2024-02-15T00:00:00Z',
          endDate: '2024-03-15T23:59:59Z',
          usageLimit: 30,
          usageCount: 8,
          isActive: true,
          createdAt: '2024-02-10T00:00:00Z',
        },
      ]);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // API call would go here
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBranch = async () => {
    try {
      // API call would go here
      setIsBranchDialogOpen(false);
      setSelectedBranch(null);
      resetBranchForm();
      fetchData();
    } catch (error) {
      console.error('Error saving branch:', error);
    }
  };

  const resetBranchForm = () => {
    setBranchForm({
      name: '',
      code: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      manager: '',
      openTime: '07:00',
      closeTime: '19:00',
      isActive: true,
    });
  };

  const handleSavePromotion = async () => {
    try {
      // API call would go here
      setIsPromotionDialogOpen(false);
      setSelectedPromotion(null);
      resetPromotionForm();
      fetchData();
    } catch (error) {
      console.error('Error saving promotion:', error);
    }
  };

  const resetPromotionForm = () => {
    setPromotionForm({
      name: '',
      code: '',
      type: 'percentage',
      value: '',
      minSpend: '',
      maxDiscount: '',
      startDate: '',
      endDate: '',
      usageLimit: '',
      isActive: true,
    });
  };

  const generatePromoCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPromotionForm({ ...promotionForm, code });
  };

  const updateSettings = (section: keyof SystemSettings, field: string, value: any) => {
    if (settings) {
      setSettings({
        ...settings,
        [section]: {
          ...settings[section],
          [field]: value,
        },
      });
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

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Settings"
          description="Configure system settings, branches, and promotions"
        >
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </PageHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="general">
              <Settings className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="branches">
              <Building2 className="h-4 w-4 mr-2" />
              Branches
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="h-4 w-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="promotions">
              <Tag className="h-4 w-4 mr-2" />
              Promotions
            </TabsTrigger>
            <TabsTrigger value="receipts">
              <Receipt className="h-4 w-4 mr-2" />
              Receipts
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Zap className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Business Information */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Business Name</Label>
                    <Input
                      value={settings?.business.name || ''}
                      onChange={(e) => updateSettings('business', 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Tagline</Label>
                    <Input
                      value={settings?.business.tagline || ''}
                      onChange={(e) => updateSettings('business', 'tagline', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Currency</Label>
                      <SimpleSelect
                        value={settings?.business.currency || 'KES'}
                        onValueChange={(value) => updateSettings('business', 'currency', value)}
                        options={[
                          { value: 'KES', label: 'KES - Kenya Shilling' },
                          { value: 'USD', label: 'USD - US Dollar' },
                          { value: 'EUR', label: 'EUR - Euro' },
                        ]}
                      />
                    </div>
                    <div>
                      <Label>Timezone</Label>
                      <SimpleSelect
                        value={settings?.business.timezone || 'Africa/Nairobi'}
                        onValueChange={(value) => updateSettings('business', 'timezone', value)}
                        options={[
                          { value: 'Africa/Nairobi', label: 'East Africa Time (EAT)' },
                          { value: 'UTC', label: 'UTC' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Contact Information */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={settings?.contact.phone || ''}
                      onChange={(e) => updateSettings('contact', 'phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={settings?.contact.email || ''}
                      onChange={(e) => updateSettings('contact', 'email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={settings?.contact.website || ''}
                      onChange={(e) => updateSettings('contact', 'website', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Textarea
                      value={settings?.contact.address || ''}
                      onChange={(e) => updateSettings('contact', 'address', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </Card>

              {/* Operating Hours */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Operating Hours
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Opening Time</Label>
                      <Input
                        type="time"
                        value={settings?.operations.operatingHours.open || '07:00'}
                        onChange={(e) =>
                          setSettings({
                            ...settings!,
                            operations: {
                              ...settings!.operations,
                              operatingHours: {
                                ...settings!.operations.operatingHours,
                                open: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Closing Time</Label>
                      <Input
                        type="time"
                        value={settings?.operations.operatingHours.close || '19:00'}
                        onChange={(e) =>
                          setSettings({
                            ...settings!,
                            operations: {
                              ...settings!.operations,
                              operatingHours: {
                                ...settings!.operations.operatingHours,
                                close: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <Separator />
                  <LabeledSwitch
                    label="Auto-assign Bay"
                    description="Automatically assign available bay to new jobs"
                    checked={settings?.operations.autoAssignBay || false}
                    onCheckedChange={(checked) => updateSettings('operations', 'autoAssignBay', checked)}
                  />
                  <LabeledSwitch
                    label="Require Customer Info"
                    description="Require customer details for all jobs"
                    checked={settings?.operations.requireCustomerInfo || false}
                    onCheckedChange={(checked) =>
                      updateSettings('operations', 'requireCustomerInfo', checked)
                    }
                  />
                  <LabeledSwitch
                    label="Allow Walk-ins"
                    description="Accept walk-in customers without appointments"
                    checked={settings?.operations.allowWalkIns || true}
                    onCheckedChange={(checked) => updateSettings('operations', 'allowWalkIns', checked)}
                  />
                </div>
              </Card>

              {/* Loyalty Program */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Loyalty Program
                </h3>
                <div className="space-y-4">
                  <LabeledSwitch
                    label="Enable Loyalty Program"
                    description="Allow customers to earn and redeem points"
                    checked={settings?.loyalty.enabled || false}
                    onCheckedChange={(checked) => updateSettings('loyalty', 'enabled', checked)}
                  />
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Points per KES</Label>
                      <Input
                        type="number"
                        value={settings?.loyalty.pointsPerAmount || 1}
                        onChange={(e) =>
                          updateSettings('loyalty', 'pointsPerAmount', parseInt(e.target.value))
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Points earned per {settings?.business.currency || 'KES'}{' '}
                        {settings?.loyalty.amountPerPoint || 100}
                      </p>
                    </div>
                    <div>
                      <Label>Amount per Point (KES)</Label>
                      <Input
                        type="number"
                        value={settings?.loyalty.amountPerPoint || 100}
                        onChange={(e) =>
                          updateSettings('loyalty', 'amountPerPoint', parseInt(e.target.value))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Redemption Value (KES per 100 pts)</Label>
                      <Input
                        type="number"
                        value={settings?.loyalty.redemptionValue || 10}
                        onChange={(e) =>
                          updateSettings('loyalty', 'redemptionValue', parseInt(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <Label>Points Expiry (days)</Label>
                      <Input
                        type="number"
                        value={settings?.loyalty.pointsExpiry || 365}
                        onChange={(e) =>
                          updateSettings('loyalty', 'pointsExpiry', parseInt(e.target.value))
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">0 = never expires</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Branches Tab */}
          <TabsContent value="branches">
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Branch Locations</h3>
                <Button size="sm" onClick={() => setIsBranchDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Branch
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.map((branch) => (
                      <TableRow key={branch.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{branch.name}</span>
                            {branch.isMain && (
                              <Badge variant="outline" className="text-xs">
                                Main
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{branch.code}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{branch.address}</div>
                            <div className="text-muted-foreground">{branch.city}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{branch.phone}</div>
                            {branch.email && (
                              <div className="text-muted-foreground">{branch.email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{branch.manager || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {branch.operatingHours.open} - {branch.operatingHours.close}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={branch.isActive ? 'success' : 'secondary'}>
                            {branch.isActive ? 'Active' : 'Inactive'}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedBranch(branch);
                                setBranchForm({
                                  name: branch.name,
                                  code: branch.code,
                                  address: branch.address,
                                  city: branch.city,
                                  phone: branch.phone,
                                  email: branch.email || '',
                                  manager: branch.manager || '',
                                  openTime: branch.operatingHours.open,
                                  closeTime: branch.operatingHours.close,
                                  isActive: branch.isActive,
                                });
                                setIsBranchDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!branch.isMain && (
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Methods */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Methods
                </h3>
                <div className="space-y-4">
                  <LabeledSwitch
                    label="Accept Cash"
                    description="Enable cash payments"
                    checked={settings?.payments.acceptCash || true}
                    onCheckedChange={(checked) => updateSettings('payments', 'acceptCash', checked)}
                  />
                  <LabeledSwitch
                    label="Accept M-Pesa"
                    description="Enable M-Pesa mobile payments"
                    checked={settings?.payments.acceptMpesa || true}
                    onCheckedChange={(checked) => updateSettings('payments', 'acceptMpesa', checked)}
                  />
                  <LabeledSwitch
                    label="Accept Card"
                    description="Enable card payments"
                    checked={settings?.payments.acceptCard || true}
                    onCheckedChange={(checked) => updateSettings('payments', 'acceptCard', checked)}
                  />
                </div>
              </Card>

              {/* M-Pesa Settings */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-green-600" />
                  M-Pesa Integration
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Paybill Number</Label>
                    <Input
                      value={settings?.payments.mpesaPaybill || ''}
                      onChange={(e) => updateSettings('payments', 'mpesaPaybill', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Till Number</Label>
                    <Input
                      value={settings?.payments.mpesaTillNumber || ''}
                      onChange={(e) => updateSettings('payments', 'mpesaTillNumber', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Shortcode (for STK Push)</Label>
                    <Input
                      value={settings?.payments.mpesaShortcode || ''}
                      onChange={(e) => updateSettings('payments', 'mpesaShortcode', e.target.value)}
                    />
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" size="sm">
                      <Zap className="h-4 w-4 mr-2" />
                      Test M-Pesa Connection
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Card Terminal Settings */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Card Terminal
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Terminal ID</Label>
                    <Input
                      value={settings?.payments.cardTerminalId || ''}
                      onChange={(e) => updateSettings('payments', 'cardTerminalId', e.target.value)}
                      placeholder="Enter terminal ID"
                    />
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" size="sm">
                      <Zap className="h-4 w-4 mr-2" />
                      Test Card Terminal
                    </Button>
                  </div>
                </div>
              </Card>

              {/* VAT Settings */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Tax Settings
                </h3>
                <div className="space-y-4">
                  <LabeledSwitch
                    label="Include VAT"
                    description="Include VAT in all prices and receipts"
                    checked={settings?.receipts.includeVAT || true}
                    onCheckedChange={(checked) => updateSettings('receipts', 'includeVAT', checked)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>VAT Rate (%)</Label>
                      <Input
                        type="number"
                        value={settings?.receipts.vatRate || 16}
                        onChange={(e) =>
                          updateSettings('receipts', 'vatRate', parseFloat(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <Label>VAT Number</Label>
                      <Input
                        value={settings?.receipts.vatNumber || ''}
                        onChange={(e) => updateSettings('receipts', 'vatNumber', e.target.value)}
                        placeholder="P051234567X"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Promotions Tab */}
          <TabsContent value="promotions">
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Promotional Codes</h3>
                <Button size="sm" onClick={() => setIsPromotionDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Promotion
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Promotion</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Valid Period</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotions.map((promo) => {
                      const isExpired = new Date(promo.endDate) < new Date();
                      const isNotStarted = new Date(promo.startDate) > new Date();

                      return (
                        <TableRow key={promo.id}>
                          <TableCell className="font-medium">{promo.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded text-sm">
                                {promo.code}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => navigator.clipboard.writeText(promo.code)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {promo.type === 'percentage' && <Percent className="h-3 w-3 mr-1" />}
                              {promo.type === 'fixed' && 'KES'}
                              {promo.type === 'service' && <Gift className="h-3 w-3 mr-1" />}
                              {promo.type.charAt(0).toUpperCase() + promo.type.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {promo.type === 'percentage'
                              ? `${promo.value}%`
                              : promo.type === 'fixed'
                              ? formatCurrency(promo.value)
                              : 'Free Service'}
                            {promo.minSpend && (
                              <div className="text-xs text-muted-foreground">
                                Min: {formatCurrency(promo.minSpend)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div>{formatDate(promo.startDate)}</div>
                            <div className="text-muted-foreground">to {formatDate(promo.endDate)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {promo.usageCount}
                              {promo.usageLimit && ` / ${promo.usageLimit}`}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isExpired ? (
                              <StatusBadge status="secondary">Expired</StatusBadge>
                            ) : isNotStarted ? (
                              <StatusBadge status="warning">Scheduled</StatusBadge>
                            ) : promo.isActive ? (
                              <StatusBadge status="success">Active</StatusBadge>
                            ) : (
                              <StatusBadge status="secondary">Inactive</StatusBadge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPromotion(promo);
                                  setPromotionForm({
                                    name: promo.name,
                                    code: promo.code,
                                    type: promo.type,
                                    value: promo.value.toString(),
                                    minSpend: promo.minSpend?.toString() || '',
                                    maxDiscount: promo.maxDiscount?.toString() || '',
                                    startDate: promo.startDate.split('T')[0],
                                    endDate: promo.endDate.split('T')[0],
                                    usageLimit: promo.usageLimit?.toString() || '',
                                    isActive: promo.isActive,
                                  });
                                  setIsPromotionDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Receipts Tab */}
          <TabsContent value="receipts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Receipt Settings
                </h3>
                <div className="space-y-4">
                  <LabeledSwitch
                    label="Print Automatically"
                    description="Print receipt after each completed payment"
                    checked={settings?.receipts.printAutomatically || true}
                    onCheckedChange={(checked) =>
                      updateSettings('receipts', 'printAutomatically', checked)
                    }
                  />
                  <LabeledSwitch
                    label="Show Logo"
                    description="Display business logo on receipts"
                    checked={settings?.receipts.showLogo || true}
                    onCheckedChange={(checked) => updateSettings('receipts', 'showLogo', checked)}
                  />
                  <LabeledSwitch
                    label="Show Barcode"
                    description="Include scannable barcode for job reference"
                    checked={settings?.receipts.showBarcode || true}
                    onCheckedChange={(checked) => updateSettings('receipts', 'showBarcode', checked)}
                  />
                  <Separator />
                  <div>
                    <Label>Footer Message</Label>
                    <Textarea
                      value={settings?.receipts.footerMessage || ''}
                      onChange={(e) => updateSettings('receipts', 'footerMessage', e.target.value)}
                      rows={3}
                      placeholder="Thank you message to display on receipts..."
                    />
                  </div>
                </div>
              </Card>

              {/* Receipt Preview */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">Receipt Preview</h3>
                <div className="border rounded-lg p-4 bg-white text-black font-mono text-xs">
                  <div className="text-center mb-4">
                    {settings?.receipts.showLogo && (
                      <div className="text-2xl mb-1">🚗</div>
                    )}
                    <div className="font-bold text-sm">{settings?.business.name}</div>
                    <div>{settings?.business.tagline}</div>
                    <div className="mt-2 text-[10px]">
                      {settings?.contact.address}
                      <br />
                      Tel: {settings?.contact.phone}
                    </div>
                  </div>
                  <div className="border-t border-dashed pt-2 mb-2">
                    <div className="flex justify-between">
                      <span>Receipt #:</span>
                      <span>RCP-2024-0001</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span>18/02/2024 14:30</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cashier:</span>
                      <span>James M.</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed py-2">
                    <div className="flex justify-between">
                      <span>Full Service Wash</span>
                      <span>1,200</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interior Vacuum</span>
                      <span>300</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed py-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>1,500</span>
                    </div>
                    {settings?.receipts.includeVAT && (
                      <div className="flex justify-between">
                        <span>VAT ({settings?.receipts.vatRate}%)</span>
                        <span>240</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold">
                      <span>TOTAL</span>
                      <span>KES 1,740</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed pt-2 text-center">
                    <div className="mb-2">Payment: M-PESA</div>
                    {settings?.receipts.showBarcode && (
                      <div className="bg-gray-100 h-8 flex items-center justify-center text-[8px]">
                        ||||| |||| ||| |||| |||||
                      </div>
                    )}
                    <div className="mt-2 text-[10px]">
                      {settings?.receipts.footerMessage}
                    </div>
                    {settings?.receipts.vatNumber && (
                      <div className="text-[10px] mt-1">
                        VAT No: {settings?.receipts.vatNumber}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Communication Channels</h4>
                    <LabeledSwitch
                      label="SMS Notifications"
                      description="Send SMS messages to customers"
                      checked={settings?.notifications.smsEnabled || true}
                      onCheckedChange={(checked) =>
                        updateSettings('notifications', 'smsEnabled', checked)
                      }
                    />
                    <LabeledSwitch
                      label="Email Notifications"
                      description="Send email notifications to customers"
                      checked={settings?.notifications.emailEnabled || true}
                      onCheckedChange={(checked) =>
                        updateSettings('notifications', 'emailEnabled', checked)
                      }
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Notification Types</h4>
                    <LabeledSwitch
                      label="Job Completion"
                      description="Notify customer when their car is ready"
                      checked={settings?.notifications.jobCompleteNotify || true}
                      onCheckedChange={(checked) =>
                        updateSettings('notifications', 'jobCompleteNotify', checked)
                      }
                    />
                    <LabeledSwitch
                      label="Promotional Messages"
                      description="Send promotional offers to customers"
                      checked={settings?.notifications.promotionalMessages || false}
                      onCheckedChange={(checked) =>
                        updateSettings('notifications', 'promotionalMessages', checked)
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">System Alerts</h4>
                  <LabeledSwitch
                    label="Low Stock Alerts"
                    description="Get notified when inventory items are running low"
                    checked={settings?.notifications.lowStockAlert || true}
                    onCheckedChange={(checked) =>
                      updateSettings('notifications', 'lowStockAlert', checked)
                    }
                  />
                  {settings?.notifications.lowStockAlert && (
                    <div className="ml-4">
                      <Label>Low Stock Threshold</Label>
                      <Input
                        type="number"
                        value={settings?.notifications.lowStockThreshold || 10}
                        onChange={(e) =>
                          updateSettings(
                            'notifications',
                            'lowStockThreshold',
                            parseInt(e.target.value)
                          )
                        }
                        className="w-32"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Alert when quantity falls below this number
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Keys
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">Production API Key</div>
                        <p className="text-xs text-muted-foreground">
                          Use this key for your production environment
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <code className="block bg-background p-2 rounded text-sm break-all">
                      {showApiKey
                        ? 'cwp_prod_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                        : '••••••••••••••••••••••••••••••••'}
                    </code>
                  </div>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Key
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </h3>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <Database className="h-5 w-5 mt-0.5" />
                      <div>
                        <div className="font-medium">Export Data</div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Download all your data in CSV or JSON format
                        </p>
                        <Button variant="outline" size="sm">
                          Export All Data
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border border-destructive/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                      <div>
                        <div className="font-medium text-destructive">Danger Zone</div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Clear all test data. This action cannot be undone.
                        </p>
                        <Button variant="destructive" size="sm">
                          Clear Test Data
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Branch Dialog */}
        <Dialog
          open={isBranchDialogOpen}
          onOpenChange={(open) => {
            setIsBranchDialogOpen(open);
            if (!open) {
              setSelectedBranch(null);
              resetBranchForm();
            }
          }}
          title={selectedBranch ? 'Edit Branch' : 'Add Branch'}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label required>Branch Name</Label>
                <Input
                  placeholder="e.g., Westlands Branch"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                />
              </div>

              <div>
                <Label required>Branch Code</Label>
                <Input
                  placeholder="e.g., WL-001"
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                />
              </div>

              <div>
                <Label required>City</Label>
                <Input
                  placeholder="e.g., Nairobi"
                  value={branchForm.city}
                  onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label required>Address</Label>
                <Textarea
                  placeholder="Full address"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label required>Phone</Label>
                <Input
                  placeholder="+254 7XX XXX XXX"
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="branch@example.com"
                  value={branchForm.email}
                  onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label>Manager</Label>
                <Input
                  placeholder="Branch manager name"
                  value={branchForm.manager}
                  onChange={(e) => setBranchForm({ ...branchForm, manager: e.target.value })}
                />
              </div>

              <div>
                <Label>Opening Time</Label>
                <Input
                  type="time"
                  value={branchForm.openTime}
                  onChange={(e) => setBranchForm({ ...branchForm, openTime: e.target.value })}
                />
              </div>

              <div>
                <Label>Closing Time</Label>
                <Input
                  type="time"
                  value={branchForm.closeTime}
                  onChange={(e) => setBranchForm({ ...branchForm, closeTime: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <LabeledSwitch
                  label="Active"
                  description="Branch is operational and accepting jobs"
                  checked={branchForm.isActive}
                  onCheckedChange={(checked) => setBranchForm({ ...branchForm, isActive: checked })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsBranchDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveBranch}>
                {selectedBranch ? 'Update Branch' : 'Add Branch'}
              </Button>
            </div>
          </div>
        </Dialog>

        {/* Promotion Dialog */}
        <Dialog
          open={isPromotionDialogOpen}
          onOpenChange={(open) => {
            setIsPromotionDialogOpen(open);
            if (!open) {
              setSelectedPromotion(null);
              resetPromotionForm();
            }
          }}
          title={selectedPromotion ? 'Edit Promotion' : 'Create Promotion'}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label required>Promotion Name</Label>
                <Input
                  placeholder="e.g., Valentine Special"
                  value={promotionForm.name}
                  onChange={(e) => setPromotionForm({ ...promotionForm, name: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label required>Promo Code</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., LOVE24"
                    value={promotionForm.code}
                    onChange={(e) =>
                      setPromotionForm({ ...promotionForm, code: e.target.value.toUpperCase() })
                    }
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={generatePromoCode}>
                    Generate
                  </Button>
                </div>
              </div>

              <div>
                <Label required>Discount Type</Label>
                <SimpleSelect
                  value={promotionForm.type}
                  onValueChange={(value) =>
                    setPromotionForm({
                      ...promotionForm,
                      type: value as 'percentage' | 'fixed' | 'service',
                    })
                  }
                  options={[
                    { value: 'percentage', label: 'Percentage Discount' },
                    { value: 'fixed', label: 'Fixed Amount' },
                    { value: 'service', label: 'Free Service' },
                  ]}
                />
              </div>

              <div>
                <Label required>
                  {promotionForm.type === 'percentage'
                    ? 'Discount (%)'
                    : promotionForm.type === 'fixed'
                    ? 'Discount Amount (KES)'
                    : 'Service Value'}
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={promotionForm.value}
                  onChange={(e) => setPromotionForm({ ...promotionForm, value: e.target.value })}
                  disabled={promotionForm.type === 'service'}
                />
              </div>

              <div>
                <Label>Minimum Spend (KES)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={promotionForm.minSpend}
                  onChange={(e) => setPromotionForm({ ...promotionForm, minSpend: e.target.value })}
                />
              </div>

              {promotionForm.type === 'percentage' && (
                <div>
                  <Label>Maximum Discount (KES)</Label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={promotionForm.maxDiscount}
                    onChange={(e) =>
                      setPromotionForm({ ...promotionForm, maxDiscount: e.target.value })
                    }
                  />
                </div>
              )}

              <div>
                <Label required>Start Date</Label>
                <Input
                  type="date"
                  value={promotionForm.startDate}
                  onChange={(e) => setPromotionForm({ ...promotionForm, startDate: e.target.value })}
                />
              </div>

              <div>
                <Label required>End Date</Label>
                <Input
                  type="date"
                  value={promotionForm.endDate}
                  onChange={(e) => setPromotionForm({ ...promotionForm, endDate: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label>Usage Limit</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={promotionForm.usageLimit}
                  onChange={(e) => setPromotionForm({ ...promotionForm, usageLimit: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for unlimited usage
                </p>
              </div>

              <div className="col-span-2">
                <LabeledSwitch
                  label="Active"
                  description="Promotion can be used by customers"
                  checked={promotionForm.isActive}
                  onCheckedChange={(checked) =>
                    setPromotionForm({ ...promotionForm, isActive: checked })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsPromotionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePromotion}>
                {selectedPromotion ? 'Update Promotion' : 'Create Promotion'}
              </Button>
            </div>
          </div>
        </Dialog>
      </PageContainer>
    </MainLayout>
  );
}
