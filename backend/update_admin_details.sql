-- Update Lorna's account
UPDATE users 
SET 
  name = 'Lorna Kwodi',
  email = 'lkwodi.lk@gmail.com',
  phone = '0724330080',
  role = 'super_admin',
  -- Password hash for 'Lorna@2026'
  password_hash = '$2b$10$YourHashWillGoHere'
WHERE email = 'lkwodi.lk@gmail.com' OR email = 'admin@carwashpro.co.ke';

-- Update business settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
  ('business_name', 'Splash & Shine CarWash', 'Business name', true),
  ('business_address', 'Oginga Odinga Street, Behind Rubis Filling Station, Siaya Town', 'Business address', true),
  ('business_phone', '0724330080', 'Business phone', true),
  ('business_email', 'lkwodi.lk@gmail.com', 'Business email', true),
  ('receipt_footer', 'Thank you for choosing Splash & Shine CarWash! Drive safe!', 'Receipt footer message', true)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public;

-- Verify
SELECT id, name, email, phone, role FROM users WHERE email = 'lkwodi.lk@gmail.com';
SELECT key, value FROM system_settings WHERE key LIKE 'business_%' OR key LIKE 'receipt_%';
