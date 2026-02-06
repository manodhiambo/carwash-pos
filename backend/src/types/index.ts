import { Request } from 'express';

// User Types
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'cashier' | 'attendant' | 'accountant';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  password_hash: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  branch_id?: number;
  avatar?: string;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Vehicle Types
export type VehicleType = 'saloon' | 'suv' | 'van' | 'truck' | 'pickup' | 'motorcycle' | 'bus' | 'trailer';

export interface Vehicle {
  id: number;
  registration_no: string;
  vehicle_type: VehicleType;
  color?: string;
  make?: string;
  model?: string;
  customer_id?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Customer Types
export type CustomerType = 'individual' | 'corporate' | 'fleet';

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  customer_type: CustomerType;
  company_name?: string;
  address?: string;
  loyalty_points: number;
  total_visits: number;
  total_spent: number;
  is_vip: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Job Types
export type JobStatus =
  | 'checked_in'
  | 'in_queue'
  | 'washing'
  | 'detailing'
  | 'completed'
  | 'paid'
  | 'cancelled';

export interface Job {
  id: number;
  job_no: string;
  vehicle_id: number;
  customer_id?: number;
  branch_id: number;
  bay_id?: number;
  status: JobStatus;
  assigned_staff_id?: number;
  checked_in_by: number;
  estimated_completion?: Date;
  actual_completion?: Date;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
  notes?: string;
  damage_notes?: string;
  is_rewash: boolean;
  original_job_id?: number;
  photos?: string[];
  created_at: Date;
  updated_at: Date;
}

// Service Types
export type ServiceCategory =
  | 'exterior'
  | 'interior'
  | 'full_wash'
  | 'engine'
  | 'wax_polish'
  | 'underwash'
  | 'detailing'
  | 'other';

export interface Service {
  id: number;
  name: string;
  description?: string;
  category: ServiceCategory;
  base_price: number;
  duration_minutes: number;
  is_active: boolean;
  branch_id?: number;
  created_at: Date;
  updated_at: Date;
}

export interface ServicePricing {
  id: number;
  service_id: number;
  vehicle_type: VehicleType;
  price: number;
  created_at: Date;
  updated_at: Date;
}

export interface JobService {
  id: number;
  job_id: number;
  service_id: number;
  price: number;
  quantity: number;
  discount: number;
  total: number;
  staff_id?: number;
  status: 'pending' | 'in_progress' | 'completed';
  started_at?: Date;
  completed_at?: Date;
  notes?: string;
  created_at: Date;
}

// Payment Types
export type PaymentMethod = 'cash' | 'mpesa' | 'card' | 'bank_transfer' | 'credit';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'partial';

export interface Payment {
  id: number;
  job_id: number;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  reference_no?: string;
  mpesa_receipt?: string;
  card_last_four?: string;
  received_by: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Bay Types
export type BayStatus = 'available' | 'occupied' | 'maintenance' | 'reserved';
export type BayType = 'manual' | 'automatic' | 'tunnel' | 'detailing';

export interface Bay {
  id: number;
  name: string;
  bay_number: number;
  bay_type: BayType;
  status: BayStatus;
  branch_id: number;
  current_job_id?: number;
  capacity: number;
  is_active: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Equipment Types
export type EquipmentStatus = 'operational' | 'maintenance' | 'broken' | 'retired';

export interface Equipment {
  id: number;
  name: string;
  equipment_type: string;
  serial_number?: string;
  bay_id?: number;
  branch_id: number;
  status: EquipmentStatus;
  purchase_date?: Date;
  last_maintenance?: Date;
  next_maintenance?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Inventory Types
export type InventoryCategory =
  | 'detergent'
  | 'wax'
  | 'polish'
  | 'towel'
  | 'sponge'
  | 'chemical'
  | 'equipment'
  | 'other';

export type TransactionType = 'stock_in' | 'stock_out' | 'adjustment' | 'transfer' | 'waste';

export interface InventoryItem {
  id: number;
  name: string;
  description?: string;
  category: InventoryCategory;
  sku?: string;
  unit: string;
  quantity: number;
  reorder_level: number;
  unit_cost: number;
  branch_id: number;
  supplier_id?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryTransaction {
  id: number;
  item_id: number;
  transaction_type: TransactionType;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reference?: string;
  job_id?: number;
  performed_by: number;
  notes?: string;
  created_at: Date;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  is_active: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Expense Types
export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'supplies'
  | 'salaries'
  | 'maintenance'
  | 'marketing'
  | 'taxes'
  | 'other';

export interface Expense {
  id: number;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_no?: string;
  receipt_url?: string;
  expense_date: Date;
  branch_id: number;
  recorded_by: number;
  approved_by?: number;
  is_approved: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Cash Session Types
export interface CashSession {
  id: number;
  branch_id: number;
  opened_by: number;
  closed_by?: number;
  opening_balance: number;
  expected_closing: number;
  actual_closing?: number;
  variance?: number;
  cash_sales: number;
  mpesa_sales: number;
  card_sales: number;
  total_sales: number;
  expenses_paid: number;
  opened_at: Date;
  closed_at?: Date;
  status: 'open' | 'closed';
  notes?: string;
  created_at: Date;
}

// Subscription Types
export type SubscriptionType = 'weekly' | 'monthly' | 'prepaid';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'suspended';

export interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string;
  subscription_type: SubscriptionType;
  price: number;
  duration_days: number;
  wash_limit?: number;
  services_included: number[];
  vehicle_types: VehicleType[];
  is_active: boolean;
  branch_id?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerSubscription {
  id: number;
  customer_id: number;
  plan_id: number;
  vehicle_id: number;
  start_date: Date;
  end_date: Date;
  washes_used: number;
  washes_remaining?: number;
  status: SubscriptionStatus;
  payment_id?: number;
  created_at: Date;
  updated_at: Date;
}

// Loyalty Types
export interface LoyaltyTransaction {
  id: number;
  customer_id: number;
  job_id?: number;
  points: number;
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  description?: string;
  created_by: number;
  created_at: Date;
}

// Branch Types
export interface Branch {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  email?: string;
  manager_id?: number;
  is_active: boolean;
  settings?: BranchSettings;
  created_at: Date;
  updated_at: Date;
}

export interface BranchSettings {
  working_hours?: {
    open: string;
    close: string;
  };
  happy_hour?: {
    enabled: boolean;
    start: string;
    end: string;
    discount_percent: number;
  };
  receipt_footer?: string;
  tax_rate?: number;
}

// Activity Log Types
export type ActivityAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'payment'
  | 'refund'
  | 'void'
  | 'override'
  | 'export';

export interface ActivityLog {
  id: number;
  user_id: number;
  action: ActivityAction;
  entity_type: string;
  entity_id?: number;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// Settings Types
export interface SystemSettings {
  id: number;
  key: string;
  value: string;
  description?: string;
  is_public: boolean;
  updated_by?: number;
  updated_at: Date;
}

// Report Types
export interface DashboardMetrics {
  carsServicedToday: number;
  activeJobs: number;
  completedUnpaid: number;
  revenueToday: {
    cash: number;
    mpesa: number;
    card: number;
    total: number;
  };
  averageServiceTime: number;
  staffOnDuty: number;
  lowStockItems: number;
}

export interface DashboardAlerts {
  bayCongestion: boolean;
  longWaitVehicles: Job[];
  lowInventoryItems: InventoryItem[];
  cashVariance: number;
}

export interface SalesReport {
  period: string;
  totalRevenue: number;
  totalJobs: number;
  averageTicket: number;
  paymentBreakdown: {
    cash: number;
    mpesa: number;
    card: number;
  };
  serviceBreakdown: {
    service: string;
    count: number;
    revenue: number;
  }[];
  dailyTrend: {
    date: string;
    revenue: number;
    jobs: number;
  }[];
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo;
}

// M-Pesa Types
export interface MpesaSTKPushRequest {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export interface MpesaSTKCallback {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: {
    Item: {
      Name: string;
      Value: string | number;
    }[];
  };
}

// Receipt Types
export interface ReceiptData {
  jobNo: string;
  date: Date;
  vehicle: {
    registration: string;
    type: string;
  };
  customer?: {
    name: string;
    phone: string;
  };
  services: {
    name: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payments: {
    method: string;
    amount: number;
    reference?: string;
  }[];
  cashier: string;
  branch: string;
}

// Filter and Sort Types
export interface JobFilters {
  status?: JobStatus | JobStatus[];
  branch_id?: number;
  bay_id?: number;
  staff_id?: number;
  customer_id?: number;
  date_from?: Date;
  date_to?: Date;
  search?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}
