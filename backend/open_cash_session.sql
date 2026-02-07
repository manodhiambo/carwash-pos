-- Check existing cash sessions
SELECT * FROM cash_sessions ORDER BY opened_at DESC LIMIT 5;

-- Open a new cash session for branch 1 (admin's branch)
INSERT INTO cash_sessions (
  branch_id, 
  opening_balance, 
  opened_by, 
  status, 
  opened_at,
  cash_sales,
  mpesa_sales,
  card_sales,
  total_sales,
  expenses_paid,
  expected_closing
) VALUES (
  1,          -- branch_id (admin's branch)
  0,          -- opening_balance
  1,          -- opened_by (admin user id)
  'open',     -- status
  NOW(),      -- opened_at
  0,          -- cash_sales
  0,          -- mpesa_sales
  0,          -- card_sales
  0,          -- total_sales
  0,          -- expenses_paid
  0           -- expected_closing
) RETURNING *;
