import { body, param, query, ValidationChain } from 'express-validator';
import {
  JOB_STATUS,
  PAYMENT_METHOD,
  VEHICLE_TYPE,
  SERVICE_CATEGORY,
  USER_ROLE,
  BAY_STATUS,
  INVENTORY_CATEGORY,
  EXPENSE_CATEGORY,
  SUBSCRIPTION_TYPE
} from './constants';

// Common Validators
export const commonValidators = {
  id: (field: string = 'id'): ValidationChain =>
    param(field)
      .isInt({ min: 1 })
      .withMessage(`${field} must be a positive integer`),

  optionalId: (field: string): ValidationChain =>
    body(field)
      .optional()
      .isInt({ min: 1 })
      .withMessage(`${field} must be a positive integer`),

  requiredString: (field: string, minLength: number = 1, maxLength: number = 255): ValidationChain =>
    body(field)
      .trim()
      .notEmpty()
      .withMessage(`${field} is required`)
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`),

  optionalString: (field: string, maxLength: number = 255): ValidationChain =>
    body(field)
      .optional()
      .trim()
      .isLength({ max: maxLength })
      .withMessage(`${field} must be at most ${maxLength} characters`),

  email: (field: string = 'email'): ValidationChain =>
    body(field)
      .optional()
      .trim()
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),

  requiredEmail: (field: string = 'email'): ValidationChain =>
    body(field)
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),

  phone: (field: string = 'phone'): ValidationChain =>
    body(field)
      .optional()
      .trim()
      .matches(/^(\+?254|0)?[17]\d{8}$/)
      .withMessage('Invalid Kenyan phone number'),

  requiredPhone: (field: string = 'phone'): ValidationChain =>
    body(field)
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^(\+?254|0)?[17]\d{8}$/)
      .withMessage('Invalid Kenyan phone number'),

  amount: (field: string): ValidationChain =>
    body(field)
      .isFloat({ min: 0 })
      .withMessage(`${field} must be a positive number`),

  requiredAmount: (field: string): ValidationChain =>
    body(field)
      .notEmpty()
      .withMessage(`${field} is required`)
      .isFloat({ min: 0 })
      .withMessage(`${field} must be a positive number`),

  date: (field: string): ValidationChain =>
    body(field)
      .optional()
      .isISO8601()
      .withMessage(`${field} must be a valid date`),

  requiredDate: (field: string): ValidationChain =>
    body(field)
      .notEmpty()
      .withMessage(`${field} is required`)
      .isISO8601()
      .withMessage(`${field} must be a valid date`),

  boolean: (field: string): ValidationChain =>
    body(field)
      .optional()
      .isBoolean()
      .withMessage(`${field} must be a boolean`),

  pagination: (): ValidationChain[] => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
};

// Auth Validators
export const authValidators = {
  login: [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],

  register: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('phone')
      .optional()
      .trim()
      .matches(/^(\+?254|0)?[17]\d{8}$/)
      .withMessage('Invalid Kenyan phone number'),
    body('role')
      .isIn(Object.values(USER_ROLE))
      .withMessage('Invalid role'),
    body('branch_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid branch ID'),
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
    body('confirmPassword')
      .notEmpty()
      .withMessage('Confirm password is required')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
  ],
};

// Vehicle Validators
export const vehicleValidators = {
  create: [
    body('registration_no')
      .trim()
      .notEmpty()
      .withMessage('Registration number is required')
      .isLength({ min: 3, max: 20 })
      .withMessage('Registration number must be between 3 and 20 characters')
      .toUpperCase(),
    body('vehicle_type')
      .isIn(Object.values(VEHICLE_TYPE))
      .withMessage('Invalid vehicle type'),
    body('color')
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage('Color must be at most 30 characters'),
    body('make')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Make must be at most 50 characters'),
    body('model')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Model must be at most 50 characters'),
    body('customer_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid customer ID'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes must be at most 500 characters'),
  ],

  update: [
    param('id').isInt({ min: 1 }).withMessage('Invalid vehicle ID'),
    body('registration_no')
      .optional()
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Registration number must be between 3 and 20 characters')
      .toUpperCase(),
    body('vehicle_type')
      .optional()
      .isIn(Object.values(VEHICLE_TYPE))
      .withMessage('Invalid vehicle type'),
    body('color')
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage('Color must be at most 30 characters'),
    body('make')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Make must be at most 50 characters'),
    body('model')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Model must be at most 50 characters'),
    body('customer_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid customer ID'),
  ],
};

// Job Validators
export const jobValidators = {
  checkIn: [
    body('registration_no')
      .trim()
      .notEmpty()
      .withMessage('Registration number is required')
      .toUpperCase(),
    body('vehicle_type')
      .isIn(Object.values(VEHICLE_TYPE))
      .withMessage('Invalid vehicle type'),
    body('vehicle_color')
      .optional()
      .trim()
      .isLength({ max: 30 }),
    body('customer_name')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('customer_phone')
      .optional()
      .trim()
      .matches(/^(\+?254|0)?[17]\d{8}$/)
      .withMessage('Invalid phone number'),
    body('services')
      .isArray({ min: 1 })
      .withMessage('At least one service must be selected'),
    body('services.*.service_id')
      .isInt({ min: 1 })
      .withMessage('Invalid service ID'),
    body('services.*.quantity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1'),
    body('bay_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid bay ID'),
    body('assigned_staff_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid staff ID'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('damage_notes')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('is_rewash')
      .optional()
      .isBoolean(),
    body('original_job_id')
      .optional()
      .isInt({ min: 1 }),
  ],

  updateStatus: [
    param('id').isInt({ min: 1 }).withMessage('Invalid job ID'),
    body('status')
      .isIn(Object.values(JOB_STATUS))
      .withMessage('Invalid job status'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }),
  ],

  assignBay: [
    param('id').isInt({ min: 1 }).withMessage('Invalid job ID'),
    body('bay_id')
      .isInt({ min: 1 })
      .withMessage('Bay ID is required'),
  ],

  assignStaff: [
    param('id').isInt({ min: 1 }).withMessage('Invalid job ID'),
    body('staff_id')
      .isInt({ min: 1 })
      .withMessage('Staff ID is required'),
  ],
};

// Service Validators
export const serviceValidators = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Service name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('category')
      .isIn(Object.values(SERVICE_CATEGORY))
      .withMessage('Invalid service category'),
    body('base_price')
      .isFloat({ min: 0 })
      .withMessage('Base price must be a positive number'),
    body('duration_minutes')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Duration must be a positive integer'),
    body('is_active')
      .optional()
      .isBoolean(),
    body('pricing')
      .optional()
      .isArray(),
    body('pricing.*.vehicle_type')
      .optional()
      .isIn(Object.values(VEHICLE_TYPE))
      .withMessage('Invalid vehicle type'),
    body('pricing.*.price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
  ],

  update: [
    param('id').isInt({ min: 1 }).withMessage('Invalid service ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('category')
      .optional()
      .isIn(Object.values(SERVICE_CATEGORY)),
    body('base_price')
      .optional()
      .isFloat({ min: 0 }),
    body('duration_minutes')
      .optional()
      .isInt({ min: 1 }),
    body('is_active')
      .optional()
      .isBoolean(),
  ],
};

// Payment Validators
export const paymentValidators = {
  create: [
    body('job_id')
      .isInt({ min: 1 })
      .withMessage('Job ID is required'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    body('payment_method')
      .isIn(Object.values(PAYMENT_METHOD))
      .withMessage('Invalid payment method'),
    body('reference_no')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }),
  ],

  mpesaSTK: [
    body('job_id')
      .isInt({ min: 1 })
      .withMessage('Job ID is required'),
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^(\+?254|0)?[17]\d{8}$/)
      .withMessage('Invalid Kenyan phone number'),
    body('amount')
      .isFloat({ min: 1 })
      .withMessage('Amount must be at least 1'),
  ],
};

// Customer Validators
export const customerValidators = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Customer name is required')
      .isLength({ min: 2, max: 100 }),
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^(\+?254|0)?[17]\d{8}$/)
      .withMessage('Invalid Kenyan phone number'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .normalizeEmail(),
    body('customer_type')
      .optional()
      .isIn(['individual', 'corporate', 'fleet']),
    body('company_name')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('is_vip')
      .optional()
      .isBoolean(),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }),
  ],

  update: [
    param('id').isInt({ min: 1 }).withMessage('Invalid customer ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }),
    body('phone')
      .optional()
      .trim()
      .matches(/^(\+?254|0)?[17]\d{8}$/)
      .withMessage('Invalid Kenyan phone number'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .normalizeEmail(),
    body('customer_type')
      .optional()
      .isIn(['individual', 'corporate', 'fleet']),
    body('is_vip')
      .optional()
      .isBoolean(),
  ],
};

// Inventory Validators
export const inventoryValidators = {
  createItem: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Item name is required')
      .isLength({ min: 2, max: 100 }),
    body('category')
      .isIn(Object.values(INVENTORY_CATEGORY))
      .withMessage('Invalid category'),
    body('unit')
      .trim()
      .notEmpty()
      .withMessage('Unit is required')
      .isLength({ max: 20 }),
    body('quantity')
      .optional()
      .isFloat({ min: 0 }),
    body('reorder_level')
      .optional()
      .isFloat({ min: 0 }),
    body('unit_cost')
      .optional()
      .isFloat({ min: 0 }),
    body('sku')
      .optional()
      .trim()
      .isLength({ max: 50 }),
    body('supplier_id')
      .optional()
      .isInt({ min: 1 }),
  ],

  stockTransaction: [
    body('item_id')
      .isInt({ min: 1 })
      .withMessage('Item ID is required'),
    body('transaction_type')
      .isIn(['stock_in', 'stock_out', 'adjustment', 'transfer', 'waste'])
      .withMessage('Invalid transaction type'),
    body('quantity')
      .isFloat({ min: 0.01 })
      .withMessage('Quantity must be greater than 0'),
    body('unit_cost')
      .optional()
      .isFloat({ min: 0 }),
    body('reference')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }),
  ],
};

// Bay Validators
export const bayValidators = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Bay name is required')
      .isLength({ min: 1, max: 50 }),
    body('bay_number')
      .isInt({ min: 1 })
      .withMessage('Bay number must be a positive integer'),
    body('bay_type')
      .optional()
      .isIn(['manual', 'automatic', 'tunnel', 'detailing']),
    body('capacity')
      .optional()
      .isInt({ min: 1 }),
    body('is_active')
      .optional()
      .isBoolean(),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }),
  ],

  updateStatus: [
    param('id').isInt({ min: 1 }).withMessage('Invalid bay ID'),
    body('status')
      .isIn(Object.values(BAY_STATUS))
      .withMessage('Invalid bay status'),
  ],
};

// Expense Validators
export const expenseValidators = {
  create: [
    body('category')
      .isIn(Object.values(EXPENSE_CATEGORY))
      .withMessage('Invalid expense category'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 500 }),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    body('payment_method')
      .optional()
      .isIn(Object.values(PAYMENT_METHOD)),
    body('expense_date')
      .notEmpty()
      .withMessage('Expense date is required')
      .isISO8601(),
    body('reference_no')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }),
  ],
};

// Cash Session Validators
export const cashSessionValidators = {
  open: [
    body('opening_balance')
      .isFloat({ min: 0 })
      .withMessage('Opening balance must be a non-negative number'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }),
  ],

  close: [
    param('id').isInt({ min: 1 }).withMessage('Invalid session ID'),
    body('actual_closing')
      .isFloat({ min: 0 })
      .withMessage('Actual closing balance must be a non-negative number'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }),
  ],
};

// Subscription Validators
export const subscriptionValidators = {
  createPlan: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Plan name is required')
      .isLength({ min: 2, max: 100 }),
    body('subscription_type')
      .isIn(Object.values(SUBSCRIPTION_TYPE))
      .withMessage('Invalid subscription type'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a non-negative number'),
    body('duration_days')
      .isInt({ min: 1 })
      .withMessage('Duration must be at least 1 day'),
    body('wash_limit')
      .optional()
      .isInt({ min: 1 }),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }),
  ],

  subscribe: [
    body('customer_id')
      .isInt({ min: 1 })
      .withMessage('Customer ID is required'),
    body('plan_id')
      .isInt({ min: 1 })
      .withMessage('Plan ID is required'),
    body('vehicle_id')
      .isInt({ min: 1 })
      .withMessage('Vehicle ID is required'),
    body('payment_id')
      .optional()
      .isInt({ min: 1 }),
  ],
};

// Report Query Validators
export const reportValidators = {
  dateRange: [
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date'),
    query('branch_id')
      .optional()
      .isInt({ min: 1 }),
  ],
};


// Supplier Validators
export const supplierValidators = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Supplier name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('contact_person')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('phone')
      .optional()
      .trim()
      .matches(/^(\+?254|0)?[17]\d{8}$/)
      .withMessage('Invalid Kenyan phone number'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }),
  ],

  update: [
    param('id').isInt({ min: 1 }).withMessage('Invalid supplier ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }),
    body('contact_person')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('phone')
      .optional()
      .trim()
      .matches(/^(\+?254|0)?[17]\d{8}$/)
      .withMessage('Invalid Kenyan phone number'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .normalizeEmail(),
    body('is_active')
      .optional()
      .isBoolean(),
  ],
};

export default {
  commonValidators,
  authValidators,
  vehicleValidators,
  jobValidators,
  serviceValidators,
  paymentValidators,
  customerValidators,
  inventoryValidators,
  bayValidators,
  expenseValidators,
  cashSessionValidators,
  subscriptionValidators,
  supplierValidators,
  reportValidators,
};
