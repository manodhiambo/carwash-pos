'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, suppliersApi } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { PageContainer, PageHeader, Section } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, SearchInput, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress, LabeledProgress } from '@/components/ui/progress';
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
  Package,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  TrendingDown,
  Loader2,
  Truck,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { InventoryItem, InventoryCategory, Supplier } from '@/types';

const inventoryCategories: { value: InventoryCategory; label: string }[] = [
  { value: 'chemicals', label: 'Chemicals' },
  { value: 'consumables', label: 'Consumables' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'spare_parts', label: 'Spare Parts' },
  { value: 'cleaning_supplies', label: 'Cleaning Supplies' },
  { value: 'other', label: 'Other' },
];

const inventorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.enum(['chemicals', 'consumables', 'equipment', 'spare_parts', 'cleaning_supplies', 'other']),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  min_stock_level: z.number().min(0),
  max_stock_level: z.number().min(1),
  reorder_point: z.number().min(0),
  unit_cost: z.number().min(0),
  supplier_id: z.string().optional(),
  location: z.string().optional(),
});

type InventoryFormData = z.infer<typeof inventorySchema>;

const stockSchema = z.object({
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_cost: z.number().min(0).optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type StockFormData = z.infer<typeof stockSchema>;

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [lowStockOnly, setLowStockOnly] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('items');
  const [formDialog, setFormDialog] = React.useState<{
    open: boolean;
    item?: InventoryItem;
  }>({ open: false });
  const [stockDialog, setStockDialog] = React.useState<{
    open: boolean;
    item?: InventoryItem;
    type: 'add' | 'remove';
  }>({ open: false, type: 'add' });
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    item?: InventoryItem;
  }>({ open: false });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      category: 'consumables',
      unit: 'pcs',
      min_stock_level: 10,
      max_stock_level: 100,
      reorder_point: 20,
      unit_cost: 0,
    },
  });

  const {
    register: registerStock,
    handleSubmit: handleStockSubmit,
    reset: resetStock,
    formState: { errors: stockErrors },
  } = useForm<StockFormData>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      quantity: 1,
    },
  });

  // Fetch inventory
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', { search, category: categoryFilter, low_stock: lowStockOnly }],
    queryFn: () =>
      inventoryApi.getAll({
        search: search || undefined,
        category: categoryFilter || undefined,
        low_stock: lowStockOnly || undefined,
        limit: 100,
      }),
  });

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.getAll({ limit: 100 }),
  });

  // Fetch low stock
  const { data: lowStockData } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => inventoryApi.getLowStock(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: InventoryFormData) => inventoryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item created successfully');
      setFormDialog({ open: false });
      reset();
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to create item');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryFormData> }) =>
      inventoryApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item updated successfully');
      setFormDialog({ open: false });
      reset();
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to update item');
    },
  });

  // Add stock mutation
  const addStockMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: StockFormData }) =>
      inventoryApi.addStock(id, data.quantity, data.unit_cost || 0, data.reference_number, data.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      toast.success('Stock added successfully');
      setStockDialog({ open: false, type: 'add' });
      resetStock();
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to add stock');
    },
  });

  // Remove stock mutation
  const removeStockMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: StockFormData }) =>
      inventoryApi.removeStock(id, data.quantity, data.notes || 'Stock removed', data.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      toast.success('Stock removed successfully');
      setStockDialog({ open: false, type: 'remove' });
      resetStock();
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to remove stock');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item deleted successfully');
      setDeleteDialog({ open: false });
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || 'Failed to delete item');
    },
  });

  const items = inventoryData?.data || [];
  const suppliers = suppliersData?.data || [];
  const lowStockItems = lowStockData?.data || [];

  const handleOpenForm = (item?: InventoryItem) => {
    if (item) {
      setValue('name', item.name);
      setValue('sku', item.sku);
      setValue('category', item.category);
      setValue('description', item.description || '');
      setValue('unit', item.unit);
      setValue('min_stock_level', item.min_stock_level);
      setValue('max_stock_level', item.max_stock_level);
      setValue('reorder_point', item.reorder_point);
      setValue('unit_cost', item.unit_cost);
      setValue('supplier_id', item.supplier_id || '');
      setValue('location', item.location || '');
    } else {
      reset();
    }
    setFormDialog({ open: true, item });
  };

  const handleOpenStockDialog = (item: InventoryItem, type: 'add' | 'remove') => {
    resetStock();
    setStockDialog({ open: true, item, type });
  };

  const onSubmit = (data: InventoryFormData) => {
    if (formDialog.item) {
      updateMutation.mutate({ id: formDialog.item.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const onStockSubmit = (data: StockFormData) => {
    if (!stockDialog.item) return;

    if (stockDialog.type === 'add') {
      addStockMutation.mutate({ id: stockDialog.item.id, data });
    } else {
      removeStockMutation.mutate({ id: stockDialog.item.id, data });
    }
  };

  const getStockLevel = (item: InventoryItem) => {
    const percentage = (item.current_stock / item.max_stock_level) * 100;
    if (item.current_stock <= item.min_stock_level) return 'critical';
    if (item.current_stock <= item.reorder_point) return 'low';
    return 'normal';
  };

  return (
    <PageContainer>
      <PageHeader
        title="Inventory"
        description="Manage stock levels and track consumables"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory' },
        ]}
        actions={
          <Button onClick={() => handleOpenForm()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-warning-600">{lowStockItems.length}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-warning-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-destructive">
                  {items.filter((i) => i.current_stock <= i.min_stock_level).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suppliers</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
              <Truck className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px] max-w-md">
          <SearchInput
            placeholder="Search by name, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <SimpleSelect
          value={categoryFilter}
          onValueChange={setCategoryFilter}
          options={[{ value: '', label: 'All Categories' }, ...inventoryCategories]}
          className="w-[180px]"
        />
        <Button
          variant={lowStockOnly ? 'default' : 'outline'}
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className="gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          Low Stock Only
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton columns={7} rows={5} />
              ) : items.length === 0 ? (
                <TableEmpty
                  colSpan={7}
                  title="No inventory items found"
                  description="Add your first inventory item to get started"
                  icon={<Package className="h-12 w-12" />}
                  action={
                    <Button onClick={() => handleOpenForm()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  }
                />
              ) : (
                items.map((item) => {
                  const stockLevel = getStockLevel(item);
                  const stockPercentage = Math.min(
                    100,
                    (item.current_stock / item.max_stock_level) * 100
                  );

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            SKU: {item.sku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {item.category.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {item.current_stock} {item.unit}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Min: {item.min_stock_level} / Max: {item.max_stock_level}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <Progress
                            value={stockPercentage}
                            className="h-2"
                            indicatorClassName={cn(
                              stockLevel === 'critical'
                                ? 'bg-destructive'
                                : stockLevel === 'low'
                                ? 'bg-warning-500'
                                : 'bg-success-500'
                            )}
                          />
                          {stockLevel !== 'normal' && (
                            <div
                              className={cn(
                                'text-xs mt-1 font-medium',
                                stockLevel === 'critical'
                                  ? 'text-destructive'
                                  : 'text-warning-600'
                              )}
                            >
                              {stockLevel === 'critical' ? 'Critical' : 'Low Stock'}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                      <TableCell>
                        {item.supplier?.name || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => handleOpenStockDialog(item, 'add')}
                          >
                            <ArrowUp className="h-4 w-4 text-success-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => handleOpenStockDialog(item, 'remove')}
                          >
                            <ArrowDown className="h-4 w-4 text-destructive" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenForm(item)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <History className="h-4 w-4 mr-2" />
                                View History
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteDialog({ open: true, item })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Item Form Dialog */}
      <Dialog open={formDialog.open} onOpenChange={(open) => setFormDialog({ open })}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {formDialog.item ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
            <DialogDescription>
              {formDialog.item
                ? 'Update inventory item details'
                : 'Enter the item details below'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" required>
                  Item Name
                </Label>
                <Input id="name" {...register('name')} placeholder="Car Shampoo" />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku" required>
                  SKU
                </Label>
                <Input id="sku" {...register('sku')} placeholder="CS-001" />
                {errors.sku && (
                  <p className="text-sm text-destructive">{errors.sku.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <SimpleSelect
                  value={watch('category')}
                  onValueChange={(value) => setValue('category', value as InventoryCategory)}
                  options={inventoryCategories}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit" required>
                  Unit
                </Label>
                <Input id="unit" {...register('unit')} placeholder="liters, pcs, kg" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="min_stock_level">Min Stock</Label>
                <Input
                  id="min_stock_level"
                  type="number"
                  {...register('min_stock_level', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorder_point">Reorder Point</Label>
                <Input
                  id="reorder_point"
                  type="number"
                  {...register('reorder_point', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_stock_level">Max Stock</Label>
                <Input
                  id="max_stock_level"
                  type="number"
                  {...register('max_stock_level', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="unit_cost">Unit Cost (KES)</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  {...register('unit_cost', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <SimpleSelect
                  value={watch('supplier_id') || ''}
                  onValueChange={(value) => setValue('supplier_id', value)}
                  options={[
                    { value: '', label: 'Select Supplier' },
                    ...suppliers.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Item description..."
                rows={2}
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
                {formDialog.item ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Dialog */}
      <Dialog open={stockDialog.open} onOpenChange={(open) => setStockDialog({ ...stockDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {stockDialog.type === 'add' ? 'Add Stock' : 'Remove Stock'}
            </DialogTitle>
            <DialogDescription>
              {stockDialog.item?.name} - Current stock: {stockDialog.item?.current_stock}{' '}
              {stockDialog.item?.unit}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStockSubmit(onStockSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity" required>
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                {...registerStock('quantity', { valueAsNumber: true })}
              />
              {stockErrors.quantity && (
                <p className="text-sm text-destructive">{stockErrors.quantity.message}</p>
              )}
            </div>

            {stockDialog.type === 'add' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="unit_cost">Unit Cost (KES)</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    {...registerStock('unit_cost', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference_number">Reference Number</Label>
                  <Input
                    id="reference_number"
                    {...registerStock('reference_number')}
                    placeholder="Invoice #, PO #"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...registerStock('notes')}
                placeholder={stockDialog.type === 'add' ? 'Purchase details...' : 'Reason for removal...'}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStockDialog({ ...stockDialog, open: false })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={stockDialog.type === 'add' ? 'default' : 'destructive'}
                disabled={addStockMutation.isPending || removeStockMutation.isPending}
              >
                {(addStockMutation.isPending || removeStockMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {stockDialog.type === 'add' ? (
                  <>
                    <ArrowUp className="mr-2 h-4 w-4" />
                    Add Stock
                  </>
                ) : (
                  <>
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Remove Stock
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.item?.name}"? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.item && deleteMutation.mutate(deleteDialog.item.id)}
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
