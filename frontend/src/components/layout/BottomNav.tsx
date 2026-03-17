'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/stores';
import {
  LayoutDashboard,
  Car,
  ClipboardList,
  CreditCard,
  Menu,
} from 'lucide-react';

const bottomNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/check-in', icon: Car, label: 'Check-In' },
  { href: '/jobs', icon: ClipboardList, label: 'Jobs' },
  { href: '/pos', icon: CreditCard, label: 'POS' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background border-t shadow-lg">
      <div className="flex items-stretch h-16">
        {bottomNavItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-primary rounded-t-full" />
              )}
            </Link>
          );
        })}

        {/* More / Menu */}
        <button
          onClick={toggleSidebar}
          className="flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
