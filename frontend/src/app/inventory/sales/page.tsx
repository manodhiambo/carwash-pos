'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, customersApi } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, SearchInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  ShoppingCart,
  Plus,
  DollarSign,
  TrendingUp,
  Package,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const saleSchema = z.object({
  item_id: z.string().min(1, 'Please select an item'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  selling_price: z.number().min(0, 'Price must be positive'),
  customer_id: z.string().optional(),
  payment_method: z.enum(['cash', 'mpesa', 'card']).default('cash'),
  notes: z.string().optional(),
});

type SaleFormData = z.infer<typeof saleSchema>;

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'card', label: 'Card' },
];

export default function InventorySalesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [saleDialog, setSaleDialog] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      payment_method: 'cash',
      quantity: 1,
      selling_price: 0,
    },
  });

  const quantity = watch('quantity');
  const sellingPrice = watch('selling_price');
  const totalAmount = (quantity || 0) * (sellingPrice || 0);

  // Fetch inventory items
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', { search }],
    queryFn: () =>
      inventoryApi.getAll({
        search: search || undefined,
        limit: 100,
      }),
  });

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => customersApi.getAll({ limit: 200 }),
  });

  // Fetch sales report
  const { data: salesReport } = useQuery({
    queryKey: ['inventory-sales-report'],
    queryFn: () => inventoryApi.getSalesReport(),
  });

  // Record sale mutation
  const recordSaleMutation = useMutation({
    mutationFn: (data: SaleFormData) =>
      inventoryApi.recordSale(
        data.item_id,
        data.quantity,
        data.selling_price,
        data.customer_id || undefined,
        data.payment_method,
        data.notes
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-sales-report'] });
      toast.success('Sale recorded successfully');
      setSaleDialog(false);
      setSelectedItem(null);
      reset();
    },
    onError: (error: any) => {
      const msg = error?.error || error?.message || 'Failed to record sale';
      toast.error(msg);
    },
  });

  const items = inventoryData?.data || [];
  const customers = customersData?.data || [];
  const summary = salesReport?.data?.summary;

  const handleOpenSaleDialog = (item: any) => {
    setSelectedItem(item);
    setValue('item_id', String(item.id));
    setValue('selling_price', item.selling_price || item.unit_cost || 0);
    setValue('quantity', 1);
    setSaleDialog(true);
  };

  const onSubmit = (data: SaleFormData) => {
    recordSaleMutation.mutate(data);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Inventory Sales"
        description="Record retail sales of inventory items"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Sales' },
        ]}
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{summary?.total_sales || 0}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-success-600">
                  {formatCurrency(summary?.total_revenue || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-success-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(summary?.total_profit || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Units Sold</p>
                <p className="text-2xl font-bold">{summary?.total_quantity_sold || 0}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px] max-w-md">
          <SearchInput
            placeholder="Search items by name, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Available Items for Sale</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>In Stock</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Margin</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton columns={7} rows={5} />
              ) : items.length === 0 ? (
                <TableEmpty
                  colSpan={7}
                  title="No items found"
                  description="No inventory items available for sale"
                  icon={<Package className="h-12 w-12" />}
                />
              ) : (
                items.map((item: any) => {
                  const hasStock = item.current_stock > 0;
                  const sellingPriceVal = item.selling_price || 0;
                  const margin =
                    sellingPriceVal && item.unit_cost
                      ? (((sellingPriceVal - item.unit_cost) / sellingPriceVal) * 100).toFixed(1)
                      : null;

                  return (
                    <TableRow key={item.id} className={cn(!hasStock && 'opacity-50')}>
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
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'font-medium',
                            !hasStock && 'text-destructive',
                            hasStock && item.current_stock <= item.min_stock_level && 'text-warning-600'
                          )}
                        >
                          {item.current_stock} {item.unit}
                        </span>
                      </TableCell>
                      <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                      <TableCell>
                        {sellingPriceVal ? (
                          <span className="font-medium text-success-600">
                            {formatCurrency(sellingPriceVal)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {margin ? (
                          <Badge variant="success">{margin}%</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleOpenSaleDialog(item)}
                          disabled={!hasStock}
                          className="gap-1"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Sell
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sale Dialog */}
      <Dialog
        open={saleDialog}
        onOpenChange={(open) => {
          setSaleDialog(open);
          if (!open) {
            setSelectedItem(null);
            reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Sale</DialogTitle>
            <DialogDescription>
              {selectedItem ? `Selling: ${selectedItem.name}` : 'Record an inventory sale'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Item info */}
            {selectedItem && (
              <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Stock:</span>
                  <span className="font-medium">
                    {selectedItem.current_stock} {selectedItem.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit Cost:</span>
                  <span>{formatCurrency(selectedItem.unit_cost)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="sale-quantity" required>Quantity</Label>
              <Input
                id="sale-quantity"
                type="number"
                step="0.01"
                min="0.01"
                max={selectedItem?.current_stock}
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale-price" required>Selling Price per Unit (KES)</Label>
              <Input
                id="sale-price"
                type="number"
                step="0.01"
                min="0"
                {...register('selling_price', { valueAsNumber: true })}
              />
              {errors.selling_price && (
                <p className="text-sm text-destructive">{errors.selling_price.message}</p>
              )}
            </div>

            {/* Total */}
            {totalAmount > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg flex justify-between items-center">
                <span className="text-sm font-medium">Total Amount:</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="sale-payment">Payment Method</Label>
              <SimpleSelect
                value={watch('payment_method') || 'cash'}
                onValueChange={(val) => setValue('payment_method', val as any)}
                options={paymentMethods}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale-customer">Customer (Optional)</Label>
              <SimpleSelect
                value={watch('customer_id') || ''}
                onValueChange={(val) => setValue('customer_id', val)}
                options={[
                  { value: '', label: 'Walk-in Customer' },
                  ...customers.map((c: any) => ({
                    value: String(c.id),
                    label: `${c.name} - ${c.phone}`,
                  })),
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale-notes">Notes (Optional)</Label>
              <Input
                id="sale-notes"
                {...register('notes')}
                placeholder="Any additional notes..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSaleDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={recordSaleMutation.isPending}>
                {recordSaleMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Record Sale
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
