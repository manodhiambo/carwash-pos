import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Derive category from setting key prefix
 */
function getCategoryFromKey(key: string): string {
  if (key.startsWith('business_')) return 'business';
  if (key === 'currency' || key === 'timezone') return 'business';
  if (key === 'opening_time' || key === 'closing_time') return 'hours';
  if (key.startsWith('tax_')) return 'pricing';
  if (key === 'auto_assign_bay' || key === 'require_customer_info' || key === 'allow_walkins') return 'jobs';
  if (key.startsWith('loyalty_') || key.startsWith('points_')) return 'loyalty';
  if (key.startsWith('receipt_')) return 'receipt';
  if (key.startsWith('mpesa_')) return 'payments';
  if (key.startsWith('commission_')) return 'commission';
  return 'general';
}

/**
 * Get all system settings
 * GET /api/v1/settings
 */
export const getAllSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { category } = req.query;

  const result = await db.query('SELECT * FROM system_settings ORDER BY key');

  // Derive category for each row and filter if requested
  const rows = result.rows.map((row: any) => ({
    ...row,
    category: getCategoryFromKey(row.key),
  }));

  const filtered = category
    ? rows.filter((row: any) => row.category === category)
    : rows;

  // Group settings by category
  const grouped: Record<string, any> = {};
  filtered.forEach((row: any) => {
    if (!grouped[row.category]) {
      grouped[row.category] = {};
    }
    grouped[row.category][row.key] = row.value;
  });

  res.json({
    success: true,
    data: {
      settings: filtered,
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
        `INSERT INTO system_settings (key, value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key)
         DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [setting.key, setting.value]
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
    { key: 'business_name', value: 'Splash & Shine CarWash' },
    { key: 'business_tagline', value: 'Where Every Car Shines' },
    { key: 'business_phone', value: '0756941144' },
    { key: 'business_email', value: 'info@splashshine.co.ke' },
    { key: 'business_address', value: 'Oginga Odinga Street, Behind Rubis Filling Station, Siaya Town' },
    { key: 'business_website', value: 'https://splashshine.org' },
    { key: 'currency', value: 'KES' },
    { key: 'timezone', value: 'Africa/Nairobi' },

    // Operating Hours
    { key: 'opening_time', value: '08:00' },
    { key: 'closing_time', value: '18:00' },

    // Tax & Pricing
    { key: 'tax_rate', value: '16' },
    { key: 'tax_enabled', value: 'true' },

    // Job Settings
    { key: 'auto_assign_bay', value: 'true' },
    { key: 'require_customer_info', value: 'false' },
    { key: 'allow_walkins', value: 'true' },

    // Loyalty Program
    { key: 'loyalty_enabled', value: 'true' },
    { key: 'points_per_currency', value: '1' },
    { key: 'points_value', value: '1' },
    { key: 'points_expiry_days', value: '365' },

    // Receipt Settings
    { key: 'receipt_auto_print', value: 'false' },
    { key: 'receipt_show_logo', value: 'true' },
    { key: 'receipt_show_barcode', value: 'true' },
    { key: 'receipt_footer', value: 'Thank you for choosing us! Drive clean!' },

    // Payment Settings
    { key: 'mpesa_paybill', value: '522533' },
    { key: 'mpesa_account', value: '7791821' },

    // Commission Settings
    { key: 'commission_rate_attendant', value: '10' },
    { key: 'commission_rate_cashier', value: '5' },
    { key: 'commission_rate_supervisor', value: '0' },
    { key: 'commission_rate_manager', value: '0' },
  ];

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const inserted = [];

    for (const setting of defaultSettings) {
      const result = await client.query(
        `INSERT INTO system_settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING
         RETURNING *`,
        [setting.key, setting.value]
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
