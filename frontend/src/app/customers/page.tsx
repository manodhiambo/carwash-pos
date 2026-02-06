'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import { formatCurrency, formatPhoneNumber, getRelativeTime, cn } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, SearchInput, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
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
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  Car,
  Gift,
  Star,
  Crown,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Customer, CustomerType } from '@/types';

const customerTypes = [
  { value: 'individual', label: 'Individual' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'vip', label: 'VIP' },
];

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  address: z.string().optional(),
  customer_type: z.enum(['individual', 'corporate', 'vip']),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [formDialog, setFormDialog] = React.useState<{
    open: boolean;
    customer?: Customer;
  }>({ open: false });
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    customer?: Customer;
  }>({ open: false });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customer_type: 'individual',
    },
  });

  // Fetch customers
  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', { search, customer_type: typeFilter, page }],
    queryFn: () =>
      customersApi.getAll({
        search: search || undefined,
        customer_type: typeFilter || undefined,
        page,
        limit: 20,
      }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CustomerFormData) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully');
      setFormDialog({ open: false });
      reset();
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to create customer');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerFormData> }) =>
      customersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated successfully');
      setFormDialog({ open: false });
      reset();
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to update customer');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully');
      setDeleteDialog({ open: false });
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to delete customer');
    },
  });

  const customers = customersData?.data || [];
  const pagination = customersData?.pagination;

  const handleOpenForm = (customer?: Customer) => {
    if (customer) {
      setValue('name', customer.name);
      setValue('phone', customer.phone);
      setValue('email', customer.email || '');
      setValue('address', customer.address || '');
      setValue('customer_type', customer.customer_type);
      setValue('notes', customer.notes || '');
    } else {
      reset();
    }
    setFormDialog({ open: true, customer });
  };

  const onSubmit = (data: CustomerFormData) => {
    if (formDialog.customer) {
      updateMutation.mutate({ id: formDialog.customer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getCustomerTypeIcon = (type: CustomerType) => {
    switch (type) {
      case 'vip':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'corporate':
        return <Users className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Customers"
        description="Manage your customer database and loyalty programs"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customers' },
        ]}
        actions={
          <Button onClick={() => handleOpenForm()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px] max-w-md">
          <SearchInput
            placeholder="Search by name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <SimpleSelect
          value={typeFilter}
          onValueChange={setTypeFilter}
          options={[{ value: '', label: 'All Types' }, ...customerTypes]}
          className="w-[150px]"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{pagination?.total || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">VIP Customers</p>
                <p className="text-2xl font-bold">
                  {customers.filter((c) => c.customer_type === 'vip').length}
                </p>
              </div>
              <Crown className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Corporate</p>
                <p className="text-2xl font-bold">
                  {customers.filter((c) => c.customer_type === 'corporate').length}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active This Month</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <Star className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Vehicles</TableHead>
                <TableHead>Visits</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Loyalty Points</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton columns={8} rows={5} />
              ) : customers.length === 0 ? (
                <TableEmpty
                  colSpan={8}
                  title="No customers found"
                  description="Add your first customer to get started"
                  icon={<Users className="h-12 w-12" />}
                  action={
                    <Button onClick={() => handleOpenForm()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Customer
                    </Button>
                  }
                />
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={customer.name} size="sm" />
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            {customer.name}
                            {getCustomerTypeIcon(customer.customer_type)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {formatPhoneNumber(customer.phone)}
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          customer.customer_type === 'vip'
                            ? 'warning'
                            : customer.customer_type === 'corporate'
                            ? 'info'
                            : 'secondary'
                        }
                        className="capitalize"
                      >
                        {customer.customer_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        {customer.vehicles?.length || 0}
                      </div>
                    </TableCell>
                    <TableCell>{customer.total_visits}</TableCell>
                    <TableCell>{formatCurrency(customer.total_spent)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Gift className="h-4 w-4 text-primary" />
                        {customer.loyalty_points}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/customers/${customer.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenForm(customer)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteDialog({ open: true, customer })}
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
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pagination.limit + 1} to{' '}
            {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.has_prev}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.has_next}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formDialog.open} onOpenChange={(open) => setFormDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formDialog.customer ? 'Edit Customer' : 'Add New Customer'}
            </DialogTitle>
            <DialogDescription>
              {formDialog.customer
                ? 'Update customer information'
                : 'Enter the customer details below'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" required>
                Name
              </Label>
              <Input id="name" {...register('name')} placeholder="John Doe" />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" required>
                Phone Number
              </Label>
              <Input id="phone" {...register('phone')} placeholder="0712 345 678" />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="john@example.com" />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Customer Type</Label>
              <SimpleSelect
                value={watch('customer_type')}
                onValueChange={(value) => setValue('customer_type', value as CustomerType)}
                options={customerTypes}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} placeholder="Address" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register('notes')} placeholder="Any notes..." rows={3} />
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
                {formDialog.customer ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteDialog.customer?.name}? This action cannot
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
                deleteDialog.customer && deleteMutation.mutate(deleteDialog.customer.id)
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
