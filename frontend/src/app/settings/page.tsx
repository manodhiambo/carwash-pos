'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Label,
  Input,
  Textarea,
  Button,
  Switch,
  Spinner,
} from '@/components/ui';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({});

  const { data: settingsResponse, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await settingsApi.getAll();
      // Backend returns: { success: true, data: { settings: [], grouped: {} } }
      return response.data;
    },
  });

  useEffect(() => {
    if (settingsResponse) {
      const flattened: Record<string, string> = {};
      
      // Check if we have the grouped structure
      const data = settingsResponse as any;
      if (data.grouped) {
        Object.keys(data.grouped).forEach(category => {
          Object.keys(data.grouped[category]).forEach(key => {
            flattened[key] = data.grouped[category][key];
          });
        });
      } else if (Array.isArray(data)) {
        // Fallback if it's just an array
        data.forEach((setting: any) => {
          flattened[setting.key] = setting.value;
        });
      }
      
      setFormData(flattened);
    }
  }, [settingsResponse]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Array<{ key: string; value: string; category: string }>) => {
      return await settingsApi.updateBulk(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save settings');
    },
  });

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Static fallback map for keys that may not yet exist in the backend
  const categoryFallbacks: Record<string, string> = {
    commission_rate_attendant: 'commission',
    commission_rate_cashier: 'commission',
    commission_rate_supervisor: 'commission',
    commission_rate_manager: 'commission',
  };

  const handleSave = () => {
    const data = settingsResponse as any;
    const grouped = data?.grouped || {};

    const updates = Object.keys(formData).map(key => {
      let category = categoryFallbacks[key] || 'general';

      // Find the category for this key from existing grouped data
      Object.keys(grouped).forEach(cat => {
        if (grouped[cat] && grouped[cat][key] !== undefined) {
          category = cat;
        }
      });

      return {
        key,
        value: formData[key],
        category,
      };
    });

    updateMutation.mutate(updates);
  };

  if (isLoading) {
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
        title="Settings"
        description="Configure system settings and preferences"
      >
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </PageHeader>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Business Name</Label>
                    <Input
                      value={formData.business_name || ''}
                      onChange={(e) => handleChange('business_name', e.target.value)}
                      placeholder="Your Business Name"
                    />
                  </div>
                  <div>
                    <Label>Tagline</Label>
                    <Input
                      value={formData.business_tagline || ''}
                      onChange={(e) => handleChange('business_tagline', e.target.value)}
                      placeholder="Your tagline"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={formData.business_phone || ''}
                      onChange={(e) => handleChange('business_phone', e.target.value)}
                      placeholder="0712345678"
                    />
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={formData.business_email || ''}
                      onChange={(e) => handleChange('business_email', e.target.value)}
                      placeholder="info@business.com"
                    />
                  </div>
                </div>

                <div>
                  <Label>Address</Label>
                  <Textarea
                    value={formData.business_address || ''}
                    onChange={(e) => handleChange('business_address', e.target.value)}
                    rows={2}
                    placeholder="Business address"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Currency</Label>
                    <Input
                      value={formData.currency || 'KES'}
                      onChange={(e) => handleChange('currency', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Timezone</Label>
                    <Input
                      value={formData.timezone || 'Africa/Nairobi'}
                      onChange={(e) => handleChange('timezone', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operating Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Opening Time</Label>
                    <Input
                      type="time"
                      value={formData.opening_time || '08:00'}
                      onChange={(e) => handleChange('opening_time', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Closing Time</Label>
                    <Input
                      type="time"
                      value={formData.closing_time || '18:00'}
                      onChange={(e) => handleChange('closing_time', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-assign Bay</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign available bay to new jobs
                    </p>
                  </div>
                  <Switch
                    checked={formData.auto_assign_bay === 'true'}
                    onCheckedChange={(checked) => handleChange('auto_assign_bay', String(checked))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Customer Info</Label>
                    <p className="text-sm text-muted-foreground">
                      Require customer details for all jobs
                    </p>
                  </div>
                  <Switch
                    checked={formData.require_customer_info === 'true'}
                    onCheckedChange={(checked) => handleChange('require_customer_info', String(checked))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Walk-ins</Label>
                    <p className="text-sm text-muted-foreground">
                      Accept walk-in customers without appointments
                    </p>
                  </div>
                  <Switch
                    checked={formData.allow_walkins === 'true'}
                    onCheckedChange={(checked) => handleChange('allow_walkins', String(checked))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>M-PESA Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Paybill Number</Label>
                  <Input
                    value={formData.mpesa_paybill || ''}
                    onChange={(e) => handleChange('mpesa_paybill', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input
                    value={formData.mpesa_account || ''}
                    onChange={(e) => handleChange('mpesa_account', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts">
          <Card>
            <CardHeader>
              <CardTitle>Receipt Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Print Automatically</Label>
                  <p className="text-sm text-muted-foreground">
                    Print receipt after each completed payment
                  </p>
                </div>
                <Switch
                  checked={formData.receipt_auto_print === 'true'}
                  onCheckedChange={(checked) => handleChange('receipt_auto_print', String(checked))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Logo</Label>
                  <p className="text-sm text-muted-foreground">
                    Display business logo on receipts
                  </p>
                </div>
                <Switch
                  checked={formData.receipt_show_logo === 'true'}
                  onCheckedChange={(checked) => handleChange('receipt_show_logo', String(checked))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Barcode</Label>
                  <p className="text-sm text-muted-foreground">
                    Include scannable barcode for job reference
                  </p>
                </div>
                <Switch
                  checked={formData.receipt_show_barcode === 'true'}
                  onCheckedChange={(checked) => handleChange('receipt_show_barcode', String(checked))}
                />
              </div>

              <div>
                <Label>Footer Message</Label>
                <Textarea
                  value={formData.receipt_footer || ''}
                  onChange={(e) => handleChange('receipt_footer', e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Program</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Loyalty Program</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to earn and redeem points
                  </p>
                </div>
                <Switch
                  checked={formData.loyalty_enabled === 'true'}
                  onCheckedChange={(checked) => handleChange('loyalty_enabled', String(checked))}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Points per {formData.currency || 'KES'} 100</Label>
                  <Input
                    type="number"
                    value={formData.points_per_currency || '1'}
                    onChange={(e) => handleChange('points_per_currency', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Value per 100 Points</Label>
                  <Input
                    type="number"
                    value={formData.points_value || '1'}
                    onChange={(e) => handleChange('points_value', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Points Expiry (days)</Label>
                  <Input
                    type="number"
                    value={formData.points_expiry_days || '365'}
                    onChange={(e) => handleChange('points_expiry_days', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">0 = never expire</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commission">
          <Card>
            <CardHeader>
              <CardTitle>Default Commission Rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set default commission rates by role. Individual staff rates can be overridden in Staff Management.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Attendant Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.commission_rate_attendant || '10'}
                    onChange={(e) => handleChange('commission_rate_attendant', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Applied to attendants by default</p>
                </div>
                <div>
                  <Label>Cashier Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.commission_rate_cashier || '5'}
                    onChange={(e) => handleChange('commission_rate_cashier', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Applied to cashiers by default</p>
                </div>
                <div>
                  <Label>Supervisor Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.commission_rate_supervisor || '0'}
                    onChange={(e) => handleChange('commission_rate_supervisor', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Applied to supervisors by default</p>
                </div>
                <div>
                  <Label>Manager Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.commission_rate_manager || '0'}
                    onChange={(e) => handleChange('commission_rate_manager', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Applied to managers by default</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
