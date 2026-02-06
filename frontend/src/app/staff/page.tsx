'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { formatDate, getRelativeTime, cn } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, SearchInput } from '@/components/ui/input';
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
  UserCog,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  Phone,
  Mail,
  Key,
  Loader2,
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, UserRole } from '@/types';
import { useAuthStore } from '@/stores';

const userRoles: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'manager', label: 'Manager', description: 'Branch management & reports' },
  { value: 'supervisor', label: 'Supervisor', description: 'Staff & operations oversight' },
  { value: 'cashier', label: 'Cashier', description: 'POS & payments' },
  { value: 'attendant', label: 'Attendant', description: 'Vehicle washing' },
];

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  role: z.enum(['admin', 'manager', 'supervisor', 'cashier', 'attendant']),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  is_active: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userSchema>;

export default function StaffPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [formDialog, setFormDialog] = React.useState<{
    open: boolean;
    user?: User;
  }>({ open: false });
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    user?: User;
  }>({ open: false });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'attendant',
      is_active: true,
    },
  });

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', { search, role: roleFilter, page }],
    queryFn: () =>
      usersApi.getAll({
        search: search || undefined,
        page,
        limit: 20,
      }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: UserFormData & { password: string }) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Staff member created successfully');
      setFormDialog({ open: false });
      reset();
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to create staff member');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserFormData> }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Staff member updated successfully');
      setFormDialog({ open: false });
      reset();
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to update staff member');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Staff member deleted successfully');
      setDeleteDialog({ open: false });
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to delete staff member');
    },
  });

  const users = usersData?.data || [];
  const pagination = usersData?.pagination;

  const filteredUsers = roleFilter
    ? users.filter((u) => u.role === roleFilter)
    : users;

  const handleOpenForm = (user?: User) => {
    if (user) {
      setValue('name', user.name);
      setValue('email', user.email);
      setValue('phone', user.phone);
      setValue('role', user.role);
      setValue('is_active', user.is_active);
      setValue('password', '');
    } else {
      reset();
    }
    setFormDialog({ open: true, user });
  };

  const onSubmit = (data: UserFormData) => {
    if (formDialog.user) {
      const updateData = { ...data };
      if (!updateData.password) {
        delete updateData.password;
      }
      updateMutation.mutate({ id: formDialog.user.id, data: updateData });
    } else {
      if (!data.password) {
        toast.error('Password is required for new users');
        return;
      }
      createMutation.mutate(data as UserFormData & { password: string });
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'supervisor':
        return 'info';
      case 'cashier':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Staff Management"
        description="Manage your team members and their access levels"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Staff' },
        ]}
        actions={
          <Button onClick={() => handleOpenForm()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-success-600">
                  {users.filter((u) => u.is_active).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-success-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Managers</p>
                <p className="text-2xl font-bold">
                  {users.filter((u) => ['admin', 'manager'].includes(u.role)).length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendants</p>
                <p className="text-2xl font-bold">
                  {users.filter((u) => u.role === 'attendant').length}
                </p>
              </div>
              <UserCog className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px] max-w-md">
          <SearchInput
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <SimpleSelect
          value={roleFilter}
          onValueChange={setRoleFilter}
          options={[
            { value: '', label: 'All Roles' },
            ...userRoles.map((r) => ({ value: r.value, label: r.label })),
          ]}
          className="w-[150px]"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton columns={7} rows={5} />
              ) : filteredUsers.length === 0 ? (
                <TableEmpty
                  colSpan={7}
                  title="No staff members found"
                  description="Add your first staff member to get started"
                  icon={<UserCog className="h-12 w-12" />}
                  action={
                    <Button onClick={() => handleOpenForm()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Staff
                    </Button>
                  }
                />
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={user.name} src={user.avatar_url} size="sm" />
                        <div>
                          <div className="font-medium">{user.name}</div>
                          {user.id === currentUser?.id && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {user.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.last_login ? (
                        <span className="text-sm">{getRelativeTime(user.last_login)}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(user.created_at, 'PP')}</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenForm(user)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Key className="h-4 w-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteDialog({ open: true, user })}
                            disabled={user.id === currentUser?.id}
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

      {/* Form Dialog */}
      <Dialog open={formDialog.open} onOpenChange={(open) => setFormDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formDialog.user ? 'Edit Staff Member' : 'Add New Staff Member'}
            </DialogTitle>
            <DialogDescription>
              {formDialog.user
                ? 'Update staff member information'
                : 'Enter the staff member details below'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" required>
                Full Name
              </Label>
              <Input id="name" {...register('name')} placeholder="John Doe" />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" required>
                Email
              </Label>
              <Input id="email" type="email" {...register('email')} placeholder="john@example.com" />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
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
              <Label>Role</Label>
              <SimpleSelect
                value={watch('role')}
                onValueChange={(value) => setValue('role', value as UserRole)}
                options={userRoles.map((r) => ({
                  value: r.value,
                  label: `${r.label} - ${r.description}`,
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {formDialog.user ? 'New Password (leave blank to keep current)' : 'Password'}
              </Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder={formDialog.user ? 'Enter new password' : 'Enter password'}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
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
                {formDialog.user ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteDialog.user?.name}? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.user && deleteMutation.mutate(deleteDialog.user.id)}
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
