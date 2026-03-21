-- Add commission_rate_override to jobs table so the rate set at check-in is preserved
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS commission_rate_override DECIMAL(5,2);
