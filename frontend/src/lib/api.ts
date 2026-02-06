import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginationParams,
  LoginCredentials,
  LoginResponse,
  User,
  Customer,
  CustomerFormData,
  Vehicle,
  VehicleFormData,
  Service,
  ServiceFormData,
  Job,
  CheckInFormData,
  Payment,
  PaymentFormData,
  Bay,
  BayFormData,
  Equipment,
  InventoryItem,
  InventoryFormData,
  Supplier,
  StockTransaction,
  SubscriptionPlan,
  CustomerSubscription,
  Expense,
  CashSession,
  DashboardMetrics,
  SalesReport,
  OperationalReport,
  SystemSettings,
  Promotion,
  Branch,
  ActivityLog,
} from '@/types';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_VERSION = 'v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/${API_VERSION}`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Token management
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }
};

export const getTokens = () => {
  if (typeof window !== 'undefined' && !accessToken) {
    accessToken = localStorage.getItem('accessToken');
    refreshToken = localStorage.getItem('refreshToken');
  }
  return { accessToken, refreshToken };
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken: token } = getTokens();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken: refresh } = getTokens();
        if (refresh) {
          const response = await axios.post(`${API_BASE_URL}/api/${API_VERSION}/auth/refresh`, {
            refreshToken: refresh,
          });

          const { accessToken: newAccess, refreshToken: newRefresh } = response.data.data.tokens;
          setTokens(newAccess, newRefresh);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Error handler
const handleApiError = (error: AxiosError<ApiError>): never => {
  if (error.response?.data) {
    throw error.response.data;
  }
  throw {
    success: false,
    error: error.message || 'An unexpected error occurred',
  };
};

// ============================================
// Authentication API
// ============================================

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      // Backend expects 'username' field which accepts both username and email
      const response = await apiClient.post('/auth/login', {
        username: credentials.email,
        password: credentials.password,
      });

      // Transform backend response to match frontend expected format
      const { user, token, refreshToken, expiresIn } = response.data.data;
      setTokens(token, refreshToken);

      return {
        success: true,
        data: {
          user,
          tokens: {
            accessToken: token,
            refreshToken,
            expiresIn: typeof expiresIn === 'string' ? 604800 : expiresIn, // 7 days in seconds
          },
        },
      };
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      clearTokens();
    }
  },

  refreshToken: async (): Promise<LoginResponse> => {
    try {
      const { refreshToken: refresh } = getTokens();
      const response = await apiClient.post<LoginResponse>('/auth/refresh', {
        refreshToken: refresh,
      });
      const { accessToken: access, refreshToken: newRefresh } = response.data.data.tokens;
      setTokens(access, newRefresh);
      return response.data;
    } catch (error) {
      clearTokens();
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    try {
      const response = await apiClient.get<ApiResponse<User>>('/auth/me');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.post<ApiResponse<void>>('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  forgotPassword: async (email: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.post<ApiResponse<void>>('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  resetPassword: async (token: string, password: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.post<ApiResponse<void>>('/auth/reset-password', {
        token,
        password,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Dashboard API
// ============================================

export const dashboardApi = {
  getMetrics: async (): Promise<ApiResponse<DashboardMetrics>> => {
    try {
      const response = await apiClient.get<ApiResponse<DashboardMetrics>>('/dashboard/metrics');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getAlerts: async (): Promise<ApiResponse<{ alerts: Array<{ type: string; message: string; severity: string }> }>> => {
    try {
      const response = await apiClient.get('/dashboard/alerts');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getQueue: async (): Promise<ApiResponse<Job[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<Job[]>>('/dashboard/queue');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getBayStatus: async (): Promise<ApiResponse<Bay[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<Bay[]>>('/dashboard/bays');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getSummary: async (period: 'today' | 'week' | 'month'): Promise<ApiResponse<SalesReport>> => {
    try {
      const response = await apiClient.get<ApiResponse<SalesReport>>(`/dashboard/summary?period=${period}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Users API
// ============================================

export const usersApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<User>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<User>>('/auth/users', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<User>> => {
    try {
      const response = await apiClient.get<ApiResponse<User>>(`/auth/users/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  create: async (data: Partial<User> & { password: string }): Promise<ApiResponse<User>> => {
    try {
      const response = await apiClient.post<ApiResponse<User>>('/auth/register', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  update: async (id: string, data: Partial<User>): Promise<ApiResponse<User>> => {
    try {
      const response = await apiClient.put<ApiResponse<User>>(`/auth/users/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/auth/users/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getPerformance: async (id: string, startDate?: string, endDate?: string): Promise<ApiResponse<{
    jobs_completed: number;
    average_time: number;
    rating: number;
  }>> => {
    try {
      const response = await apiClient.get(`/auth/users/${id}/performance`, {
        params: { start_date: startDate, end_date: endDate },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Customers API
// ============================================

export const customersApi = {
  getAll: async (params?: PaginationParams & { customer_type?: string }): Promise<PaginatedResponse<Customer>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<Customer>>('/customers', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<Customer>> => {
    try {
      const response = await apiClient.get<ApiResponse<Customer>>(`/customers/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getByPhone: async (phone: string): Promise<ApiResponse<Customer>> => {
    try {
      const response = await apiClient.get<ApiResponse<Customer>>(`/customers/phone/${phone}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  create: async (data: CustomerFormData): Promise<ApiResponse<Customer>> => {
    try {
      const response = await apiClient.post<ApiResponse<Customer>>('/customers', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  update: async (id: string, data: Partial<CustomerFormData>): Promise<ApiResponse<Customer>> => {
    try {
      const response = await apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/customers/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getHistory: async (id: string, params?: PaginationParams): Promise<PaginatedResponse<Job>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<Job>>(`/customers/${id}/history`, { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  addLoyaltyPoints: async (id: string, points: number, description?: string): Promise<ApiResponse<Customer>> => {
    try {
      const response = await apiClient.post<ApiResponse<Customer>>(`/customers/${id}/loyalty`, {
        points,
        description,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  redeemLoyaltyPoints: async (id: string, points: number): Promise<ApiResponse<{ discount: number }>> => {
    try {
      const response = await apiClient.post(`/customers/${id}/redeem`, { points });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  search: async (query: string): Promise<ApiResponse<Customer[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<Customer[]>>('/customers/search/autocomplete', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Vehicles API
// ============================================

export const vehiclesApi = {
  getAll: async (params?: PaginationParams & { vehicle_type?: string }): Promise<PaginatedResponse<Vehicle>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<Vehicle>>('/vehicles', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<Vehicle>> => {
    try {
      const response = await apiClient.get<ApiResponse<Vehicle>>(`/vehicles/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getByRegistration: async (registration: string): Promise<ApiResponse<Vehicle>> => {
    try {
      const response = await apiClient.get<ApiResponse<Vehicle>>(`/vehicles/registration/${registration}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  create: async (data: VehicleFormData): Promise<ApiResponse<Vehicle>> => {
    try {
      const response = await apiClient.post<ApiResponse<Vehicle>>('/vehicles', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  update: async (id: string, data: Partial<VehicleFormData>): Promise<ApiResponse<Vehicle>> => {
    try {
      const response = await apiClient.put<ApiResponse<Vehicle>>(`/vehicles/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/vehicles/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getHistory: async (id: string, params?: PaginationParams): Promise<PaginatedResponse<Job>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<Job>>(`/vehicles/${id}/history`, { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Services API
// ============================================

export const servicesApi = {
  getAll: async (params?: PaginationParams & { category?: string; is_addon?: boolean }): Promise<PaginatedResponse<Service>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<Service>>('/services', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<Service>> => {
    try {
      const response = await apiClient.get<ApiResponse<Service>>(`/services/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  create: async (data: ServiceFormData): Promise<ApiResponse<Service>> => {
    try {
      const response = await apiClient.post<ApiResponse<Service>>('/services', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  update: async (id: string, data: Partial<ServiceFormData>): Promise<ApiResponse<Service>> => {
    try {
      const response = await apiClient.put<ApiResponse<Service>>(`/services/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/services/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getPricing: async (serviceId: string): Promise<ApiResponse<Service['prices']>> => {
    try {
      const response = await apiClient.get(`/services/${serviceId}/pricing`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  updatePricing: async (serviceId: string, prices: Service['prices']): Promise<ApiResponse<Service>> => {
    try {
      const response = await apiClient.put<ApiResponse<Service>>(`/services/${serviceId}/pricing`, { prices });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Jobs API
// ============================================

export const jobsApi = {
  getAll: async (params?: PaginationParams & {
    status?: string;
    payment_status?: string;
    bay_id?: string;
    assigned_staff_id?: string;
    date?: string;
  }): Promise<PaginatedResponse<Job>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<Job>>('/jobs', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<Job>> => {
    try {
      const response = await apiClient.get<ApiResponse<Job>>(`/jobs/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getByJobNumber: async (jobNumber: string): Promise<ApiResponse<Job>> => {
    try {
      const response = await apiClient.get<ApiResponse<Job>>(`/jobs/number/${jobNumber}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  checkIn: async (data: CheckInFormData): Promise<ApiResponse<Job>> => {
    try {
      const response = await apiClient.post<ApiResponse<Job>>('/jobs/check-in', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  updateStatus: async (id: string, status: Job['status'], notes?: string): Promise<ApiResponse<Job>> => {
    try {
      const response = await apiClient.put<ApiResponse<Job>>(`/jobs/${id}/status`, { status, notes });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  assignBay: async (id: string, bayId: string): Promise<ApiResponse<Job>> => {
    try {
      const response = await apiClient.put<ApiResponse<Job>>(`/jobs/${id}/assign-bay`, { bay_id: bayId });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  assignStaff: async (id: string, staffId: string): Promise<ApiResponse<Job>> => {
    try {
      const response = await apiClient.put<ApiResponse<Job>>(`/jobs/${id}/assign-staff`, { staff_id: staffId });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  addService: async (id: string, serviceId: string, quantity?: number): Promise<ApiResponse<Job>> => {
    try {
      const response = await apiClient.post<ApiResponse<Job>>(`/jobs/${id}/services`, {
        service_id: serviceId,
        quantity: quantity || 1,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  removeService: async (id: string, jobServiceId: string): Promise<ApiResponse<Job>> => {
    try {
      const response = await apiClient.delete<ApiResponse<Job>>(`/jobs/${id}/services/${jobServiceId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  applyDiscount: async (id: string, discountType: 'percentage' | 'fixed', discountValue: number): Promise<ApiResponse<Job>> => {
    try {
      const response = await apiClient.post<ApiResponse<Job>>(`/jobs/${id}/discount`, {
        discount_type: discountType,
        discount_value: discountValue,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  cancel: async (id: string, reason?: string): Promise<ApiResponse<Job>> => {
    try {
      const response = await apiClient.put<ApiResponse<Job>>(`/jobs/${id}/status`, {
        status: 'cancelled',
        notes: reason,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getQueue: async (): Promise<ApiResponse<Job[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<Job[]>>('/dashboard/queue');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getActive: async (): Promise<PaginatedResponse<Job>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<Job>>('/jobs', {
        params: { status: 'checked_in,in_queue,washing,detailing' }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Payments API
// ============================================

export const paymentsApi = {
  getAll: async (params?: PaginationParams & {
    payment_method?: string;
    payment_status?: string;
    date?: string;
  }): Promise<PaginatedResponse<Payment>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<Payment>>('/payments', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<Payment>> => {
    try {
      const response = await apiClient.get<ApiResponse<Payment>>(`/payments/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  create: async (data: PaymentFormData): Promise<ApiResponse<Payment>> => {
    try {
      const response = await apiClient.post<ApiResponse<Payment>>('/payments', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  initiateMpesa: async (jobId: string, phone: string, amount: number): Promise<ApiResponse<{
    checkout_request_id: string;
    merchant_request_id: string;
  }>> => {
    try {
      const response = await apiClient.post('/payments/mpesa/stk-push', {
        job_id: jobId,
        phone,
        amount,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  checkMpesaStatus: async (checkoutRequestId: string): Promise<ApiResponse<{
    status: string;
    result_desc: string;
  }>> => {
    try {
      const response = await apiClient.get(`/payments/mpesa/status/${checkoutRequestId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  refund: async (id: string, amount: number, reason: string): Promise<ApiResponse<Payment>> => {
    try {
      const response = await apiClient.post<ApiResponse<Payment>>(`/payments/${id}/refund`, {
        amount,
        reason,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getByJob: async (jobId: string): Promise<ApiResponse<Payment[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<Payment[]>>(`/payments/job/${jobId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Bays API
// ============================================

export const baysApi = {
  getAll: async (params?: PaginationParams & { status?: string; bay_type?: string }): Promise<PaginatedResponse<Bay>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<Bay>>('/bays', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<Bay>> => {
    try {
      const response = await apiClient.get<ApiResponse<Bay>>(`/bays/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  create: async (data: BayFormData): Promise<ApiResponse<Bay>> => {
    try {
      const response = await apiClient.post<ApiResponse<Bay>>('/bays', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  update: async (id: string, data: Partial<BayFormData>): Promise<ApiResponse<Bay>> => {
    try {
      const response = await apiClient.put<ApiResponse<Bay>>(`/bays/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/bays/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  updateStatus: async (id: string, status: Bay['status']): Promise<ApiResponse<Bay>> => {
    try {
      const response = await apiClient.put<ApiResponse<Bay>>(`/bays/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getAvailable: async (): Promise<ApiResponse<Bay[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<Bay[]>>('/bays/available');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getUtilization: async (startDate?: string, endDate?: string): Promise<ApiResponse<{
    total_jobs: number;
    utilization_rate: number;
    average_service_time: number;
  }>> => {
    try {
      const response = await apiClient.get('/bays/utilization', {
        params: { start_date: startDate, end_date: endDate },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Equipment API
// ============================================

export const equipmentApi = {
  getAll: async (params?: PaginationParams & { status?: string; bay_id?: string }): Promise<PaginatedResponse<Equipment>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<Equipment>>('/bays/equipment', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<Equipment>> => {
    try {
      const response = await apiClient.get<ApiResponse<Equipment>>(`/bays/equipment/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  create: async (data: Partial<Equipment>): Promise<ApiResponse<Equipment>> => {
    try {
      const response = await apiClient.post<ApiResponse<Equipment>>('/bays/equipment', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  update: async (id: string, data: Partial<Equipment>): Promise<ApiResponse<Equipment>> => {
    try {
      const response = await apiClient.put<ApiResponse<Equipment>>(`/bays/equipment/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/bays/equipment/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  logMaintenance: async (id: string, notes: string, nextMaintenanceDate?: string): Promise<ApiResponse<Equipment>> => {
    try {
      const response = await apiClient.post<ApiResponse<Equipment>>(`/bays/equipment/${id}/maintenance`, {
        notes,
        next_maintenance: nextMaintenanceDate,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Inventory API
// ============================================

export const inventoryApi = {
  getAll: async (params?: PaginationParams & { category?: string; low_stock?: boolean }): Promise<PaginatedResponse<InventoryItem>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<InventoryItem>>('/inventory', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<InventoryItem>> => {
    try {
      const response = await apiClient.get<ApiResponse<InventoryItem>>(`/inventory/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  create: async (data: InventoryFormData): Promise<ApiResponse<InventoryItem>> => {
    try {
      const response = await apiClient.post<ApiResponse<InventoryItem>>('/inventory', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  update: async (id: string, data: Partial<InventoryFormData>): Promise<ApiResponse<InventoryItem>> => {
    try {
      const response = await apiClient.put<ApiResponse<InventoryItem>>(`/inventory/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/inventory/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  addStock: async (id: string, quantity: number, unitCost?: number, reference?: string, notes?: string): Promise<ApiResponse<StockTransaction>> => {
    try {
      const response = await apiClient.post<ApiResponse<StockTransaction>>('/inventory/transaction', {
        item_id: id,
        transaction_type: 'stock_in',
        quantity,
        unit_cost: unitCost,
        reference,
        notes,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  removeStock: async (id: string, quantity: number, notes?: string, jobId?: string): Promise<ApiResponse<StockTransaction>> => {
    try {
      const response = await apiClient.post<ApiResponse<StockTransaction>>('/inventory/transaction', {
        item_id: id,
        transaction_type: 'stock_out',
        quantity,
        job_id: jobId,
        notes,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  adjustStock: async (id: string, quantity: number, notes?: string): Promise<ApiResponse<StockTransaction>> => {
    try {
      const response = await apiClient.post<ApiResponse<StockTransaction>>('/inventory/transaction', {
        item_id: id,
        transaction_type: 'adjustment',
        quantity,
        notes,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getTransactions: async (id: string, params?: PaginationParams): Promise<PaginatedResponse<StockTransaction>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<StockTransaction>>(`/inventory/${id}/transactions`, { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getLowStock: async (): Promise<ApiResponse<InventoryItem[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<InventoryItem[]>>('/inventory/low-stock');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Suppliers API
// ============================================

export const suppliersApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Supplier>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<Supplier>>('/inventory/suppliers', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<Supplier>> => {
    try {
      const response = await apiClient.get<ApiResponse<Supplier>>(`/inventory/suppliers/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  create: async (data: Partial<Supplier>): Promise<ApiResponse<Supplier>> => {
    try {
      const response = await apiClient.post<ApiResponse<Supplier>>('/inventory/suppliers', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  update: async (id: string, data: Partial<Supplier>): Promise<ApiResponse<Supplier>> => {
    try {
      const response = await apiClient.put<ApiResponse<Supplier>>(`/inventory/suppliers/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/inventory/suppliers/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Subscriptions API
// ============================================

export const subscriptionsApi = {
  // Plans
  getPlans: async (params?: PaginationParams): Promise<PaginatedResponse<SubscriptionPlan>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<SubscriptionPlan>>('/subscriptions/plans', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getPlanById: async (id: string): Promise<ApiResponse<SubscriptionPlan>> => {
    try {
      const response = await apiClient.get<ApiResponse<SubscriptionPlan>>(`/subscriptions/plans/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  createPlan: async (data: Partial<SubscriptionPlan>): Promise<ApiResponse<SubscriptionPlan>> => {
    try {
      const response = await apiClient.post<ApiResponse<SubscriptionPlan>>('/subscriptions/plans', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  updatePlan: async (id: string, data: Partial<SubscriptionPlan>): Promise<ApiResponse<SubscriptionPlan>> => {
    try {
      const response = await apiClient.put<ApiResponse<SubscriptionPlan>>(`/subscriptions/plans/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  deletePlan: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/subscriptions/plans/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  // Customer Subscriptions
  getAll: async (params?: PaginationParams & { status?: string; customer_id?: string }): Promise<PaginatedResponse<CustomerSubscription>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<CustomerSubscription>>('/subscriptions', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<CustomerSubscription>> => {
    try {
      const response = await apiClient.get<ApiResponse<CustomerSubscription>>(`/subscriptions/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  create: async (data: {
    customer_id: string;
    plan_id: string;
    vehicle_id: string;
    payment_method: string;
  }): Promise<ApiResponse<CustomerSubscription>> => {
    try {
      const response = await apiClient.post<ApiResponse<CustomerSubscription>>('/subscriptions', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  cancel: async (id: string, reason?: string): Promise<ApiResponse<CustomerSubscription>> => {
    try {
      const response = await apiClient.patch<ApiResponse<CustomerSubscription>>(`/subscriptions/${id}/cancel`, { reason });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  recordUsage: async (id: string, jobId: string): Promise<ApiResponse<CustomerSubscription>> => {
    try {
      const response = await apiClient.post<ApiResponse<CustomerSubscription>>(`/subscriptions/${id}/usage`, { job_id: jobId });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  checkValidity: async (vehicleId: string): Promise<ApiResponse<{
    valid: boolean;
    subscription?: CustomerSubscription;
  }>> => {
    try {
      const response = await apiClient.get(`/subscriptions/check/${vehicleId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Expenses API
// ============================================

export const expensesApi = {
  getAll: async (params?: PaginationParams & {
    category?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<PaginatedResponse<Expense>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<Expense>>('/expenses', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<Expense>> => {
    try {
      const response = await apiClient.get<ApiResponse<Expense>>(`/expenses/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  create: async (data: Partial<Expense>): Promise<ApiResponse<Expense>> => {
    try {
      const response = await apiClient.post<ApiResponse<Expense>>('/expenses', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  update: async (id: string, data: Partial<Expense>): Promise<ApiResponse<Expense>> => {
    try {
      const response = await apiClient.put<ApiResponse<Expense>>(`/expenses/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/expenses/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  approve: async (id: string): Promise<ApiResponse<Expense>> => {
    try {
      const response = await apiClient.patch<ApiResponse<Expense>>(`/expenses/${id}/approve`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  reject: async (id: string, reason: string): Promise<ApiResponse<Expense>> => {
    try {
      const response = await apiClient.patch<ApiResponse<Expense>>(`/expenses/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Cash Sessions API
// ============================================

export const cashSessionsApi = {
  getAll: async (params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<CashSession>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<CashSession>>('/expenses/cash-sessions', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getCurrent: async (): Promise<ApiResponse<CashSession | null>> => {
    try {
      const response = await apiClient.get<ApiResponse<CashSession | null>>('/expenses/cash-sessions/current');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  open: async (openingBalance: number): Promise<ApiResponse<CashSession>> => {
    try {
      const response = await apiClient.post<ApiResponse<CashSession>>('/expenses/cash-sessions/open', {
        opening_balance: openingBalance,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  close: async (closingBalance: number, notes?: string): Promise<ApiResponse<CashSession>> => {
    try {
      const response = await apiClient.post<ApiResponse<CashSession>>('/expenses/cash-sessions/close', {
        closing_balance: closingBalance,
        notes,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<CashSession>> => {
    try {
      const response = await apiClient.get<ApiResponse<CashSession>>(`/expenses/cash-sessions/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Reports API
// ============================================

export const reportsApi = {
  getSales: async (params: {
    start_date: string;
    end_date: string;
    group_by?: 'day' | 'week' | 'month';
  }): Promise<ApiResponse<SalesReport>> => {
    try {
      const response = await apiClient.get<ApiResponse<SalesReport>>('/reports/sales', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getOperational: async (params: {
    start_date: string;
    end_date: string;
  }): Promise<ApiResponse<OperationalReport>> => {
    try {
      const response = await apiClient.get<ApiResponse<OperationalReport>>('/reports/operational', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getCustomerReport: async (params: {
    start_date: string;
    end_date: string;
    limit?: number;
  }): Promise<ApiResponse<{
    total_customers: number;
    new_customers: number;
    repeat_customers: number;
    top_customers: Array<{
      customer: Customer;
      total_visits: number;
      total_spent: number;
    }>;
  }>> => {
    try {
      const response = await apiClient.get('/reports/customers', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getFinancialSummary: async (params: {
    start_date: string;
    end_date: string;
  }): Promise<ApiResponse<{
    total_revenue: number;
    total_expenses: number;
    net_profit: number;
    revenue_by_method: Record<string, number>;
    expenses_by_category: Record<string, number>;
  }>> => {
    try {
      const response = await apiClient.get('/reports/financial', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getInventoryReport: async (): Promise<ApiResponse<{
    total_items: number;
    low_stock_items: number;
    total_value: number;
    items_by_category: Record<string, number>;
  }>> => {
    try {
      const response = await apiClient.get('/reports/inventory');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  exportReport: async (type: string, params: Record<string, string>): Promise<Blob> => {
    try {
      const response = await apiClient.get(`/reports/export/${type}`, {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Settings API
// ============================================

export const settingsApi = {
  getAll: async (category?: string): Promise<ApiResponse<SystemSettings[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<SystemSettings[]>>('/settings', {
        params: { category },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  get: async (key: string): Promise<ApiResponse<SystemSettings>> => {
    try {
      const response = await apiClient.get<ApiResponse<SystemSettings>>(`/settings/${key}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  update: async (key: string, value: string): Promise<ApiResponse<SystemSettings>> => {
    try {
      const response = await apiClient.put<ApiResponse<SystemSettings>>(`/settings/${key}`, { value });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  updateBulk: async (settings: Array<{ key: string; value: string }>): Promise<ApiResponse<SystemSettings[]>> => {
    try {
      const response = await apiClient.put<ApiResponse<SystemSettings[]>>('/settings/bulk', { settings });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Branches API
// ============================================

export const branchesApi = {
  getAll: async (): Promise<ApiResponse<Branch[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<Branch[]>>('/settings/branches');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<Branch>> => {
    try {
      const response = await apiClient.get<ApiResponse<Branch>>(`/settings/branches/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  create: async (data: Partial<Branch>): Promise<ApiResponse<Branch>> => {
    try {
      const response = await apiClient.post<ApiResponse<Branch>>('/settings/branches', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  update: async (id: string, data: Partial<Branch>): Promise<ApiResponse<Branch>> => {
    try {
      const response = await apiClient.put<ApiResponse<Branch>>(`/settings/branches/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/settings/branches/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Promotions API
// ============================================

export const promotionsApi = {
  getAll: async (params?: PaginationParams & { is_active?: boolean }): Promise<PaginatedResponse<Promotion>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<Promotion>>('/settings/promotions', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getById: async (id: string): Promise<ApiResponse<Promotion>> => {
    try {
      const response = await apiClient.get<ApiResponse<Promotion>>(`/settings/promotions/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  getByCode: async (code: string): Promise<ApiResponse<Promotion>> => {
    try {
      const response = await apiClient.get<ApiResponse<Promotion>>(`/settings/promotions/code/${code}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  create: async (data: Partial<Promotion>): Promise<ApiResponse<Promotion>> => {
    try {
      const response = await apiClient.post<ApiResponse<Promotion>>('/settings/promotions', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  update: async (id: string, data: Partial<Promotion>): Promise<ApiResponse<Promotion>> => {
    try {
      const response = await apiClient.put<ApiResponse<Promotion>>(`/settings/promotions/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/settings/promotions/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Activity Logs API
// ============================================

export const activityLogsApi = {
  getAll: async (params?: PaginationParams & {
    user_id?: string;
    entity_type?: string;
    action?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<PaginatedResponse<ActivityLog>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<ActivityLog>>('/activity-logs', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// ============================================
// Receipts API
// ============================================

export const receiptsApi = {
  generate: async (jobId: string, format: 'text' | 'html' | 'json' = 'html'): Promise<ApiResponse<string>> => {
    try {
      const response = await apiClient.get<ApiResponse<string>>(`/receipts/${jobId}`, {
        params: { format },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },

  print: async (jobId: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.post<ApiResponse<void>>(`/receipts/${jobId}/print`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  },
};

// Export the API client for custom requests
export { apiClient };

// Combined API object for convenience
export const api = {
  auth: authApi,
  dashboard: dashboardApi,
  users: usersApi,
  customers: customersApi,
  vehicles: vehiclesApi,
  services: servicesApi,
  jobs: jobsApi,
  payments: paymentsApi,
  bays: baysApi,
  equipment: equipmentApi,
  inventory: inventoryApi,
  suppliers: suppliersApi,
  subscriptions: subscriptionsApi,
  expenses: expensesApi,
  cashSessions: cashSessionsApi,
  reports: reportsApi,
  settings: settingsApi,
  branches: branchesApi,
  promotions: promotionsApi,
  activityLogs: activityLogsApi,
  receipts: receiptsApi,
};
