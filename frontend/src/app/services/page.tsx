'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch, LabeledSwitch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
  TableSkeleton,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tags,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Loader2,
  Sparkles,
  Droplets,
  Star,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Service, ServiceCategory, VehicleType } from '@/types';

const serviceCategories: { value: ServiceCategory; label: string; icon: React.ElementType }[] = [
  { value: 'wash', label: 'Wash', icon: Droplets },
  { value: 'detail', label: 'Detailing', icon: Sparkles },
  { value: 'polish', label: 'Polish', icon: Star },
  { value: 'interior', label: 'Interior', icon: Settings },
  { value: 'exterior', label: 'Exterior', icon: Droplets },
  { value: 'specialty', label: 'Specialty', icon: Star },
  { value: 'package', label: 'Package', icon: Tags },
];

const vehicleTypes: { value: VehicleType; label: string }[] = [
  { value: 'saloon', label: 'Saloon' },
  { value: 'suv', label: 'SUV' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'van', label: 'Van' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'bus', label: 'Bus' },
  { value: 'truck', label: 'Truck' },
];

const serviceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.enum(['wash', 'detail', 'polish', 'interior', 'exterior', 'specialty', 'package']),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute'),
  is_addon: z.boolean(),
  prices: z.record(z.string(), z.number()),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('services');
  const [formDialog, setFormDialog] = React.useState<{
    open: boolean;
    service?: Service;
  }>({ open: false });
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    service?: Service;
  }>({ open: false });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      category: 'wash',
      duration_minutes: 30,
      is_addon: false,
      prices: Object.fromEntries(vehicleTypes.map((vt) => [vt.value, 0])),
    },
  });

  // Fetch services
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services', { category: categoryFilter }],
    queryFn: () =>
      servicesApi.getAll({
        category: categoryFilter || undefined,
        limit: 100,
      }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ServiceFormData) => {
      const priceValues = Object.values(data.prices).filter((p) => p > 0);
      const base_price = priceValues.length > 0 ? Math.min(...priceValues) : 0;
      return servicesApi.create({
        ...data,
        base_price,
        pricing: Object.entries(data.prices).map(([vehicle_type, price]) => ({
          vehicle_type: vehicle_type as VehicleType,
          price,
        })),
      } as ServiceFormData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service created successfully');
      setFormDialog({ open: false });
      reset();
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to create service');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServiceFormData> }) => {
      const priceValues = data.prices ? Object.values(data.prices).filter((p) => p > 0) : [];
      const base_price = priceValues.length > 0 ? Math.min(...priceValues) : undefined;
      return servicesApi.update(id, {
        ...data,
        base_price,
        pricing: data.prices
          ? Object.entries(data.prices).map(([vehicle_type, price]) => ({
              vehicle_type: vehicle_type as VehicleType,
              price,
            }))
          : undefined,
      } as Partial<ServiceFormData>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service updated successfully');
      setFormDialog({ open: false });
      reset();
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to update service');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => servicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service deleted successfully');
      setDeleteDialog({ open: false });
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to delete service');
    },
  });

  const services = servicesData?.data || [];
  const mainServices = services.filter((s) => !s.is_addon);
  const addons = services.filter((s) => s.is_addon);

  const handleOpenForm = (service?: Service) => {
    if (service) {
      setValue('name', service.name);
      setValue('description', service.description || '');
      setValue('category', service.category);
      setValue('duration_minutes', service.duration_minutes);
      setValue('is_addon', service.is_addon);
      const prices: Record<string, number> = {};
      // Initialize all vehicle types to 0, then overlay existing prices
      vehicleTypes.forEach((vt) => {
        prices[vt.value] = 0;
      });
      const servicePricing = service.prices || service.pricing || [];
      servicePricing.forEach((p) => {
        prices[p.vehicle_type] = p.price;
      });
      setValue('prices', prices);
    } else {
      reset();
      // Set default prices
      const defaultPrices: Record<string, number> = {};
      vehicleTypes.forEach((vt) => {
        defaultPrices[vt.value] = 0;
      });
      setValue('prices', defaultPrices);
    }
    setFormDialog({ open: true, service });
  };

  const onSubmit = (data: ServiceFormData) => {
    if (formDialog.service) {
      updateMutation.mutate({ id: formDialog.service.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getServicePrice = (service: Service, vehicleType: VehicleType) => {
    const pricing = service.prices || service.pricing || [];
    const price = pricing.find((p) => p.vehicle_type === vehicleType);
    return price?.price || service.base_price || 0;
  };

  const renderServicesTable = (servicesList: Service[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Saloon</TableHead>
          <TableHead>SUV</TableHead>
          <TableHead>Pickup</TableHead>
          <TableHead>Van</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton columns={9} rows={5} />
        ) : servicesList.length === 0 ? (
          <TableEmpty
            colSpan={9}
            title="No services found"
            description="Add your first service to get started"
            icon={<Tags className="h-12 w-12" />}
            action={
              <Button onClick={() => handleOpenForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            }
          />
        ) : (
          servicesList.map((service) => (
            <TableRow key={service.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{service.name}</div>
                  {service.description && (
                    <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {service.description}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">
                  {service.category}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {service.duration_minutes} min
                </div>
              </TableCell>
              <TableCell>{formatCurrency(getServicePrice(service, 'saloon'))}</TableCell>
              <TableCell>{formatCurrency(getServicePrice(service, 'suv'))}</TableCell>
              <TableCell>{formatCurrency(getServicePrice(service, 'pickup'))}</TableCell>
              <TableCell>{formatCurrency(getServicePrice(service, 'van'))}</TableCell>
              <TableCell>
                <Badge variant={service.is_active ? 'success' : 'secondary'}>
                  {service.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenForm(service)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteDialog({ open: true, service })}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <PageContainer>
      <PageHeader
        title="Services & Pricing"
        description="Manage your car wash services and pricing"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Services' },
        ]}
        actions={
          <Button onClick={() => handleOpenForm()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Service
          </Button>
        }
      />

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={categoryFilter === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('')}
        >
          All
        </Button>
        {serviceCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Button
              key={cat.value}
              variant={categoryFilter === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(cat.value)}
              className="gap-1"
            >
              <Icon className="h-4 w-4" />
              {cat.label}
            </Button>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="services">
            Main Services
            <Badge variant="secondary" className="ml-2">
              {mainServices.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="addons">
            Add-ons
            <Badge variant="secondary" className="ml-2">
              {addons.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <Card>
            <CardContent className="p-0">{renderServicesTable(mainServices)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addons">
          <Card>
            <CardContent className="p-0">{renderServicesTable(addons)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={formDialog.open} onOpenChange={(open) => setFormDialog({ open })}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {formDialog.service ? 'Edit Service' : 'Add New Service'}
            </DialogTitle>
            <DialogDescription>
              {formDialog.service
                ? 'Update service information and pricing'
                : 'Enter service details and set pricing for each vehicle type'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" required>
                  Service Name
                </Label>
                <Input id="name" {...register('name')} placeholder="Full Wash" />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <SimpleSelect
                  value={watch('category')}
                  onValueChange={(value) => setValue('category', value as ServiceCategory)}
                  options={serviceCategories.map((c) => ({ value: c.value, label: c.label }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Service description..."
                rows={2}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration_minutes" required>
                  Duration (minutes)
                </Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  {...register('duration_minutes', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2 flex items-end">
                <LabeledSwitch
                  label="Is Add-on"
                  description="Can be added to main services"
                  checked={watch('is_addon')}
                  onCheckedChange={(checked) => setValue('is_addon', checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Pricing by Vehicle Type</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {vehicleTypes.map((vt) => (
                  <div key={vt.value} className="flex items-center gap-2">
                    <Label className="w-24 text-sm">{vt.label}</Label>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        KES
                      </span>
                      <Input
                        type="number"
                        className="pl-12"
                        {...register(`prices.${vt.value}`, { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormDialog({ open: false })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {formDialog.service ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.service?.name}"? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteDialog.service && deleteMutation.mutate(deleteDialog.service.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
