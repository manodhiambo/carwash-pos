-- Check for open cash sessions
SELECT id, branch_id, status, opening_balance, opened_by, opened_at 
FROM cash_sessions 
WHERE status = 'open';

-- Check all recent cash sessions
SELECT id, branch_id, status, opening_balance, opened_by, opened_at, closed_at
FROM cash_sessions 
ORDER BY opened_at DESC 
LIMIT 5;

-- Check which branch the admin user belongs to
SELECT id, username, branch_id, role 
FROM users 
WHERE username = 'admin';
