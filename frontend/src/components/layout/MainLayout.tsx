'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar, useAuthStore, useConfirmDialog } from '@/stores';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AlertDialog } from '@/components/ui/dialog';
import { Toaster } from 'react-hot-toast';
import { PageLoader } from '@/components/ui/spinner';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed } = useSidebar();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { confirmDialog, hideConfirmDialog } = useConfirmDialog();

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith('/reset-password'));

  // Check authentication on mount
  React.useEffect(() => {
    if (!isPublicRoute) {
      checkAuth().then((authenticated) => {
        if (!authenticated) {
          router.push('/login');
        }
      });
    }
  }, [pathname, isPublicRoute, checkAuth, router]);

  // Show loading state while checking auth
  if (isLoading && !isPublicRoute) {
    return <PageLoader message="Loading..." />;
  }

  // For public routes, render without layout
  if (isPublicRoute) {
    return (
      <>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))',
            },
          }}
        />
      </>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated && !isPublicRoute) {
    return <PageLoader message="Redirecting..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div
        className={cn(
          'min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        {/* Header */}
        <Header showSearch />

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* Global confirm dialog */}
      <AlertDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) hideConfirmDialog();
        }}
        title={confirmDialog.title}
        description={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        onConfirm={() => {
          confirmDialog.onConfirm?.();
          hideConfirmDialog();
        }}
        onCancel={() => {
          confirmDialog.onCancel?.();
          hideConfirmDialog();
        }}
        variant={confirmDialog.variant}
      />

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
          success: {
            iconTheme: {
              primary: 'hsl(var(--success-500))',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: 'hsl(var(--destructive))',
              secondary: 'white',
            },
          },
        }}
      />
    </div>
  );
}
