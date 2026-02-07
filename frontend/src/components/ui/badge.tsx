'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-success-100 text-success-600',
        warning: 'border-transparent bg-warning-100 text-warning-600',
        info: 'border-transparent bg-info-100 text-info-600',
        // Status-specific variants
        pending: 'border-transparent bg-yellow-100 text-yellow-800',
        queued: 'border-transparent bg-blue-100 text-blue-800',
        'checked-in': 'border-transparent bg-yellow-100 text-yellow-800',
        'in-queue': 'border-transparent bg-blue-100 text-blue-800',
        'in-progress': 'border-transparent bg-cyan-100 text-cyan-800',
        washing: 'border-transparent bg-cyan-100 text-cyan-800',
        detailing: 'border-transparent bg-purple-100 text-purple-800',
        completed: 'border-transparent bg-green-100 text-green-800',
        cancelled: 'border-transparent bg-red-100 text-red-800',
        paid: 'border-transparent bg-green-100 text-green-800',
        unpaid: 'border-transparent bg-red-100 text-red-800',
        partial: 'border-transparent bg-amber-100 text-amber-800',
        available: 'border-transparent bg-green-100 text-green-800',
        occupied: 'border-transparent bg-orange-100 text-orange-800',
        maintenance: 'border-transparent bg-red-100 text-red-800',
        active: 'border-transparent bg-green-100 text-green-800',
        inactive: 'border-transparent bg-gray-100 text-gray-800',
        expired: 'border-transparent bg-red-100 text-red-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
}

function Badge({ className, variant, dot, dotColor, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'mr-1.5 h-1.5 w-1.5 rounded-full',
            dotColor || 'bg-current'
          )}
        />
      )}
      {children}
    </div>
  );
}

// Status badge that automatically applies the correct variant
interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: string;
}

function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/_/g, '-');
  const validVariants = [
    'pending',
    'queued',
    'checked-in',
    'in-queue',
    'in-progress',
    'washing',
    'detailing',
    'completed',
    'cancelled',
    'paid',
    'unpaid',
    'partial',
    'available',
    'occupied',
    'maintenance',
    'active',
    'inactive',
    'expired',
  ];

  const variant = validVariants.includes(normalizedStatus)
    ? (normalizedStatus as BadgeProps['variant'])
    : 'secondary';

  const displayStatus = status.replace(/_/g, ' ').replace(/-/g, ' ');

  return (
    <Badge variant={variant} className={cn('capitalize', className)} {...props}>
      {displayStatus}
    </Badge>
  );
}

// Priority badge
interface PriorityBadgeProps extends Omit<BadgeProps, 'variant'> {
  priority: 'normal' | 'high' | 'urgent';
}

function PriorityBadge({ priority, className, ...props }: PriorityBadgeProps) {
  const variants: Record<string, BadgeProps['variant']> = {
    normal: 'secondary',
    high: 'warning',
    urgent: 'destructive',
  };

  return (
    <Badge
      variant={variants[priority] || 'secondary'}
      className={cn('capitalize', className)}
      {...props}
    >
      {priority}
    </Badge>
  );
}

// Payment method badge
interface PaymentMethodBadgeProps extends Omit<BadgeProps, 'variant'> {
  method: string;
}

function PaymentMethodBadge({ method, className, ...props }: PaymentMethodBadgeProps) {
  const variants: Record<string, BadgeProps['variant']> = {
    cash: 'success',
    mpesa: 'info',
    card: 'default',
    bank_transfer: 'secondary',
    loyalty_points: 'warning',
  };

  const displayMethod = method === 'mpesa' ? 'M-Pesa' : method.replace(/_/g, ' ');

  return (
    <Badge
      variant={variants[method] || 'secondary'}
      className={cn('capitalize', className)}
      {...props}
    >
      {displayMethod}
    </Badge>
  );
}

export { Badge, badgeVariants, StatusBadge, PriorityBadge, PaymentMethodBadge };
