'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { servicesApi, vehiclesApi, customersApi, baysApi, usersApi } from '@/lib/api';
import { useJobStore } from '@/stores';
import { formatCurrency, formatVehicleReg } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { Textarea } from '@/components/ui/input';
import { Checkbox, LabeledCheckbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Car,
  Search,
  User,
  Phone,
  Wrench,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VehicleType, Service, JobPriority } from '@/types';

const vehicleTypes = [
  { value: 'sedan', label: 'Sedan / Saloon' },
  { value: 'suv', label: 'SUV / 4x4' },
  { value: 'pickup', label: 'Pickup Truck' },
  { value: 'van', label: 'Van / Minibus' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'bus', label: 'Bus / Matatu' },
  { value: 'truck', label: 'Truck / Lorry' },
];

const priorities = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High Priority' },
  { value: 'urgent', label: 'Urgent' },
];

const checkInSchema = z.object({
  registration_number: z.string().min(1, 'Registration number is required'),
  vehicle_type: z.string().min(1, 'Vehicle type is required'),
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  services: z.array(z.string()).min(1, 'Select at least one service'),
  priority: z.string().default('normal'),
  bay_id: z.string().optional(),
  assigned_staff_id: z.string().optional(),
  notes: z.string().optional(),
});

type CheckInFormData = z.infer<typeof checkInSchema>;

export default function CheckInPage() {
  const router = useRouter();
  const { checkIn, isCheckingIn } = useJobStore();
  const [searchingVehicle, setSearchingVehicle] = React.useState(false);
  const [foundVehicle, setFoundVehicle] = React.useState<boolean | null>(null);
  const [selectedServices, setSelectedServices] = React.useState<Set<string>>(new Set());

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      registration_number: '',
      vehicle_type: 'sedan',
      services: [],
      priority: 'normal',
    },
  });

  const vehicleType = watch('vehicle_type') as VehicleType;
  const registrationNumber = watch('registration_number');

  // Fetch services
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getAll({ limit: 100 }),
  });

  // Fetch available bays
  const { data: baysData } = useQuery({
    queryKey: ['available-bays'],
    queryFn: () => baysApi.getAll({ status: 'available', limit: 50 }),
  });

  // Fetch staff (attendants)
  const { data: staffData } = useQuery({
    queryKey: ['staff-attendants'],
    queryFn: () => usersApi.getAll({ limit: 50 }),
  });

  const services = servicesData?.data || [];
  const availableBays = (baysData?.data || []).filter((b) => b.status === 'available');
  const staffList = (staffData?.data || []).filter((u) => ['attendant', 'supervisor'].includes(u.role));

  // Search for existing vehicle
  const handleVehicleSearch = async () => {
    if (!registrationNumber || registrationNumber.length < 4) return;

    setSearchingVehicle(true);
    setFoundVehicle(null);

    try {
      const response = await vehiclesApi.getByRegistration(registrationNumber.replace(/\s/g, ''));
      const vehicle = response.data;

      if (vehicle) {
        setValue('vehicle_type', vehicle.vehicle_type);
        setValue('make', vehicle.make || '');
        setValue('model', vehicle.model || '');
        setValue('color', vehicle.color || '');

        if (vehicle.customer) {
          setValue('customer_name', vehicle.customer.name);
          setValue('customer_phone', vehicle.customer.phone);
        }

        setFoundVehicle(true);
        toast.success('Returning customer! Vehicle details loaded.');
      }
    } catch {
      setFoundVehicle(false);
    } finally {
      setSearchingVehicle(false);
    }
  };

  // Handle service selection
  const toggleService = (serviceId: string) => {
    if (!serviceId) return;
    const newSelected = new Set(selectedServices);
    if (newSelected.has(serviceId)) {
      newSelected.delete(serviceId);
    } else {
      newSelected.add(serviceId);
    }
    setSelectedServices(newSelected);
    setValue('services', Array.from(newSelected));
  };

  // Calculate total price
  const calculateTotal = () => {
    let total = 0;
    selectedServices.forEach((serviceId) => {
      const service = services.find((s) => String(s.id) === serviceId);
      if (service) {
        // Use pricing array from backend (may also be named 'prices')
        const pricing = service.pricing || service.prices || [];
        const priceInfo = pricing.find((p: { vehicle_type: string; price: number }) => p.vehicle_type === vehicleType);
        total += priceInfo?.price || service.base_price || 0;
      }
    });
    return total;
  };

  // Calculate estimated duration
  const calculateDuration = () => {
    let duration = 0;
    selectedServices.forEach((serviceId) => {
      const service = services.find((s) => String(s.id) === serviceId);
      if (service) {
        duration += service.duration_minutes || 0;
      }
    });
    return duration;
  };

  // Get price for service based on vehicle type
  const getServicePrice = (service: Service) => {
    // Use pricing array from backend (may also be named 'prices')
    const pricing = (service as Service & { pricing?: { vehicle_type: string; price: number }[] }).pricing || service.prices || [];
    const priceInfo = pricing.find((p: { vehicle_type: string; price: number }) => p.vehicle_type === vehicleType);
    return priceInfo?.price || service.base_price || 0;
  };

  // Submit form
  const onSubmit = async (data: CheckInFormData) => {
    try {
      const job = await checkIn({
        registration_number: data.registration_number.replace(/\s/g, '').toUpperCase(),
        vehicle_type: data.vehicle_type as VehicleType,
        make: data.make,
        model: data.model,
        color: data.color,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        services: data.services,
        priority: data.priority as JobPriority,
        bay_id: data.bay_id,
        assigned_staff_id: data.assigned_staff_id,
        notes: data.notes,
      });

      toast.success(`Vehicle checked in! Job #${job.job_number}`);
      router.push('/jobs');
    } catch (error: unknown) {
      const err = error as { error?: string };
      toast.error(err.error || 'Failed to check in vehicle');
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Vehicle Check-In"
        description="Register a new vehicle for washing services"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Check-In' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Vehicle & Customer Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Vehicle Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="registration_number" required>
                      Registration Number
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="registration_number"
                        placeholder="KAA 123B"
                        {...register('registration_number')}
                        className="uppercase"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleVehicleSearch}
                        disabled={searchingVehicle}
                      >
                        {searchingVehicle ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {foundVehicle === true && (
                      <p className="text-sm text-success-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Returning customer
                      </p>
                    )}
                    {foundVehicle === false && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" /> New vehicle
                      </p>
                    )}
                    {errors.registration_number && (
                      <p className="text-sm text-destructive">
                        {errors.registration_number.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label required>Vehicle Type</Label>
                    <SimpleSelect
                      value={vehicleType}
                      onValueChange={(value) => setValue('vehicle_type', value)}
                      options={vehicleTypes}
                      placeholder="Select type"
                    />
                    {errors.vehicle_type && (
                      <p className="text-sm text-destructive">
                        {errors.vehicle_type.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input
                      id="make"
                      placeholder="Toyota"
                      {...register('make')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      placeholder="Corolla"
                      {...register('model')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      placeholder="White"
                      {...register('color')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Customer Name</Label>
                    <Input
                      id="customer_name"
                      placeholder="John Doe"
                      {...register('customer_name')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">Phone Number</Label>
                    <Input
                      id="customer_phone"
                      placeholder="0712 345 678"
                      {...register('customer_phone')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Select Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                {servicesLoading ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      {services
                        .filter((s) => s && s.id && !s.is_addon && s.is_active !== false)
                        .map((service) => {
                          const price = getServicePrice(service);
                          const isSelected = selectedServices.has(String(service.id));

                          return (
                            <div
                              key={String(service.id)}
                              onClick={() => toggleService(String(service.id))}
                              className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex items-center justify-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleService(String(service.id))}
                                  />
                                </div>
                                <div>
                                  <div className="font-medium">{service.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {service.duration_minutes || 0} min
                                  </div>
                                </div>
                              </div>
                              <div className="font-semibold">
                                {formatCurrency(price)}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Add-ons */}
                    {services.some((s) => s && s.id && s.is_addon && s.is_active !== false) && (
                      <>
                        <Separator className="my-4" />
                        <h4 className="font-medium mb-3">Add-ons</h4>
                        <div className="grid gap-3 md:grid-cols-3">
                          {services
                            .filter((s) => s && s.id && s.is_addon && s.is_active !== false)
                            .map((service) => {
                              const price = getServicePrice(service);
                              const isSelected = selectedServices.has(String(service.id));

                              return (
                                <div
                                  key={String(service.id)}
                                  onClick={() => toggleService(String(service.id))}
                                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                                    isSelected
                                      ? 'border-primary bg-primary/5'
                                      : 'border-border hover:border-primary/50'
                                  }`}
                                >
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleService(String(service.id))}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">{service.name}</div>
                                  </div>
                                  <span className="text-sm font-medium">
                                    {formatCurrency(price)}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </>
                    )}

                    {errors.services && (
                      <p className="text-sm text-destructive mt-2">
                        {errors.services.message}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Additional Options */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <SimpleSelect
                      value={watch('priority')}
                      onValueChange={(value) => setValue('priority', value)}
                      options={priorities}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assign Bay</Label>
                    <SimpleSelect
                      value={watch('bay_id') || ''}
                      onValueChange={(value) => setValue('bay_id', value)}
                      options={[
                        { value: '', label: 'Auto-assign' },
                        ...availableBays.map((b) => ({
                          value: b.id,
                          label: `${b.name} (${b.bay_type})`,
                        })),
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assign Staff</Label>
                    <SimpleSelect
                      value={watch('assigned_staff_id') || ''}
                      onValueChange={(value) => setValue('assigned_staff_id', value)}
                      options={[
                        { value: '', label: 'Auto-assign' },
                        ...staffList.map((s) => ({
                          value: s.id,
                          label: s.name,
                        })),
                      ]}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes / Special Instructions</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special instructions or notes about the vehicle..."
                    {...register('notes')}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Vehicle Info */}
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Car className="h-8 w-8 text-primary" />
                  <div>
                    <div className="font-semibold">
                      {registrationNumber
                        ? formatVehicleReg(registrationNumber)
                        : 'No vehicle'}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {vehicleType.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Selected Services */}
                <div className="space-y-2">
                  <h4 className="font-medium">Selected Services</h4>
                  {selectedServices.size === 0 ? (
                    <p className="text-sm text-muted-foreground">No services selected</p>
                  ) : (
                    <div className="space-y-2">
                      {Array.from(selectedServices).map((serviceId) => {
                        const service = services.find((s) => String(s.id) === serviceId);
                        if (!service) return null;
                        const price = getServicePrice(service);

                        return (
                          <div
                            key={serviceId}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>{service.name}</span>
                            <span className="font-medium">{formatCurrency(price)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Duration */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Estimated Time
                  </div>
                  <span className="font-medium">{calculateDuration()} min</span>
                </div>

                <Separator />

                {/* Total */}
                <div className="flex items-center justify-between text-lg">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isCheckingIn || selectedServices.size === 0}
                >
                  {isCheckingIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking In...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Check In Vehicle
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </PageContainer>
  );
}
