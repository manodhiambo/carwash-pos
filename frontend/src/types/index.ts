// ============================================
// User & Authentication Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  branch_id: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'manager' | 'cashier' | 'attendant' | 'supervisor';

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
}

// ============================================
// Branch Types
// ============================================

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
  settings: BranchSettings;
  created_at: string;
  updated_at: string;
}

export interface BranchSettings {
  opening_time: string;
  closing_time: string;
  currency: string;
  tax_rate: number;
  loyalty_points_rate: number;
  loyalty_points_value: number;
}

// ============================================
// Customer Types
// ============================================

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  customer_type: CustomerType;
  loyalty_points: number;
  total_visits: number;
  total_spent: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vehicles?: Vehicle[];
  subscriptions?: CustomerSubscription[];
}

export type CustomerType = 'individual' | 'corporate' | 'vip';

export interface CustomerFormData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  customer_type: CustomerType;
  notes?: string;
}

// ============================================
// Vehicle Types
// ============================================

export interface Vehicle {
  id: string;
  registration_number: string;
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  vehicle_type: VehicleType;
  customer_id?: string;
  customer?: Customer;
  notes?: string;
  total_visits: number;
  last_visit?: string;
  created_at: string;
  updated_at: string;
}

export type VehicleType = 'saloon' | 'suv' | 'pickup' | 'van' | 'motorcycle' | 'bus' | 'truck' | 'trailer';

export interface VehicleFormData {
  registration_number: string;
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  vehicle_type: VehicleType;
  customer_id?: string;
  notes?: string;
}

// ============================================
// Service Types
// ============================================

export interface Service {
  id: string;
  name: string;
  description?: string;
  category: ServiceCategory;
  base_price?: number;
  duration_minutes: number;
  is_addon: boolean;
  is_active: boolean;
  prices?: ServicePrice[];
  pricing?: ServicePrice[]; // Backend returns 'pricing' instead of 'prices'
  created_at: string;
  updated_at: string;
}

export type ServiceCategory = 'wash' | 'detail' | 'polish' | 'interior' | 'exterior' | 'specialty' | 'package';

export interface ServicePrice {
  id: string;
  service_id: string;
  vehicle_type: VehicleType;
  price: number;
}

export interface ServiceFormData {
  name: string;
  description?: string;
  category: ServiceCategory;
  base_price?: number;
  duration_minutes: number;
  is_addon: boolean;
  pricing?: { vehicle_type: VehicleType; price: number }[];
  [key: string]: unknown;
}

// ============================================
// Job Types
// ============================================

export interface Job {
  id: string;
  job_number: string;
  vehicle_id: string;
  vehicle: Vehicle;
  customer_id?: string;
  customer?: Customer;
  bay_id?: string;
  bay?: Bay;
  assigned_staff_id?: string;
  assigned_staff?: User;
  status: JobStatus;
  priority: JobPriority;
  notes?: string;
  check_in_time: string;
  start_time?: string;
  end_time?: string;
  estimated_duration: number;
  actual_duration?: number;
  services: JobService[];
  subtotal: number;
  discount_amount: number;
  discount_type?: DiscountType;
  tax_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type JobStatus = 'pending' | 'queued' | 'in_progress' | 'washing' | 'drying' | 'finishing' | 'completed' | 'cancelled';

export type JobPriority = 'normal' | 'high' | 'urgent';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

export type DiscountType = 'percentage' | 'fixed';

export interface JobService {
  id: string;
  job_id: string;
  service_id: string;
  service: Service;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface CheckInFormData {
  registration_number: string;
  vehicle_type: VehicleType;
  make?: string;
  model?: string;
  color?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  services: string[];
  priority: JobPriority;
  notes?: string;
  bay_id?: string;
  assigned_staff_id?: string;
}

export interface CheckInPayload {
  registration_no: string;
  vehicle_type: VehicleType;
  make?: string;
  model?: string;
  color?: string;
  customer_name?: string;
  customer_phone?: string;
  services: { service_id: number; quantity: number }[];
  priority?: JobPriority;
  bay_id?: string;
  assigned_staff_id?: string;
  notes?: string;
}

// ============================================
// Payment Types
// ============================================

export interface Payment {
  id: string;
  payment_number: string;
  job_id: string;
  job?: Job;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentTransactionStatus;
  reference_number?: string;
  mpesa_receipt?: string;
  mpesa_phone?: string;
  notes?: string;
  received_by: string;
  received_by_user?: User;
  cash_session_id?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'cash' | 'mpesa' | 'card' | 'bank_transfer' | 'loyalty_points';

export type PaymentTransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export interface PaymentFormData {
  job_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  mpesa_phone?: string;
  notes?: string;
}

// ============================================
// Bay Types
// ============================================

export interface Bay {
  id: string;
  name: string;
  bay_number: number;
  bay_type: BayType;
  status: BayStatus;
  branch_id: string;
  current_job_id?: string;
  current_job?: Job;
  capacity: number;
  is_active: boolean;
  equipment: Equipment[];
  created_at: string;
  updated_at: string;
}

export type BayType = 'manual' | 'automatic' | 'self_service' | 'detail';

export type BayStatus = 'available' | 'occupied' | 'maintenance' | 'reserved';

export interface BayFormData {
  name: string;
  bay_number: number;
  bay_type: BayType;
  capacity: number;
}

export interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  bay_id?: string;
  status: EquipmentStatus;
  serial_number?: string;
  purchase_date?: string;
  last_maintenance?: string;
  next_maintenance?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type EquipmentStatus = 'operational' | 'needs_maintenance' | 'under_repair' | 'out_of_service';

// ============================================
// Inventory Types
// ============================================

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: InventoryCategory;
  description?: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  unit_cost: number;
  supplier_id?: string;
  supplier?: Supplier;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type InventoryCategory = 'chemicals' | 'consumables' | 'equipment' | 'spare_parts' | 'cleaning_supplies' | 'other';

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockTransaction {
  id: string;
  item_id: string;
  item?: InventoryItem;
  transaction_type: StockTransactionType;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reference_number?: string;
  notes?: string;
  created_by: string;
  created_by_user?: User;
  created_at: string;
}

export type StockTransactionType = 'purchase' | 'usage' | 'adjustment' | 'transfer' | 'return' | 'damaged' | 'expired';

export interface InventoryFormData {
  name: string;
  sku: string;
  category: InventoryCategory;
  description?: string;
  unit: string;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  unit_cost: number;
  supplier_id?: string;
  location?: string;
}

// ============================================
// Subscription Types
// ============================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  duration_days: number;
  price: number;
  wash_limit?: number;
  services_included: string[];
  vehicle_types: VehicleType[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerSubscription {
  id: string;
  customer_id: string;
  customer?: Customer;
  plan_id: string;
  plan?: SubscriptionPlan;
  vehicle_id: string;
  vehicle?: Vehicle;
  start_date: string;
  end_date: string;
  status: SubscriptionStatus;
  washes_used: number;
  washes_remaining?: number;
  amount_paid: number;
  payment_id?: string;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'suspended';

// ============================================
// Expense & Cash Management Types
// ============================================

export interface Expense {
  id: string;
  expense_number: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  receipt_url?: string;
  status: ExpenseStatus;
  approved_by?: string;
  approved_by_user?: User;
  approved_at?: string;
  notes?: string;
  branch_id: string;
  cash_session_id?: string;
  created_by: string;
  created_by_user?: User;
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory = 'utilities' | 'supplies' | 'maintenance' | 'salaries' | 'rent' | 'marketing' | 'equipment' | 'transport' | 'other';

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface CashSession {
  id: string;
  user_id: string;
  user?: User;
  branch_id: string;
  opening_balance: number;
  closing_balance?: number;
  expected_balance?: number;
  variance?: number;
  status: CashSessionStatus;
  opened_at: string;
  closed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type CashSessionStatus = 'open' | 'closed';

// ============================================
// Report Types
// ============================================

export interface DashboardMetrics {
  today: {
    total_jobs: number;
    completed_jobs: number;
    total_revenue: number;
    average_job_value: number;
    vehicles_in_queue: number;
    active_bays: number;
  };
  comparison: {
    jobs_change: number;
    revenue_change: number;
  };
  recent_jobs: Job[];
  bay_status: Bay[];
  low_stock_items: InventoryItem[];
  pending_payments: Job[];
}

export interface SalesReport {
  period: string;
  total_revenue: number;
  total_jobs: number;
  average_job_value: number;
  by_payment_method: {
    method: PaymentMethod;
    amount: number;
    count: number;
  }[];
  by_service: {
    service_id: string;
    service_name: string;
    count: number;
    revenue: number;
  }[];
  by_day: {
    date: string;
    revenue: number;
    jobs: number;
  }[];
}

export interface OperationalReport {
  period: string;
  total_jobs: number;
  completed_jobs: number;
  cancelled_jobs: number;
  average_wait_time: number;
  average_service_time: number;
  bay_utilization: {
    bay_id: string;
    bay_name: string;
    jobs_completed: number;
    utilization_rate: number;
  }[];
  staff_performance: {
    staff_id: string;
    staff_name: string;
    jobs_completed: number;
    average_time: number;
  }[];
}

// ============================================
// Activity Log Types
// ============================================

export interface ActivityLog {
  id: string;
  user_id: string;
  user?: User;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ============================================
// Settings Types
// ============================================

export interface SystemSettings {
  id: string;
  branch_id?: string;
  key: string;
  value: string;
  type: SettingType;
  category: SettingCategory;
  description?: string;
  updated_by?: string;
  updated_at: string;
}

export type SettingType = 'string' | 'number' | 'boolean' | 'json';

export type SettingCategory = 'general' | 'payments' | 'printing' | 'notifications' | 'loyalty' | 'appearance';

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  start_date: string;
  end_date: string;
  min_purchase?: number;
  max_discount?: number;
  usage_limit?: number;
  usage_count: number;
  applicable_services?: string[];
  applicable_vehicle_types?: VehicleType[];
  promo_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// ============================================
// Form & Filter Types
// ============================================

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface FilterState {
  search: string;
  status?: string;
  category?: string;
  dateRange?: DateRange;
  branch_id?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// ============================================
// Notification Types
// ============================================

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// ============================================
// Receipt Types
// ============================================

export interface ReceiptData {
  job: Job;
  business: {
    name: string;
    address: string;
    phone: string;
    email: string;
    pin?: string;
  };
  payment?: Payment;
  qr_code?: string;
}
