-- Add commission_rate to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0;

-- Create commissions table
CREATE TABLE IF NOT EXISTS commissions (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  job_service_id INTEGER REFERENCES job_services(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  base_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_commissions_staff ON commissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_commissions_job ON commissions(job_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);

-- Update existing staff with default commission rates
UPDATE users SET commission_rate = 
  CASE 
    WHEN role = 'attendant' THEN 10
    WHEN role = 'cashier' THEN 5
    ELSE 0
  END
WHERE commission_rate = 0;
