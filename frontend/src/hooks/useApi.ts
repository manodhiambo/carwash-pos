import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useUIStore } from '@/stores/uiStore';

// Generic hook for API calls with loading and error states
export function useApiCall<T>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);
  const { addNotification } = useUIStore();

  const execute = useCallback(
    async (apiCall: () => Promise<T>, options?: { showError?: boolean; showSuccess?: boolean; successMessage?: string }) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiCall();
        setData(result);

        if (options?.showSuccess && options.successMessage) {
          addNotification({
            type: 'success',
            title: 'Success',
            message: options.successMessage,
          });
        }

        return result;
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
        setError(errorMessage);

        if (options?.showError !== false) {
          addNotification({
            type: 'error',
            title: 'Error',
            message: errorMessage,
          });
        }

        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [addNotification]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { execute, isLoading, error, data, reset };
}

// Dashboard hooks
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.dashboard.getStats(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
}

export function useRecentJobs() {
  return useQuery({
    queryKey: ['dashboard', 'recentJobs'],
    queryFn: () => api.dashboard.getRecentJobs(),
    staleTime: 10 * 1000, // 10 seconds
  });
}

// Jobs hooks
export function useJobs(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => api.jobs.list(params),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => api.jobs.get(id),
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: (data: any) => api.jobs.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addNotification({
        type: 'success',
        title: 'Job Created',
        message: 'New job has been created successfully',
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create job',
      });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.jobs.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update job',
      });
    },
  });
}

// Customers hooks
export function useCustomers(params?: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => api.customers.list(params),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => api.customers.get(id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: (data: any) => api.customers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      addNotification({
        type: 'success',
        title: 'Customer Created',
        message: 'New customer has been added successfully',
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create customer',
      });
    },
  });
}

// Vehicles hooks
export function useVehicles(params?: { customerId?: string; search?: string }) {
  return useQuery({
    queryKey: ['vehicles', params],
    queryFn: () => api.vehicles.list(params),
  });
}

export function useSearchVehicle(plate: string) {
  return useQuery({
    queryKey: ['vehicles', 'search', plate],
    queryFn: () => api.vehicles.searchByPlate(plate),
    enabled: plate.length >= 3,
  });
}

// Services hooks
export function useServices(params?: { category?: string; vehicleType?: string }) {
  return useQuery({
    queryKey: ['services', params],
    queryFn: () => api.services.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes - services don't change often
  });
}

// Bays hooks
export function useBays() {
  return useQuery({
    queryKey: ['bays'],
    queryFn: () => api.bays.list(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useBayStatus() {
  return useQuery({
    queryKey: ['bays', 'status'],
    queryFn: () => api.bays.getStatus(),
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });
}

// Inventory hooks
export function useInventory(params?: { category?: string; lowStock?: boolean }) {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn: () => api.inventory.list(params),
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { quantity: number; type: 'add' | 'remove'; reason?: string } }) =>
      api.inventory.updateStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addNotification({
        type: 'success',
        title: 'Stock Updated',
        message: 'Inventory has been updated successfully',
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update stock',
      });
    },
  });
}

// Payments hooks
export function usePayments(params?: { jobId?: string; method?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => api.payments.list(params),
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: (data: any) => api.payments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addNotification({
        type: 'success',
        title: 'Payment Processed',
        message: 'Payment has been recorded successfully',
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Payment Failed',
        message: error.response?.data?.message || 'Failed to process payment',
      });
    },
  });
}

export function useInitiateMpesa() {
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: (data: { phone: string; amount: number; jobId: string }) => api.payments.initiateMpesa(data),
    onSuccess: () => {
      addNotification({
        type: 'info',
        title: 'M-Pesa Request Sent',
        message: 'Please check your phone for the STK push prompt',
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'M-Pesa Error',
        message: error.response?.data?.message || 'Failed to initiate M-Pesa payment',
      });
    },
  });
}

export function useCheckMpesaStatus(checkoutRequestId: string) {
  return useQuery({
    queryKey: ['mpesa', 'status', checkoutRequestId],
    queryFn: () => api.payments.checkMpesaStatus(checkoutRequestId),
    enabled: !!checkoutRequestId,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

// Subscriptions hooks
export function useSubscriptions(params?: { customerId?: string; status?: string }) {
  return useQuery({
    queryKey: ['subscriptions', params],
    queryFn: () => api.subscriptions.list(params),
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscriptions', 'plans'],
    queryFn: () => api.subscriptions.getPlans(),
    staleTime: 5 * 60 * 1000,
  });
}

// Expenses hooks
export function useExpenses(params?: { category?: string; status?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => api.expenses.list(params),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: (data: any) => api.expenses.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      addNotification({
        type: 'success',
        title: 'Expense Added',
        message: 'Expense has been recorded successfully',
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to add expense',
      });
    },
  });
}

// Cash Sessions hooks
export function useCashSessions() {
  return useQuery({
    queryKey: ['cashSessions'],
    queryFn: () => api.cashSessions.list(),
  });
}

export function useCurrentCashSession() {
  return useQuery({
    queryKey: ['cashSessions', 'current'],
    queryFn: () => api.cashSessions.getCurrent(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useOpenCashSession() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: (data: { openingBalance: number }) => api.cashSessions.open(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
      addNotification({
        type: 'success',
        title: 'Session Opened',
        message: 'Cash session has been opened successfully',
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to open cash session',
      });
    },
  });
}

export function useCloseCashSession() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: (data: { closingBalance: number; notes?: string }) => api.cashSessions.close(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
      addNotification({
        type: 'success',
        title: 'Session Closed',
        message: 'Cash session has been closed successfully',
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to close cash session',
      });
    },
  });
}

// Reports hooks
export function useSalesReport(params: { startDate: string; endDate: string; groupBy?: string }) {
  return useQuery({
    queryKey: ['reports', 'sales', params],
    queryFn: () => api.reports.getSales(params),
  });
}

export function useCustomerReport(params: { startDate: string; endDate: string }) {
  return useQuery({
    queryKey: ['reports', 'customers', params],
    queryFn: () => api.reports.getCustomers(params),
  });
}

// Users/Staff hooks
export function useUsers(params?: { role?: string; status?: string }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => api.users.list(params),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: (data: any) => api.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addNotification({
        type: 'success',
        title: 'Staff Added',
        message: 'New staff member has been added successfully',
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to add staff member',
      });
    },
  });
}

// Settings hooks
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: (data: any) => api.settings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      addNotification({
        type: 'success',
        title: 'Settings Saved',
        message: 'Settings have been updated successfully',
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save settings',
      });
    },
  });
}

// Activity logs hooks
export function useActivityLogs(params?: { userId?: string; action?: string; resource?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['activityLogs', params],
    queryFn: () => api.activityLogs.list(params),
  });
}
