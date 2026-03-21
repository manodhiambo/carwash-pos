'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { servicesApi, vehiclesApi, jobsApi, baysApi, usersApi, customersApi } from '@/lib/api';
import { useJobStore } from '@/stores';
import { formatCurrency, formatVehicleReg } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { Textarea } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Car,
  Search,
  User as UserIcon,
  Wrench,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Plus,
  Percent,
  TrendingUp,
  ExternalLink,
  Star,
  Gift,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VehicleType, Service, JobPriority, Bay, User, Job, Customer } from '@/types';

const PRESET_COMMISSION_RATES = [10, 15, 20, 25, 30, 35, 40, 45, 50];

// Default commission rates by service name keywords
const getDefaultCommissionRate = (serviceName: string): number => {
  const name = serviceName.toLowerCase();
  if (name.includes('motorbike') || name.includes('motorcycle') || name.includes('bike')) return 40;
  if (name.includes('truck') || name.includes('lorry') || name.includes('trailer')) return 25;
  if (name.includes('bus') || name.includes('matatu') || name.includes('van')) return 25;
  if (name.includes('suv') || name.includes('4x4') || name.includes('pickup')) return 35;
  return 30; // default for saloon/standard wash
};

const vehicleTypes = [
  { value: 'saloon', label: 'Sedan / Saloon' },
  { value: 'suv', label: 'SUV / 4x4' },
  { value: 'pickup', label: 'Pickup Truck' },
  { value: 'van', label: 'Van / Minibus' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'bus', label: 'Bus / Matatu' },
  { value: 'truck', label: 'Truck / Lorry' },
  { value: 'trailer', label: 'Trailer' },
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
  const [customPrices, setCustomPrices] = React.useState<Record<string, number>>({});
  const [commissionRates, setCommissionRates] = React.useState<Record<string, number>>({});

  // Loyalty points for returning customer
  const [customerLoyaltyPoints, setCustomerLoyaltyPoints] = React.useState<number | null>(null);

  // Customer search
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [customerSearchResults, setCustomerSearchResults] = React.useState<Customer[]>([]);
  const [searchingCustomer, setSearchingCustomer] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = React.useState(false);
  const customerSearchRef = React.useRef<HTMLDivElement>(null);

  // Duplicate detection state
  const [activeJob, setActiveJob] = React.useState<Job | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = React.useState(false);
  const [addServiceMode, setAddServiceMode] = React.useState(false);
  const [addServiceSelected, setAddServiceSelected] = React.useState<Set<string>>(new Set());
  const [isAddingService, setIsAddingService] = React.useState(false);

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
      vehicle_type: 'saloon',
      services: [],
      priority: 'normal',
      bay_id: '',
      assigned_staff_id: '',
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

  const services = (servicesData?.data || []) as Service[];
  const availableBays = ((baysData?.data || []) as Bay[]).filter((b) => b.status === 'available');
  const staffList = ((staffData?.data || []) as User[]).filter((u) => ['attendant', 'supervisor'].includes(u.role));

  // Search for existing vehicle AND check for active jobs
  const handleVehicleSearch = async () => {
    if (!registrationNumber || registrationNumber.length < 4) return;

    setSearchingVehicle(true);
    setFoundVehicle(null);
    setActiveJob(null);
    setCustomerLoyaltyPoints(null);

    const cleanReg = registrationNumber.replace(/\s/g, '').toUpperCase();

    try {
      // Run both checks in parallel
      const [vehicleResult, activeJobsResult] = await Promise.allSettled([
        vehiclesApi.getByRegistration(cleanReg),
        jobsApi.getAll({
          search: cleanReg,
          status: 'checked_in,in_queue,washing,detailing',
          limit: 5,
        }),
      ]);

      // Handle vehicle lookup
      if (vehicleResult.status === 'fulfilled' && vehicleResult.value.data) {
        const vehicle = vehicleResult.value.data;
        setValue('vehicle_type', vehicle.vehicle_type);
        setValue('make', vehicle.make || '');
        setValue('model', vehicle.model || '');
        setValue('color', vehicle.color || '');
        if (vehicle.customer) {
          const cust = vehicle.customer as any;
          setValue('customer_name', cust.name);
          setValue('customer_phone', cust.phone);
          if (typeof cust.loyalty_points === 'number') {
            setCustomerLoyaltyPoints(cust.loyalty_points);
          }
          // Auto-select the linked customer
          if (cust.id) {
            setSelectedCustomer(cust as Customer);
          }
        }
        setFoundVehicle(true);
      } else {
        setFoundVehicle(false);
      }

      // Check for active (non-completed) jobs for this registration
      if (activeJobsResult.status === 'fulfilled') {
        const jobs = activeJobsResult.value.data || [];
        // Filter to exact registration match (search is partial)
        const matchingJob = jobs.find(
          (j: any) =>
            (j.registration_no || j.vehicle?.registration_no || '')
              .replace(/\s/g, '')
              .toUpperCase() === cleanReg
        );
        if (matchingJob) {
          setActiveJob(matchingJob as unknown as Job);
          setShowDuplicateModal(true);
        }
      }
    } catch {
      setFoundVehicle(false);
    } finally {
      setSearchingVehicle(false);
    }
  };

  // Close customer dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search customers as user types
  const handleCustomerSearch = React.useCallback(async (query: string) => {
    setCustomerSearch(query);
    if (query.length < 2) {
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
      return;
    }
    setSearchingCustomer(true);
    try {
      const result = await customersApi.search(query);
      const customers = (result.data as any) || [];
      setCustomerSearchResults(Array.isArray(customers) ? customers : []);
      setShowCustomerDropdown(true);
    } catch {
      setCustomerSearchResults([]);
    } finally {
      setSearchingCustomer(false);
    }
  }, []);

  // Select a customer from the dropdown
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setValue('customer_name', customer.name);
    setValue('customer_phone', customer.phone);
    if (typeof customer.loyalty_points === 'number') {
      setCustomerLoyaltyPoints(customer.loyalty_points);
    }
  };

  // Clear selected customer
  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setValue('customer_name', '');
    setValue('customer_phone', '');
    setCustomerLoyaltyPoints(null);
  };

  // Add selected services to the existing active job
  const handleAddServiceToExistingJob = async () => {
    if (!activeJob || addServiceSelected.size === 0) return;
    setIsAddingService(true);
    try {
      for (const serviceId of Array.from(addServiceSelected)) {
        await jobsApi.addService(String((activeJob as any).id), serviceId);
      }
      toast.success(`${addServiceSelected.size} service(s) added to Job #${(activeJob as any).job_no || (activeJob as any).job_number}`);
      setShowDuplicateModal(false);
      router.push(`/jobs/${(activeJob as any).id}`);
    } catch (err: any) {
      toast.error(err?.error || 'Failed to add service to existing job');
    } finally {
      setIsAddingService(false);
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
      // Auto-set default commission rate when service is selected
      if (!commissionRates[serviceId]) {
        const service = services.find((s) => String(s.id) === serviceId);
        if (service) {
          setCommissionRates((prev) => ({
            ...prev,
            [serviceId]: getDefaultCommissionRate(service.name),
          }));
        }
      }
    }
    setSelectedServices(newSelected);
    setValue('services', Array.from(newSelected));
  };

  // Calculate total commission
  const calculateCommission = () => {
    let total = 0;
    selectedServices.forEach((serviceId) => {
      const service = services.find((s) => String(s.id) === serviceId);
      if (service) {
        const price = getServicePrice(service);
        const displayPrice = price > 0 ? price : (customPrices[serviceId] || 0);
        const rate = commissionRates[serviceId] || 0;
        total += (displayPrice * rate) / 100;
      }
    });
    return total;
  };

  // Calculate total price
  const calculateTotal = () => {
    let total = 0;
    selectedServices.forEach((serviceId) => {
      const service = services.find((s) => String(s.id) === serviceId);
      if (service) {
        const price = getServicePrice(service);
        total += price > 0 ? price : (customPrices[serviceId] || 0);
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
    const pricing = (service as any).pricing || (service as any).prices || [];
    const priceInfo = pricing.find((p: { vehicle_type: string; price: number }) => p.vehicle_type === vehicleType);
    return priceInfo?.price || service.base_price || 0;
  };

  // Check if service has variable pricing (no fixed price)
  const isVariablePrice = (service: Service) => {
    const price = getServicePrice(service);
    return price === 0;
  };

  // Submit form
  const onSubmit = async (data: CheckInFormData) => {
    // Safety net: check for active job before submitting
    if (!activeJob) {
      const cleanReg = data.registration_number.replace(/\s/g, '').toUpperCase();
      try {
        const activeJobsResult = await jobsApi.getAll({
          search: cleanReg,
          status: 'checked_in,in_queue,washing,detailing',
          limit: 5,
        });
        const jobs = activeJobsResult.data || [];
        const matchingJob = jobs.find(
          (j: any) =>
            (j.registration_no || j.vehicle?.registration_no || '')
              .replace(/\s/g, '')
              .toUpperCase() === cleanReg
        );
        if (matchingJob) {
          setActiveJob(matchingJob as unknown as Job);
          setShowDuplicateModal(true);
          return; // Stop submission and show modal
        }
      } catch {
        // If check fails, allow submission to proceed
      }
    }

    try {
      // Calculate weighted-average commission rate across selected services
      // so the rate set in the UI is preserved on the backend.
      let totalCommissionValue = 0;
      let totalServiceValue = 0;
      data.services.forEach((id: string) => {
        const service = services.find((s) => String(s.id) === id);
        if (service) {
          const price = customPrices[id] || getServicePrice(service) || 0;
          const rate = commissionRates[id] || 0;
          totalCommissionValue += price * rate;
          totalServiceValue += price;
        }
      });
      const effectiveCommissionRate =
        totalServiceValue > 0 ? totalCommissionValue / totalServiceValue : 0;

      const job = await checkIn({
        registration_no: data.registration_number.replace(/\s/g, '').toUpperCase(),
        vehicle_type: data.vehicle_type as VehicleType,
        vehicle_make: data.make,
        vehicle_model: data.model,
        vehicle_color: data.color,
        ...(selectedCustomer ? { customer_id: selectedCustomer.id } : {}),
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        services: data.services.map((id: string) => ({
          service_id: Number(id),
          quantity: 1,
          ...(customPrices[id] ? { price: customPrices[id] } : {}),
        })),
        priority: data.priority as JobPriority,
        bay_id: data.bay_id,
        assigned_staff_id: data.assigned_staff_id,
        ...(effectiveCommissionRate > 0 ? { commission_rate_override: effectiveCommissionRate } : {}),
        notes: data.notes,
      });

      toast.success(`Vehicle checked in! Job #${(job as any).job_number}`);
      router.push('/jobs');
    } catch (error: any) {
      toast.error(error.error || 'Failed to check in vehicle');
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
                    {foundVehicle === true && !activeJob && (
                      <p className="text-sm text-success-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Returning customer
                      </p>
                    )}
                    {foundVehicle === false && !activeJob && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" /> New vehicle
                      </p>
                    )}
                    {activeJob && (
                      <button
                        type="button"
                        onClick={() => setShowDuplicateModal(true)}
                        className="text-sm text-orange-600 flex items-center gap-1 hover:underline text-left"
                      >
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        Already checked in — Job #{(activeJob as any).job_no || (activeJob as any).job_number}. Tap to manage.
                      </button>
                    )}

                    {/* Loyalty points banner for returning customer */}
                    {foundVehicle === true && customerLoyaltyPoints !== null && customerLoyaltyPoints > 0 && !activeJob && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        <div className="text-sm">
                          <span className="font-semibold text-yellow-700">
                            {customerLoyaltyPoints.toLocaleString()} loyalty points
                          </span>
                          <span className="text-yellow-600"> available</span>
                          <span className="text-yellow-500 text-xs ml-1">
                            (worth KES {customerLoyaltyPoints.toLocaleString()})
                          </span>
                        </div>
                      </div>
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
                  <UserIcon className="h-5 w-5" />
                  Customer Information (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer search */}
                {!selectedCustomer ? (
                  <div ref={customerSearchRef} className="relative">
                    <Label className="mb-2 block">Search Customer by Name or Phone</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="e.g. John or 0712 345 678"
                        value={customerSearch}
                        onChange={(e) => handleCustomerSearch(e.target.value)}
                        onFocus={() => customerSearchResults.length > 0 && setShowCustomerDropdown(true)}
                        className="pl-9"
                      />
                      {searchingCustomer && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {showCustomerDropdown && customerSearchResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border bg-popover shadow-lg overflow-hidden">
                        {customerSearchResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => handleSelectCustomer(c)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors border-b last:border-b-0"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{c.name}</div>
                              <div className="text-xs text-muted-foreground">{c.phone}</div>
                            </div>
                            {c.loyalty_points > 0 && (
                              <div className="flex items-center gap-1 text-xs text-yellow-600 shrink-0">
                                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                {c.loyalty_points.toLocaleString()} pts
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {showCustomerDropdown && customerSearch.length >= 2 && !searchingCustomer && customerSearchResults.length === 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border bg-popover shadow-lg px-4 py-3 text-sm text-muted-foreground">
                        No customers found — fill in details below to create one
                      </div>
                    )}
                  </div>
                ) : (
                  /* Selected customer chip */
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50">
                    <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <UserIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-green-800">{selectedCustomer.name}</div>
                      <div className="text-xs text-green-600">{selectedCustomer.phone}</div>
                    </div>
                    {selectedCustomer.loyalty_points > 0 && (
                      <div className="flex items-center gap-1 text-xs text-yellow-600 shrink-0">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {selectedCustomer.loyalty_points.toLocaleString()} pts
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="p-1 rounded-full hover:bg-green-200 transition-colors shrink-0"
                    >
                      <X className="h-4 w-4 text-green-700" />
                    </button>
                  </div>
                )}

                {/* Manual entry fallback */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Name</Label>
                    <Input
                      id="customer_name"
                      placeholder="John Doe"
                      {...register('customer_name')}
                      readOnly={!!selectedCustomer}
                      className={selectedCustomer ? 'bg-muted' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">Phone Number</Label>
                    <Input
                      id="customer_phone"
                      placeholder="0712 345 678"
                      {...register('customer_phone')}
                      readOnly={!!selectedCustomer}
                      className={selectedCustomer ? 'bg-muted' : ''}
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
                        .filter((s) => s && s.id && !(s as any).is_addon && (s.is_active !== false))
                        .map((service) => {
                          const price = getServicePrice(service);
                          const isSelected = selectedServices.has(String(service.id));

                          const hasVariablePrice = price === 0;
                          const serviceIdStr = String(service.id);

                          return (
                            <div key={serviceIdStr} className="space-y-2">
                              <div
                                onClick={() => toggleService(serviceIdStr)}
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
                                      onCheckedChange={() => toggleService(serviceIdStr)}
                                    />
                                  </div>
                                  <div>
                                    <div className="font-medium">{service.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {service.duration_minutes || 0} min
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">
                                    {hasVariablePrice ? 'Custom' : formatCurrency(price)}
                                  </div>
                                  {isSelected && commissionRates[serviceIdStr] && (
                                    <div className="text-xs text-green-600 font-medium flex items-center gap-0.5 justify-end">
                                      <Percent className="h-3 w-3" />
                                      {commissionRates[serviceIdStr]}% commission
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="ml-10 space-y-2" onClick={(e) => e.stopPropagation()}>
                                  {hasVariablePrice && (
                                    <Input
                                      type="number"
                                      placeholder="Enter price (KES)"
                                      value={customPrices[serviceIdStr] || ''}
                                      onChange={(e) =>
                                        setCustomPrices((prev) => ({
                                          ...prev,
                                          [serviceIdStr]: parseFloat(e.target.value) || 0,
                                        }))
                                      }
                                    />
                                  )}
                                  <div className="flex flex-wrap gap-1 items-center">
                                    <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1">
                                      <Percent className="h-3 w-3" /> Commission:
                                    </span>
                                    {PRESET_COMMISSION_RATES.map((rate) => (
                                      <button
                                        key={rate}
                                        type="button"
                                        onClick={() =>
                                          setCommissionRates((prev) => ({
                                            ...prev,
                                            [serviceIdStr]: rate,
                                          }))
                                        }
                                        className={`px-2 py-0.5 text-xs rounded-full border transition-all ${
                                          commissionRates[serviceIdStr] === rate
                                            ? 'bg-green-600 text-white border-green-600'
                                            : 'border-border text-muted-foreground hover:border-green-600 hover:text-green-600'
                                        }`}
                                      >
                                        {rate}%
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    {/* Add-ons */}
                    {services.some((s) => s && s.id && (s as any).is_addon && (s.is_active !== false)) && (
                      <>
                        <Separator className="my-4" />
                        <h4 className="font-medium mb-3">Add-ons</h4>
                        <div className="grid gap-3 md:grid-cols-3">
                          {services
                            .filter((s) => s && s.id && (s as any).is_addon && (s.is_active !== false))
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
                          value: String(b.id),
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
                          value: String(s.id),
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
                        const displayPrice = price > 0 ? price : (customPrices[serviceId] || 0);

                        return (
                          <div
                            key={serviceId}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>{service.name}</span>
                            <span className="font-medium">
                              {displayPrice > 0 ? formatCurrency(displayPrice) : 'Enter price'}
                            </span>
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

                {/* Loyalty Points Estimate */}
                {calculateTotal() > 0 && foundVehicle === true && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-yellow-700">
                        <Gift className="h-4 w-4" />
                        Points to Earn
                      </div>
                      <span className="font-bold text-yellow-700">
                        +{Math.floor(calculateTotal())} pts
                      </span>
                    </div>
                    {customerLoyaltyPoints !== null && customerLoyaltyPoints > 0 && (
                      <div className="text-xs text-yellow-600 mt-1">
                        Balance after visit: {(customerLoyaltyPoints + Math.floor(calculateTotal())).toLocaleString()} pts
                      </div>
                    )}
                  </div>
                )}

                {/* Commission Preview */}
                {calculateCommission() > 0 && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <TrendingUp className="h-4 w-4" />
                        Worker Commission
                      </div>
                      <span className="font-bold text-green-700">
                        {formatCurrency(calculateCommission())}
                      </span>
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Based on selected commission rates
                    </div>
                  </div>
                )}

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

      {/* Duplicate Vehicle Modal */}
      <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Vehicle Already Checked In
            </DialogTitle>
            <DialogDescription>
              This vehicle has an active job in progress. You can add a new service to the existing
              job, or dismiss to review.
            </DialogDescription>
          </DialogHeader>

          {activeJob && (
            <div className="space-y-4 px-6 pb-6">
              {/* Existing Job Info */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center">
                      <Car className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">
                        {(activeJob as any).registration_no || registrationNumber}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {(activeJob as any).vehicle_type || ''}
                      </div>
                    </div>
                  </div>
                  <Badge variant="warning">
                    {((activeJob as any).status || '').replace('_', ' ')}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Job #:</span>{' '}
                    <span className="font-medium">{(activeJob as any).job_no || (activeJob as any).job_number}</span>
                  </div>
                  {(activeJob as any).bay_name && (
                    <div>
                      <span className="text-muted-foreground">Bay:</span>{' '}
                      <span className="font-medium">{(activeJob as any).bay_name}</span>
                    </div>
                  )}
                  {(activeJob as any).final_amount > 0 && (
                    <div>
                      <span className="text-muted-foreground">Current Total:</span>{' '}
                      <span className="font-medium text-primary">
                        {formatCurrency((activeJob as any).final_amount)}
                      </span>
                    </div>
                  )}
                </div>
                {(activeJob as any).services && (activeJob as any).services.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-orange-200">
                    <p className="text-xs text-muted-foreground mb-1">Current services:</p>
                    <div className="flex flex-wrap gap-1">
                      {((activeJob as any).services as any[]).map((s: any, i: number) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-white border border-orange-200 rounded-full">
                          {s.name || s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Add Service Section */}
              {!addServiceMode ? (
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => setAddServiceMode(true)}
                    className="w-full gap-2"
                    variant="default"
                  >
                    <Plus className="h-4 w-4" />
                    Add Another Service to This Job
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/jobs/${(activeJob as any).id}`)}
                    className="w-full gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Existing Job
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowDuplicateModal(false);
                      setActiveJob(null);
                    }}
                    className="w-full text-muted-foreground"
                  >
                    Dismiss — Continue with New Check-In
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Select services to add:</p>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {services
                      .filter((s) => s && s.id && s.is_active !== false)
                      .map((service) => {
                        const serviceIdStr = String(service.id);
                        const isSelected = addServiceSelected.has(serviceIdStr);
                        const price = getServicePrice(service);
                        return (
                          <div
                            key={serviceIdStr}
                            onClick={() => {
                              const next = new Set(addServiceSelected);
                              if (next.has(serviceIdStr)) next.delete(serviceIdStr);
                              else next.add(serviceIdStr);
                              setAddServiceSelected(next);
                            }}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/40'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => {
                                  const next = new Set(addServiceSelected);
                                  if (next.has(serviceIdStr)) next.delete(serviceIdStr);
                                  else next.add(serviceIdStr);
                                  setAddServiceSelected(next);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div>
                                <div className="text-sm font-medium">{service.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {service.duration_minutes || 0} min
                                </div>
                              </div>
                            </div>
                            <div className="text-sm font-semibold">
                              {price > 0 ? formatCurrency(price) : 'Custom'}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddServiceMode(false)}>
                      Back
                    </Button>
                    <Button
                      onClick={handleAddServiceToExistingJob}
                      disabled={addServiceSelected.size === 0 || isAddingService}
                      className="gap-2"
                    >
                      {isAddingService ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add {addServiceSelected.size > 0 ? `${addServiceSelected.size} ` : ''}Service
                      {addServiceSelected.size !== 1 ? 's' : ''}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
