'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/stores';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SimpleTooltip } from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Car,
  ClipboardList,
  CreditCard,
  Users,
  Package,
  Settings,
  BarChart3,
  Calendar,
  Wrench,
  Receipt,
  Tags,
  Award,
  UserCog,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  Wallet,
  History,
} from 'lucide-react';
import { useAuthStore } from '@/stores';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  roles?: string[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Check-In',
    href: '/check-in',
    icon: Car,
  },
  {
    title: 'Job Queue',
    href: '/jobs',
    icon: ClipboardList,
  },
  {
    title: 'POS',
    href: '/pos',
    icon: CreditCard,
  },
  {
    title: 'Customers',
    href: '/customers',
    icon: Users,
  },
  {
    title: 'Services',
    href: '/services',
    icon: Tags,
  },
  {
    title: 'Subscriptions',
    href: '/subscriptions',
    icon: Award,
  },
  {
    title: 'Bays',
    href: '/bays',
    icon: Building2,
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: Package,
  },
  {
    title: 'Staff',
    href: '/staff',
    icon: UserCog,
    roles: ['admin', 'manager'],
  },
  {
    title: 'Expenses',
    href: '/expenses',
    icon: Wallet,
    roles: ['admin', 'manager', 'cashier'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['admin', 'manager'],
  },
  {
    title: 'Activity Logs',
    href: '/activity-logs',
    icon: History,
    roles: ['admin'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['admin', 'manager'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, toggleSidebarCollapse } = useSidebar();
  const { user, logout } = useAuthStore();

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user?.role && item.roles.includes(user.role);
  });

  // On mobile, sidebar is always shown expanded (not collapsed)
  const isCollapsed = sidebarCollapsed;

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;

    const linkContent = (
      <Link
        href={item.href}
        onClick={() => {
          // Close sidebar on mobile when navigating
          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setSidebarOpen(false);
          }
        }}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
          'hover:bg-accent hover:text-accent-foreground',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground',
          isCollapsed && 'lg:justify-center lg:px-2'
        )}
      >
        <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
        {/* On mobile: always show text. On desktop: respect collapsed state */}
        <span className={cn('flex-1', isCollapsed && 'lg:hidden')}>
          {item.title}
        </span>
        {item.badge && (
          <span className={cn(
            'rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground',
            isCollapsed && 'lg:hidden'
          )}>
            {item.badge}
          </span>
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <SimpleTooltip content={item.title} side="right">
          {linkContent}
        </SimpleTooltip>
      );
    }

    return linkContent;
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen border-r bg-card transition-all duration-300',
          // Mobile: full-width sidebar, off-screen by default
          'w-64 -translate-x-full lg:translate-x-0',
          // Mobile: slide in when open
          sidebarOpen && 'translate-x-0',
          // Desktop: respect collapsed state
          isCollapsed ? 'lg:w-16' : 'lg:w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {/* On mobile: always show full logo. On desktop: respect collapsed state */}
          <Link href="/dashboard" className={cn('flex items-center gap-2', isCollapsed && 'lg:hidden')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Car className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg">CarWash POS</span>
          </Link>
          {isCollapsed && (
            <Link href="/dashboard" className="mx-auto hidden lg:block">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Car className="h-5 w-5" />
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4" style={{ height: 'calc(100vh - 8rem)' }}>
          <nav className="flex flex-col gap-1 px-2">
            {filteredNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 border-t p-2">
          <div className="flex items-center justify-between">
            {/* Collapse button - hidden on mobile */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebarCollapse}
              className="h-8 w-8 hidden lg:flex"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>

            {/* Logout button - always show on mobile, respect collapsed on desktop */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className={cn(
                'text-muted-foreground hover:text-destructive',
                isCollapsed && 'lg:hidden'
              )}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>

            {isCollapsed && (
              <SimpleTooltip content="Logout" side="right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => logout()}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hidden lg:flex"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
