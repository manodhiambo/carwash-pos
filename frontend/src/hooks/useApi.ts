import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => api.dashboard.getMetrics(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useDashboardQueue() {
  return useQuery({
    queryKey: ['dashboard', 'queue'],
    queryFn: () => api.dashboard.getQueue(),
    staleTime: 10 * 1000,
  });
}

export function useDashboardAlerts() {
  return useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: () => api.dashboard.getAlerts(),
    staleTime: 30 * 1000,
  });
}

export function useDashboardBayStatus() {
  return useQuery({
    queryKey: ['dashboard', 'bayStatus'],
    queryFn: () => api.dashboard.getBayStatus(),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

// Jobs hooks
export function useJobs(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => api.jobs.getAll(params),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => api.jobs.getById(id),
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: (data: any) => api.jobs.checkIn(data),
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

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.jobs.updateStatus(id, status as any),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update job status',
      });
    },
  });
}

// Customers hooks
export function useCustomers(params?: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => api.customers.getAll(params),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => api.customers.getById(id),
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
    queryFn: () => api.vehicles.getAll(params),
  });
}

export function useSearchVehicle(plate: string) {
  return useQuery({
    queryKey: ['vehicles', 'search', plate],
    queryFn: () => api.vehicles.getByRegistration(plate),
    enabled: plate.length >= 3,
  });
}

// Services hooks
export function useServices(params?: { category?: string; vehicleType?: string }) {
  return useQuery({
    queryKey: ['services', params],
    queryFn: () => api.services.getAll(params),
    staleTime: 5 * 60 * 1000,
  });
}

// Bays hooks
export function useBays() {
  return useQuery({
    queryKey: ['bays'],
    queryFn: () => api.bays.getAll(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// Inventory hooks
export function useInventory(params?: { category?: string; lowStock?: boolean }) {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn: () => api.inventory.getAll(params),
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: ({ id, newQuantity, reason }: { id: string; newQuantity: number; reason: string }) =>
      api.inventory.adjustStock(id, newQuantity, reason),
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
export function usePayments(params?: { payment_method?: string; payment_status?: string; date?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => api.payments.getAll(params),
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
    mutationFn: ({ jobId, phone, amount }: { jobId: string; phone: string; amount: number }) =>
      api.payments.initiateMpesa(jobId, phone, amount),
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
    refetchInterval: 5000,
  });
}

// Subscriptions hooks
export function useSubscriptions(params?: { customer_id?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['subscriptions', params],
    queryFn: () => api.subscriptions.getAll(params),
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
    queryFn: () => api.expenses.getAll(params),
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
    queryFn: () => api.cashSessions.getAll(),
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
    mutationFn: (openingBalance: number) => api.cashSessions.open(openingBalance),
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
    mutationFn: ({ closingBalance, notes }: { closingBalance: number; notes?: string }) =>
      api.cashSessions.close(closingBalance, notes),
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
export function useSalesReport(params: { start_date: string; end_date: string; group_by?: string }) {
  return useQuery({
    queryKey: ['reports', 'sales', params],
    queryFn: () => api.reports.getSales(params as any),
  });
}

export function useCustomerReport(params: { start_date: string; end_date: string }) {
  return useQuery({
    queryKey: ['reports', 'customers', params],
    queryFn: () => api.reports.getCustomerReport(params as any),
  });
}

// Users/Staff hooks
export function useUsers(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => api.users.getAll(params),
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
export function useSettings(category?: string) {
  return useQuery({
    queryKey: ['settings', category],
    queryFn: () => api.settings.getAll(category),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: (settings: Array<{ key: string; value: string }>) => api.settings.updateBulk(settings),
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
    queryFn: () => api.activityLogs.getAll(params as any),
  });
}
