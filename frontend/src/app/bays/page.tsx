'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { baysApi, equipmentApi } from '@/lib/api';
import { cn, getRelativeTime } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Progress, CircularProgress } from '@/components/ui/progress';
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
  Building2,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Wrench,
  Car,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  Loader2,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bay, BayType, BayStatus, Equipment } from '@/types';

const bayTypes: { value: BayType; label: string }[] = [
  { value: 'manual', label: 'Manual Wash' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'self_service', label: 'Self Service' },
  { value: 'detail', label: 'Detailing Bay' },
];

const bayStatuses: { value: BayStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'reserved', label: 'Reserved' },
];

const baySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  bay_number: z.number().min(1, 'Bay number is required'),
  bay_type: z.enum(['manual', 'automatic', 'self_service', 'detail']),
  capacity: z.number().min(1).default(1),
});

type BayFormData = z.infer<typeof baySchema>;

export default function BaysPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState('bays');
  const [formDialog, setFormDialog] = React.useState<{
    open: boolean;
    bay?: Bay;
  }>({ open: false });
  const [statusDialog, setStatusDialog] = React.useState<{
    open: boolean;
    bay?: Bay;
  }>({ open: false });
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    bay?: Bay;
  }>({ open: false });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<BayFormData>({
    resolver: zodResolver(baySchema),
    defaultValues: {
      bay_type: 'manual',
      capacity: 1,
    },
  });

  // Fetch bays
  const { data: baysData, isLoading: baysLoading } = useQuery({
    queryKey: ['bays'],
    queryFn: () => baysApi.getAll({ limit: 50 }),
    refetchInterval: 15000,
  });

  // Fetch equipment
  const { data: equipmentData, isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => equipmentApi.getAll({ limit: 100 }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: BayFormData) => baysApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bays'] });
      toast.success('Bay created successfully');
      setFormDialog({ open: false });
      reset();
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to create bay');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BayFormData> }) =>
      baysApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bays'] });
      toast.success('Bay updated successfully');
      setFormDialog({ open: false });
      reset();
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to update bay');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BayStatus }) =>
      baysApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bays'] });
      toast.success('Bay status updated');
      setStatusDialog({ open: false });
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to update status');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => baysApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bays'] });
      toast.success('Bay deleted successfully');
      setDeleteDialog({ open: false });
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to delete bay');
    },
  });

  const bays = baysData?.data || [];
  const equipment = equipmentData?.data || [];

  const availableBays = bays.filter((b) => b.status === 'available').length;
  const occupiedBays = bays.filter((b) => b.status === 'occupied').length;
  const maintenanceBays = bays.filter((b) => b.status === 'maintenance').length;

  const handleOpenForm = (bay?: Bay) => {
    if (bay) {
      setValue('name', bay.name);
      setValue('bay_number', bay.bay_number);
      setValue('bay_type', bay.bay_type);
      setValue('capacity', bay.capacity);
    } else {
      reset();
      setValue('bay_number', bays.length + 1);
    }
    setFormDialog({ open: true, bay });
  };

  const onSubmit = (data: BayFormData) => {
    if (formDialog.bay) {
      updateMutation.mutate({ id: formDialog.bay.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getBayStatusColor = (status: BayStatus) => {
    switch (status) {
      case 'available':
        return 'border-success-500 bg-success-50';
      case 'occupied':
        return 'border-warning-500 bg-warning-50';
      case 'maintenance':
        return 'border-destructive bg-destructive/10';
      case 'reserved':
        return 'border-info-500 bg-info-50';
      default:
        return 'border-border';
    }
  };

  const getBayStatusIcon = (status: BayStatus) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'occupied':
        return <Car className="h-5 w-5 text-warning-600" />;
      case 'maintenance':
        return <Wrench className="h-5 w-5 text-destructive" />;
      case 'reserved':
        return <Clock className="h-5 w-5 text-info-600" />;
      default:
        return null;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Bay Management"
        description="Manage wash bays and equipment"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Bays' },
        ]}
        actions={
          <Button onClick={() => handleOpenForm()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Bay
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bays</p>
                <p className="text-2xl font-bold">{bays.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-success-600">{availableBays}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupied</p>
                <p className="text-2xl font-bold text-warning-600">{occupiedBays}</p>
              </div>
              <Car className="h-8 w-8 text-warning-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Maintenance</p>
                <p className="text-2xl font-bold text-destructive">{maintenanceBays}</p>
              </div>
              <Wrench className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="bays">
            Wash Bays
            <Badge variant="secondary" className="ml-2">
              {bays.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="equipment">
            Equipment
            <Badge variant="secondary" className="ml-2">
              {equipment.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bays">
          {baysLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-24 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : bays.length === 0 ? (
            <Card className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold">No bays configured</h3>
                <p className="mt-1">Add your first wash bay to get started</p>
                <Button onClick={() => handleOpenForm()} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bay
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bays.map((bay) => (
                <Card
                  key={bay.id}
                  className={cn('border-2 transition-all', getBayStatusColor(bay.status))}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getBayStatusIcon(bay.status)}
                        <CardTitle className="text-lg">{bay.name}</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setStatusDialog({ open: true, bay })}>
                            <Activity className="h-4 w-4 mr-2" />
                            Change Status
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenForm(bay)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteDialog({ open: true, bay })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription>
                      Bay #{bay.bay_number} - {bay.bay_type.replace('_', ' ')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <StatusBadge status={bay.status} />
                      </div>
                      {bay.current_job && (
                        <div className="p-3 rounded-lg bg-background border">
                          <div className="flex items-center gap-2 mb-1">
                            <Car className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              {bay.current_job.vehicle?.registration_number}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {bay.current_job.services?.map((s) => s.service.name).join(', ')}
                          </div>
                        </div>
                      )}
                      {bay.equipment && bay.equipment.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {bay.equipment.slice(0, 3).map((eq) => (
                            <Badge key={eq.id} variant="outline" className="text-xs">
                              {eq.name}
                            </Badge>
                          ))}
                          {bay.equipment.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{bay.equipment.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="equipment">
          {equipmentLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-20 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : equipment.length === 0 ? (
            <Card className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold">No equipment configured</h3>
                <p className="mt-1">Add equipment to track maintenance schedules</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {equipment.map((eq: Equipment) => (
                <Card key={eq.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{eq.name}</CardTitle>
                      <StatusBadge status={eq.status.replace('_', '-')} />
                    </div>
                    <CardDescription>{eq.equipment_type}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {eq.serial_number && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Serial #</span>
                          <span className="font-mono">{eq.serial_number}</span>
                        </div>
                      )}
                      {eq.last_maintenance && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Maintenance</span>
                          <span>{getRelativeTime(eq.last_maintenance)}</span>
                        </div>
                      )}
                      {eq.next_maintenance && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Next Maintenance</span>
                          <span>{getRelativeTime(eq.next_maintenance)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bay Form Dialog */}
      <Dialog open={formDialog.open} onOpenChange={(open) => setFormDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{formDialog.bay ? 'Edit Bay' : 'Add New Bay'}</DialogTitle>
            <DialogDescription>
              {formDialog.bay ? 'Update bay information' : 'Enter the bay details below'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" required>
                Bay Name
              </Label>
              <Input id="name" {...register('name')} placeholder="Bay 1" />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bay_number" required>
                  Bay Number
                </Label>
                <Input
                  id="bay_number"
                  type="number"
                  {...register('bay_number', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  {...register('capacity', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bay Type</Label>
              <SimpleSelect
                value={watch('bay_type')}
                onValueChange={(value) => setValue('bay_type', value as BayType)}
                options={bayTypes}
              />
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
                {formDialog.bay ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusDialog.open} onOpenChange={(open) => setStatusDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Bay Status</DialogTitle>
            <DialogDescription>
              Update the status for {statusDialog.bay?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {bayStatuses.map((status) => (
              <Button
                key={status.value}
                variant={statusDialog.bay?.status === status.value ? 'default' : 'outline'}
                className="justify-start"
                onClick={() =>
                  statusDialog.bay &&
                  updateStatusMutation.mutate({
                    id: statusDialog.bay.id,
                    status: status.value,
                  })
                }
                disabled={updateStatusMutation.isPending}
              >
                {getBayStatusIcon(status.value)}
                <span className="ml-2">{status.label}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Bay</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.bay?.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.bay && deleteMutation.mutate(deleteDialog.bay.id)}
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
