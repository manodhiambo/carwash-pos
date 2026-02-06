import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'carwash_pos',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Bcrypt
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },

  // M-Pesa
  mpesa: {
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    passkey: process.env.MPESA_PASSKEY || '',
    shortCode: process.env.MPESA_BUSINESS_SHORT_CODE || '',
    callbackUrl: process.env.MPESA_CALLBACK_URL || '',
    environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
  },

  // SMS (Africa's Talking)
  sms: {
    apiKey: process.env.AT_API_KEY || '',
    username: process.env.AT_USERNAME || 'sandbox',
    senderId: process.env.AT_SENDER_ID || 'CARWASH',
  },

  // File Upload
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  },

  // Printer
  printer: {
    type: process.env.PRINTER_TYPE || 'usb',
    width: parseInt(process.env.PRINTER_WIDTH || '80', 10),
    vendorId: process.env.PRINTER_VENDOR_ID || '0x04b8',
    productId: process.env.PRINTER_PRODUCT_ID || '0x0202',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    file: process.env.LOG_FILE || 'logs/app.log',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // Company Details
  company: {
    name: process.env.COMPANY_NAME || 'CarWash Pro',
    address: process.env.COMPANY_ADDRESS || 'Nairobi, Kenya',
    phone: process.env.COMPANY_PHONE || '+254700000000',
    email: process.env.COMPANY_EMAIL || 'info@carwashpro.co.ke',
    pin: process.env.COMPANY_PIN || 'P000000000A',
  },

  // Multi-branch
  multiBranch: {
    defaultBranchId: parseInt(process.env.DEFAULT_BRANCH_ID || '1', 10),
    enabled: process.env.ENABLE_MULTI_BRANCH === 'true',
  },
};

export default config;
