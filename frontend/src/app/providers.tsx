'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  // Initialize theme on mount
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('ui-storage');
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        const theme = parsed.state?.theme || 'system';
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
          root.classList.add(systemTheme);
        } else {
          root.classList.add(theme);
        }
      } catch (e) {
        console.error('Failed to parse theme from storage');
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout>{children}</MainLayout>
    </QueryClientProvider>
  );
}
