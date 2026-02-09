-- Insert or update default settings
INSERT INTO system_settings (key, value, category, created_at, updated_at)
VALUES 
  -- Business Information
  ('business_name', 'Splash & Shine CarWash', 'business', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('business_tagline', 'Where Every Car Shines', 'business', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('business_phone', '0756941144', 'business', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('business_email', 'info@splashshine.co.ke', 'business', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('business_address', 'Oginga Odinga Street, Behind Rubis Filling Station, Siaya Town', 'business', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('business_website', 'https://splashshine.org', 'business', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('currency', 'KES', 'business', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('timezone', 'Africa/Nairobi', 'business', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Operating Hours
  ('opening_time', '08:00', 'hours', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('closing_time', '18:00', 'hours', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Tax & Pricing
  ('tax_rate', '16', 'pricing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tax_enabled', 'true', 'pricing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Job Settings
  ('auto_assign_bay', 'true', 'jobs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('require_customer_info', 'false', 'jobs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('allow_walkins', 'true', 'jobs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Loyalty Program
  ('loyalty_enabled', 'true', 'loyalty', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('points_per_currency', '1', 'loyalty', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('points_value', '1', 'loyalty', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('points_expiry_days', '365', 'loyalty', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Receipt Settings
  ('receipt_auto_print', 'false', 'receipt', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('receipt_show_logo', 'true', 'receipt', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('receipt_show_barcode', 'true', 'receipt', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('receipt_footer', 'Thank you for choosing Splash & Shine CarWash! Drive clean!', 'receipt', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Payment Settings
  ('mpesa_paybill', '522533', 'payments', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mpesa_account', '7791821', 'payments', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = CURRENT_TIMESTAMP;
