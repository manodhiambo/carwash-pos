// Job Status Constants
export const JOB_STATUS = {
  CHECKED_IN: 'checked_in',
  IN_QUEUE: 'in_queue',
  WASHING: 'washing',
  DETAILING: 'detailing',
  COMPLETED: 'completed',
  PAID: 'paid',
  CANCELLED: 'cancelled',
} as const;

export const JOB_STATUS_FLOW = [
  JOB_STATUS.CHECKED_IN,
  JOB_STATUS.IN_QUEUE,
  JOB_STATUS.WASHING,
  JOB_STATUS.DETAILING,
  JOB_STATUS.COMPLETED,
  JOB_STATUS.PAID,
];

// Payment Constants
export const PAYMENT_METHOD = {
  CASH: 'cash',
  MPESA: 'mpesa',
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  CREDIT: 'credit',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIAL: 'partial',
} as const;

// Vehicle Types
export const VEHICLE_TYPE = {
  SALOON: 'saloon',
  SUV: 'suv',
  VAN: 'van',
  TRUCK: 'truck',
  PICKUP: 'pickup',
  MOTORCYCLE: 'motorcycle',
  BUS: 'bus',
  TRAILER: 'trailer',
} as const;

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  saloon: 'Saloon',
  suv: 'SUV',
  van: 'Van',
  truck: 'Truck',
  pickup: 'Pickup',
  motorcycle: 'Motorcycle',
  bus: 'Bus',
  trailer: 'Trailer',
};

// Service Categories
export const SERVICE_CATEGORY = {
  EXTERIOR: 'exterior',
  INTERIOR: 'interior',
  FULL_WASH: 'full_wash',
  ENGINE: 'engine',
  WAX_POLISH: 'wax_polish',
  UNDERWASH: 'underwash',
  DETAILING: 'detailing',
  OTHER: 'other',
} as const;

// User Roles
export const USER_ROLE = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  ATTENDANT: 'attendant',
  ACCOUNTANT: 'accountant',
} as const;

export const USER_ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  admin: 90,
  manager: 70,
  accountant: 50,
  cashier: 40,
  attendant: 30,
};

// Bay Status
export const BAY_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  MAINTENANCE: 'maintenance',
  RESERVED: 'reserved',
} as const;

// Inventory Categories
export const INVENTORY_CATEGORY = {
  DETERGENT: 'detergent',
  WAX: 'wax',
  POLISH: 'polish',
  TOWEL: 'towel',
  SPONGE: 'sponge',
  CHEMICAL: 'chemical',
  EQUIPMENT: 'equipment',
  OTHER: 'other',
} as const;

// Expense Categories
export const EXPENSE_CATEGORY = {
  RENT: 'rent',
  UTILITIES: 'utilities',
  SUPPLIES: 'supplies',
  SALARIES: 'salaries',
  MAINTENANCE: 'maintenance',
  MARKETING: 'marketing',
  TAXES: 'taxes',
  OTHER: 'other',
} as const;

// Activity Actions
export const ACTIVITY_ACTION = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  VIEW: 'view',
  PAYMENT: 'payment',
  REFUND: 'refund',
  VOID: 'void',
  OVERRIDE: 'override',
  EXPORT: 'export',
} as const;

// Subscription Types
export const SUBSCRIPTION_TYPE = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  PREPAID: 'prepaid',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to perform this action',
  INVALID_CREDENTIALS: 'Invalid username or password',
  USER_NOT_FOUND: 'User not found',
  USER_INACTIVE: 'Your account is inactive. Please contact admin.',
  TOKEN_EXPIRED: 'Your session has expired. Please login again.',
  TOKEN_INVALID: 'Invalid authentication token',
  VALIDATION_ERROR: 'Validation error',
  NOT_FOUND: 'Resource not found',
  SERVER_ERROR: 'An unexpected error occurred',
  BAY_NOT_AVAILABLE: 'Selected bay is not available',
  JOB_NOT_FOUND: 'Job not found',
  VEHICLE_NOT_FOUND: 'Vehicle not found',
  SERVICE_NOT_FOUND: 'Service not found',
  CUSTOMER_NOT_FOUND: 'Customer not found',
  PAYMENT_FAILED: 'Payment processing failed',
  INSUFFICIENT_INVENTORY: 'Insufficient inventory for this item',
  CASH_SESSION_NOT_OPEN: 'No open cash session. Please open a cash session first.',
  ALREADY_PAID: 'This job has already been paid',
  INVALID_STATUS_TRANSITION: 'Invalid job status transition',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  PAYMENT_SUCCESS: 'Payment processed successfully',
  JOB_CHECKED_IN: 'Vehicle checked in successfully',
  JOB_COMPLETED: 'Job completed successfully',
} as const;

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Date/Time Formats
export const DATE_FORMAT = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DISPLAY_DATE: 'DD/MM/YYYY',
  DISPLAY_TIME: 'hh:mm A',
  DISPLAY_DATETIME: 'DD/MM/YYYY hh:mm A',
} as const;

// Receipt Constants
export const RECEIPT = {
  WIDTH_58MM: 32, // characters
  WIDTH_80MM: 48, // characters
  SEPARATOR: '-'.repeat(48),
  DOUBLE_LINE: '='.repeat(48),
} as const;

// Currency
export const CURRENCY = {
  CODE: 'KES',
  SYMBOL: 'KSh',
  DECIMAL_PLACES: 2,
} as const;

// M-Pesa Transaction Types
export const MPESA_TRANSACTION_TYPE = {
  PAYBILL: 'CustomerPayBillOnline',
  TILL: 'CustomerBuyGoodsOnline',
} as const;

// Long Wait Threshold (in minutes)
export const LONG_WAIT_THRESHOLD = 30;

// Low Stock Threshold
export const LOW_STOCK_THRESHOLD = 10;

// Maximum Active Jobs Per Bay
export const MAX_JOBS_PER_BAY = 1;

// Loyalty Points Configuration
export const LOYALTY = {
  POINTS_PER_100_KES: 1,
  POINTS_REDEMPTION_VALUE: 10, // KES per point
  MIN_REDEMPTION_POINTS: 100,
} as const;
