-- Add selling_price to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2) DEFAULT 0;

-- Add 'sale' to transaction_type check constraint
ALTER TABLE inventory_transactions 
DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;

ALTER TABLE inventory_transactions
ADD CONSTRAINT inventory_transactions_transaction_type_check 
CHECK (transaction_type IN ('stock_in', 'stock_out', 'adjustment', 'transfer', 'waste', 'sale'));

-- Add customer_id for retail sales tracking
ALTER TABLE inventory_transactions
ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2);

-- Create index for sales queries
CREATE INDEX IF NOT EXISTS idx_inventory_trans_sales ON inventory_transactions(transaction_type) WHERE transaction_type = 'sale';

COMMENT ON COLUMN inventory_items.selling_price IS 'Retail selling price per unit';
COMMENT ON COLUMN inventory_transactions.selling_price IS 'Price per unit at time of sale';
COMMENT ON COLUMN inventory_transactions.customer_id IS 'Customer who purchased (for sale transactions)';
