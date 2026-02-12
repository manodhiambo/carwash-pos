'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSidebar, useAuthStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Menu,
  Bell,
  Search,
  Sun,
  Moon,
  Settings,
  User,
  LogOut,
  HelpCircle,
  AlertTriangle,
  Package,
  Clock,
  DollarSign,
} from 'lucide-react';
import { SearchInput } from '@/components/ui/input';
import { useTheme } from '@/stores';
import { Badge } from '@/components/ui/badge';
import { dashboardApi } from '@/lib/api';

interface NotificationItem {
  id: string;
  type: 'warning' | 'info' | 'success' | 'destructive';
  label: string;
  message: string;
  icon: React.ElementType;
}

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
}

export function Header({ title, showSearch = false }: HeaderProps) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');

  // Fetch real alerts from backend
  const { data: alertsData } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: async () => {
      const response = await dashboardApi.getAlerts();
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });

  // Build notification items from real alerts
  const notifications = React.useMemo<NotificationItem[]>(() => {
    if (!alertsData) return [];
    const items: NotificationItem[] = [];
    const alerts = alertsData as any;

    // Bay congestion alert
    if (alerts.bayCongestion) {
      items.push({
        id: 'bay-congestion',
        type: 'destructive',
        label: 'Congestion',
        message: 'All bays are currently occupied. New vehicles will have to wait.',
        icon: AlertTriangle,
      });
    }

    // Long-wait vehicles
    if (alerts.longWaitVehicles?.length > 0) {
      for (const vehicle of alerts.longWaitVehicles.slice(0, 3)) {
        const waitMins = vehicle.wait_time_minutes ||
          Math.round((Date.now() - new Date(vehicle.created_at).getTime()) / 60000);
        items.push({
          id: `long-wait-${vehicle.id}`,
          type: 'warning',
          label: 'Long Wait',
          message: `${vehicle.registration_no || 'Vehicle'} has been waiting for ${waitMins} min`,
          icon: Clock,
        });
      }
    }

    // Low inventory items
    if (alerts.lowInventoryItems?.length > 0) {
      for (const item of alerts.lowInventoryItems.slice(0, 3)) {
        items.push({
          id: `low-stock-${item.id}`,
          type: 'warning',
          label: 'Low Stock',
          message: `${item.name} is running low — ${item.quantity} ${item.unit || 'units'} left`,
          icon: Package,
        });
      }
    }

    // Cash variance alert
    if (alerts.cashVariance && Math.abs(parseFloat(alerts.cashVariance)) > 100) {
      const variance = parseFloat(alerts.cashVariance);
      items.push({
        id: 'cash-variance',
        type: variance < 0 ? 'destructive' : 'info',
        label: 'Cash Variance',
        message: `Cash variance of KES ${Math.abs(variance).toLocaleString()} detected in last session`,
        icon: DollarSign,
      });
    }

    return items;
  }, [alertsData]);

  const notificationCount = notifications.length;

  // Generate title from pathname if not provided
  const pageTitle = title || pathname
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase()) || 'Dashboard';

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 gap-4"
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title */}
      <div className="flex-1">
        <h1 className="text-xl font-semibold">{pageTitle}</h1>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="hidden md:block w-64">
          <SearchInput
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {notificationCount > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  {notificationCount} active
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications right now
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = notification.icon;
                  return (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={notification.type as any}>{notification.label}</Badge>
                      </div>
                      <div className="flex items-start gap-2 w-full">
                        <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <p className="text-sm">{notification.message}</p>
                      </div>
                    </DropdownMenuItem>
                  );
                })
              )}
            </div>
            {notifications.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="w-full text-center text-sm text-primary">
                    View dashboard
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 px-2 gap-2">
              <UserAvatar
                name={user?.name || 'User'}
                src={user?.avatar_url}
                size="sm"
              />
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">{user?.name || 'User'}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {user?.role || 'Role'}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/help">
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & Support
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
