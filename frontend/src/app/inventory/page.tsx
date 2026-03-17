'use client';

import Link from 'next/link';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, suppliersApi } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, SearchInput, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  DialogBody,
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
  ShoppingCart,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { InventoryItem, InventoryCategory } from '@/types';

const inventoryCategories: { value: InventoryCategory; label: string }[] = [
  { value: 'detergent', label: 'Detergent' },
  { value: 'wax', label: 'Wax' },
  { value: 'polish', label: 'Polish' },
  { value: 'towel', label: 'Towel' },
  { value: 'sponge', label: 'Sponge' },
  { value: 'chemical', label: 'Chemical' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
];

const inventorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.enum(['detergent', 'wax', 'polish', 'towel', 'sponge', 'chemical', 'equipment', 'other']),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  min_stock_level: z.number().min(0),
  max_stock_level: z.number().min(1),
  reorder_point: z.number().min(0),
  unit_cost: z.number().min(0),
  selling_price: z.number().min(0).optional(),
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
      category: 'detergent',
      unit: 'pcs',
      min_stock_level: 10,
      max_stock_level: 100,
      reorder_point: 20,
      unit_cost: 0,
      selling_price: 0,
    },
  });

  const {
    register: registerStock,
    handleSubmit: handleStockSubmit,
    reset: resetStock,
    formState: { errors: stockErrors },
  } = useForm<StockFormData>({
    resolver: zodResolver(stockSchema),
    defaultValues: { quantity: 1 },
  });

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

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.getAll({ limit: 100 }),
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => inventoryApi.getLowStock(),
  });

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
      setValue('selling_price', (item as any).selling_price || 0);
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
          <div className="flex gap-2">
            <Link href="/inventory/sales">
              <Button variant="outline" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Record Sale
              </Button>
            </Link>
            <Button onClick={() => handleOpenForm()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-blue-100">Total Items</p>
              <Package className="h-5 w-5 text-blue-200" />
            </div>
            <p className="text-2xl font-bold text-white">{items.length}</p>
          </div>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-yellow-100">Low Stock</p>
              <TrendingDown className="h-5 w-5 text-yellow-200" />
            </div>
            <p className="text-2xl font-bold text-white">{lowStockItems.length}</p>
          </div>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-br from-red-500 to-red-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-red-100">Critical</p>
              <AlertTriangle className="h-5 w-5 text-red-200" />
            </div>
            <p className="text-2xl font-bold text-white">
              {items.filter((i) => i.current_stock <= i.min_stock_level).length}
            </p>
          </div>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-br from-green-500 to-green-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-green-100">Suppliers</p>
              <Truck className="h-5 w-5 text-green-200" />
            </div>
            <p className="text-2xl font-bold text-white">{suppliers.length}</p>
          </div>
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

      {/* Mobile Card List */}
      <div className="sm:hidden space-y-3 mb-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-4"><div className="h-20 animate-pulse bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No items found</p>
              <Button onClick={() => handleOpenForm()} className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Add First Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          items.map((item) => {
            const stockLevel = getStockLevel(item);
            return (
              <Card key={item.id} className={`border-l-4 ${
                stockLevel === 'critical' ? 'border-l-destructive' :
                stockLevel === 'low' ? 'border-l-warning-500' :
                'border-l-success-500'
              }`}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="capitalize text-xs">{item.category}</Badge>
                        {stockLevel !== 'normal' && (
                          <span className={`text-xs font-medium ${stockLevel === 'critical' ? 'text-destructive' : 'text-warning-600'}`}>
                            {stockLevel === 'critical' ? '⚠ Critical' : '↓ Low Stock'}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="font-medium">{item.current_stock} {item.unit}</span>
                        <span className="text-muted-foreground text-xs ml-2">
                          (min: {item.min_stock_level})
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Cost: {formatCurrency(item.unit_cost)} {(item as any).selling_price ? `• Sell: ${formatCurrency((item as any).selling_price)}` : ''}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="outline" size="icon-sm" title="Add Stock" onClick={() => handleOpenStockDialog(item, 'add')}>
                        <ArrowUp className="h-4 w-4 text-success-600" />
                      </Button>
                      <Button variant="outline" size="icon-sm" title="Remove Stock" onClick={() => handleOpenStockDialog(item, 'remove')}>
                        <ArrowDown className="h-4 w-4 text-destructive" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenForm(item)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialog({ open: true, item })}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Table - hidden on mobile */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton columns={8} rows={5} />
              ) : items.length === 0 ? (
                <TableEmpty
                  colSpan={8}
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
                  const sellingPrice = (item as any).selling_price;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {item.category}
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
                                stockLevel === 'critical' ? 'text-destructive' : 'text-warning-600'
                              )}
                            >
                              {stockLevel === 'critical' ? 'Critical' : 'Low Stock'}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                      <TableCell>
                        {sellingPrice ? (
                          <span className="font-medium text-success-600">
                            {formatCurrency(sellingPrice)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>
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
                            title="Add Stock"
                            onClick={() => handleOpenStockDialog(item, 'add')}
                          >
                            <ArrowUp className="h-4 w-4 text-success-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            title="Remove Stock"
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
                              <DropdownMenuItem asChild>
                                <Link href="/inventory/sales">
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  Sell Item
                                </Link>
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
              {formDialog.item ? 'Update inventory item details' : 'Enter the item details below'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" required>Item Name</Label>
                  <Input id="name" {...register('name')} placeholder="Car Shampoo" />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku" required>SKU</Label>
                  <Input id="sku" {...register('sku')} placeholder="CS-001" />
                  {errors.sku && (
                    <p className="text-sm text-destructive">{errors.sku.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <SimpleSelect
                    value={watch('category')}
                    onValueChange={(value) => setValue('category', value as InventoryCategory)}
                    options={inventoryCategories}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit" required>Unit</Label>
                  <Input id="unit" {...register('unit')} placeholder="liters, pcs, kg" />
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock Levels</p>
                <div className="grid gap-3 grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="min_stock_level" className="text-xs">Min Stock</Label>
                    <Input
                      id="min_stock_level"
                      type="number"
                      {...register('min_stock_level', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reorder_point" className="text-xs">Reorder At</Label>
                    <Input
                      id="reorder_point"
                      type="number"
                      {...register('reorder_point', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="max_stock_level" className="text-xs">Max Stock</Label>
                    <Input
                      id="max_stock_level"
                      type="number"
                      {...register('max_stock_level', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="unit_cost">Unit Cost (KES)</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    {...register('unit_cost', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling Price (KES)</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('selling_price', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">Retail price for this item</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    {...register('location')}
                    placeholder="Storage location"
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
            </DialogBody>

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
                {formDialog.item ? 'Update Item' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Dialog */}
      <Dialog
        open={stockDialog.open}
        onOpenChange={(open) => setStockDialog({ ...stockDialog, open })}
      >
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
          <form onSubmit={handleStockSubmit(onStockSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stock-quantity" required>Quantity</Label>
              <Input
                id="stock-quantity"
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
                  <Label htmlFor="stock-unit-cost">Unit Cost (KES)</Label>
                  <Input
                    id="stock-unit-cost"
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
              <Label htmlFor="stock-notes">Notes</Label>
              <Textarea
                id="stock-notes"
                {...registerStock('notes')}
                placeholder={
                  stockDialog.type === 'add' ? 'Purchase details...' : 'Reason for removal...'
                }
                rows={2}
              />
            </div>
            </DialogBody>

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
              Are you sure you want to delete &quot;{deleteDialog.item?.name}&quot;? This action
              cannot be undone.
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
