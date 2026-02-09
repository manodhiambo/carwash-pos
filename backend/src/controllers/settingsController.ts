import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Get all system settings
 * GET /api/v1/settings
 */
export const getAllSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { category } = req.query;

  let query = 'SELECT * FROM system_settings';
  const params: any[] = [];

  if (category) {
    query += ' WHERE category = $1';
    params.push(category);
  }

  query += ' ORDER BY category, key';

  const result = await db.query(query, params);

  // Group settings by category
  const grouped: Record<string, any> = {};
  result.rows.forEach(row => {
    if (!grouped[row.category]) {
      grouped[row.category] = {};
    }
    grouped[row.category][row.key] = row.value;
  });

  res.json({
    success: true,
    data: {
      settings: result.rows,
      grouped,
    },
  });
});

/**
 * Get single setting by key
 * GET /api/v1/settings/:key
 */
export const getSetting = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { key } = req.params;

  const result = await db.query(
    'SELECT * FROM system_settings WHERE key = $1',
    [key]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Setting not found',
    });
    return;
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

/**
 * Update single setting
 * PUT /api/v1/settings/:key
 */
export const updateSetting = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined) {
    res.status(400).json({
      success: false,
      error: 'Value is required',
    });
    return;
  }

  // Check if setting exists
  const checkResult = await db.query(
    'SELECT * FROM system_settings WHERE key = $1',
    [key]
  );

  if (checkResult.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Setting not found',
    });
    return;
  }

  // Update setting
  const result = await db.query(
    `UPDATE system_settings 
     SET value = $1, updated_at = CURRENT_TIMESTAMP
     WHERE key = $2
     RETURNING *`,
    [value, key]
  );

  res.json({
    success: true,
    message: 'Setting updated successfully',
    data: result.rows[0],
  });
});

/**
 * Update multiple settings at once
 * PUT /api/v1/settings/bulk
 */
export const updateBulkSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { settings } = req.body;

  if (!settings || !Array.isArray(settings)) {
    res.status(400).json({
      success: false,
      error: 'Settings array is required',
    });
    return;
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const updated = [];

    for (const setting of settings) {
      if (!setting.key || setting.value === undefined) {
        continue;
      }

      const result = await client.query(
        `INSERT INTO system_settings (key, value, category, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (key) 
         DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [setting.key, setting.value, setting.category || 'general']
      );

      updated.push(result.rows[0]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `${updated.length} settings updated successfully`,
      data: updated,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

/**
 * Initialize default settings if they don't exist
 * POST /api/v1/settings/initialize
 */
export const initializeSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const defaultSettings = [
    // Business Information
    { key: 'business_name', value: 'Splash & Shine CarWash', category: 'business' },
    { key: 'business_tagline', value: 'Where Every Car Shines', category: 'business' },
    { key: 'business_phone', value: '0756941144', category: 'business' },
    { key: 'business_email', value: 'info@splashshine.co.ke', category: 'business' },
    { key: 'business_address', value: 'Oginga Odinga Street, Behind Rubis Filling Station, Siaya Town', category: 'business' },
    { key: 'business_website', value: 'https://splashshine.org', category: 'business' },
    { key: 'currency', value: 'KES', category: 'business' },
    { key: 'timezone', value: 'Africa/Nairobi', category: 'business' },
    
    // Operating Hours
    { key: 'opening_time', value: '08:00', category: 'hours' },
    { key: 'closing_time', value: '18:00', category: 'hours' },
    
    // Tax & Pricing
    { key: 'tax_rate', value: '16', category: 'pricing' },
    { key: 'tax_enabled', value: 'true', category: 'pricing' },
    
    // Job Settings
    { key: 'auto_assign_bay', value: 'true', category: 'jobs' },
    { key: 'require_customer_info', value: 'false', category: 'jobs' },
    { key: 'allow_walkins', value: 'true', category: 'jobs' },
    
    // Loyalty Program
    { key: 'loyalty_enabled', value: 'true', category: 'loyalty' },
    { key: 'points_per_currency', value: '1', category: 'loyalty' },
    { key: 'points_value', value: '1', category: 'loyalty' },
    { key: 'points_expiry_days', value: '365', category: 'loyalty' },
    
    // Receipt Settings
    { key: 'receipt_auto_print', value: 'false', category: 'receipt' },
    { key: 'receipt_show_logo', value: 'true', category: 'receipt' },
    { key: 'receipt_show_barcode', value: 'true', category: 'receipt' },
    { key: 'receipt_footer', value: 'Thank you for choosing us! Drive clean!', category: 'receipt' },
    
    // Payment Settings
    { key: 'mpesa_paybill', value: '522533', category: 'payments' },
    { key: 'mpesa_account', value: '7791821', category: 'payments' },
  ];

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const inserted = [];

    for (const setting of defaultSettings) {
      const result = await client.query(
        `INSERT INTO system_settings (key, value, category)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO NOTHING
         RETURNING *`,
        [setting.key, setting.value, setting.category]
      );

      if (result.rows.length > 0) {
        inserted.push(result.rows[0]);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `${inserted.length} default settings initialized`,
      data: inserted,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

export default {
  getAllSettings,
  getSetting,
  updateSetting,
  updateBulkSettings,
  initializeSettings,
};
