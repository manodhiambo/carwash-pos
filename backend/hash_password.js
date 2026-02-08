const bcrypt = require('bcrypt');

async function hashPassword() {
  const password = 'Lorna@2026';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password hash for Lorna@2026:');
  console.log(hash);
  
  // Now generate the complete SQL
  const sql = `
-- Update Lorna's account with hashed password
UPDATE users 
SET 
  name = 'Lorna Kwodi',
  email = 'lkwodi.lk@gmail.com',
  phone = '0724330080',
  role = 'super_admin',
  password_hash = '${hash}',
  is_active = true,
  updated_at = CURRENT_TIMESTAMP
WHERE email IN ('lkwodi.lk@gmail.com', 'admin@carwashpro.co.ke');

-- Update business settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
  ('business_name', 'Splash & Shine CarWash', 'Business name', true),
  ('business_address', 'Oginga Odinga Street, Behind Rubis Filling Station, Siaya Town', 'Business address', true),
  ('business_phone', '0724330080', 'Business phone', true),
  ('business_email', 'lkwodi.lk@gmail.com', 'Business email', true),
  ('business_tagline', 'Where Every Car Shines', 'Business tagline', true),
  ('receipt_footer', 'Thank you for choosing Splash & Shine CarWash! Drive safe!', 'Receipt footer message', true)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public,
  updated_at = CURRENT_TIMESTAMP;
`;
  
  console.log('\n\n=== COMPLETE SQL TO RUN IN NEON CONSOLE ===');
  console.log(sql);
  console.log('=== END SQL ===\n');
}

hashPassword();
