import { format, parseISO, differenceInMinutes, addDays, startOfDay, endOfDay } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { CURRENCY, PAGINATION } from './constants';
import { PaginationInfo, SortOptions } from '../types';

/**
 * Generate a unique job number
 * Format: CW-YYYYMMDD-XXXX (e.g., CW-20240115-0001)
 */
export function generateJobNumber(sequence: number): string {
  const date = format(new Date(), 'yyyyMMdd');
  const seq = sequence.toString().padStart(4, '0');
  return `CW-${date}-${seq}`;
}

/**
 * Generate a unique reference number
 */
export function generateReferenceNumber(prefix: string = 'REF'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate UUID
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number): string {
  return `${CURRENCY.SYMBOL} ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: CURRENCY.DECIMAL_PLACES,
    maximumFractionDigits: CURRENCY.DECIMAL_PLACES,
  })}`;
}

/**
 * Parse and validate Kenyan phone number
 * Converts to format: 254XXXXXXXXX
 */
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }

  return cleaned;
}

/**
 * Validate Kenyan phone number
 */
export function isValidKenyanPhone(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  return /^254[17]\d{8}$/.test(formatted);
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy hh:mm a');
}

/**
 * Get time difference in minutes
 */
export function getMinutesDifference(start: Date | string, end: Date | string = new Date()): number {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  return differenceInMinutes(endDate, startDate);
}

/**
 * Get start of day
 */
export function getStartOfDay(date: Date = new Date()): Date {
  return startOfDay(date);
}

/**
 * Get end of day
 */
export function getEndOfDay(date: Date = new Date()): Date {
  return endOfDay(date);
}

/**
 * Add days to date
 */
export function addDaysToDate(date: Date, days: number): Date {
  return addDays(date, days);
}

/**
 * Calculate pagination info
 */
export function calculatePagination(
  total: number,
  page: number = PAGINATION.DEFAULT_PAGE,
  limit: number = PAGINATION.DEFAULT_LIMIT
): PaginationInfo {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Build pagination SQL clause
 */
export function buildPaginationClause(page: number, limit: number): { offset: number; limit: number } {
  const validLimit = Math.min(Math.max(1, limit), PAGINATION.MAX_LIMIT);
  const validPage = Math.max(1, page);
  const offset = (validPage - 1) * validLimit;
  return { offset, limit: validLimit };
}

/**
 * Build sort SQL clause
 */
export function buildSortClause(
  sortOptions: SortOptions | undefined,
  allowedFields: string[],
  defaultField: string = 'created_at',
  defaultDirection: 'asc' | 'desc' = 'desc'
): string {
  if (!sortOptions || !allowedFields.includes(sortOptions.field)) {
    return `ORDER BY ${defaultField} ${defaultDirection.toUpperCase()}`;
  }
  return `ORDER BY ${sortOptions.field} ${sortOptions.direction.toUpperCase()}`;
}

/**
 * Sanitize string for SQL LIKE clause
 */
export function sanitizeLikePattern(value: string): string {
  return value.replace(/[%_]/g, '\\$&');
}

/**
 * Build search SQL clause
 */
export function buildSearchClause(
  searchTerm: string | undefined,
  searchFields: string[],
  paramIndex: number
): { clause: string; param: string | null; nextIndex: number } {
  if (!searchTerm || searchTerm.trim() === '') {
    return { clause: '', param: null, nextIndex: paramIndex };
  }

  const conditions = searchFields.map(field => `${field} ILIKE $${paramIndex}`).join(' OR ');
  return {
    clause: `AND (${conditions})`,
    param: `%${sanitizeLikePattern(searchTerm.trim())}%`,
    nextIndex: paramIndex + 1,
  };
}

/**
 * Round to specified decimal places
 */
export function roundTo(num: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(
  amount: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  maxDiscount?: number
): number {
  let discount = discountType === 'percentage'
    ? (amount * discountValue) / 100
    : discountValue;

  if (maxDiscount !== undefined && discount > maxDiscount) {
    discount = maxDiscount;
  }

  return Math.min(discount, amount);
}

/**
 * Calculate tax amount
 */
export function calculateTax(amount: number, taxRate: number): number {
  return roundTo((amount * taxRate) / 100);
}

/**
 * Clean and normalize vehicle registration number
 */
export function normalizeRegistrationNumber(regNo: string): string {
  return regNo.toUpperCase().replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Mask phone number for privacy
 */
export function maskPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 6) return phone;
  return cleaned.substring(0, 4) + '****' + cleaned.substring(cleaned.length - 2);
}

/**
 * Mask email for privacy
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.length > 2
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : local;
  return `${maskedLocal}@${domain}`;
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check if value is empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Pick specific keys from object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Omit specific keys from object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result as Omit<T, K>;
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await sleep(delay * Math.pow(2, attempt - 1));
      }
    }
  }

  throw lastError;
}

/**
 * Convert camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert object keys to snake_case
 */
export function keysToSnakeCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  Object.entries(obj).forEach(([key, value]) => {
    result[toSnakeCase(key)] = value;
  });
  return result;
}

/**
 * Convert object keys to camelCase
 */
export function keysToCamelCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  Object.entries(obj).forEach(([key, value]) => {
    result[toCamelCase(key)] = value;
  });
  return result;
}

/**
 * Group array items by key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Sum array of numbers
 */
export function sum(numbers: number[]): number {
  return numbers.reduce((acc, num) => acc + num, 0);
}

/**
 * Calculate average
 */
export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return sum(numbers) / numbers.length;
}

/**
 * Get unique values from array
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Check if current time is within happy hour
 */
export function isHappyHour(start: string, end: string): boolean {
  const now = new Date();
  const currentTime = format(now, 'HH:mm');
  return currentTime >= start && currentTime <= end;
}

/**
 * Calculate estimated completion time based on services
 */
export function calculateEstimatedCompletion(totalMinutes: number): Date {
  const now = new Date();
  return new Date(now.getTime() + totalMinutes * 60 * 1000);
}
