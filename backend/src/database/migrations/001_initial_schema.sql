-- CarWash POS Database Schema
-- Version: 1.0.0
-- Database: PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- BRANCHES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    manager_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'attendant' CHECK (role IN ('super_admin', 'admin', 'manager', 'cashier', 'attendant', 'accountant')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    branch_id INTEGER REFERENCES branches(id),
    avatar VARCHAR(255),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for branch manager
ALTER TABLE branches ADD CONSTRAINT fk_branch_manager FOREIGN KEY (manager_id) REFERENCES users(id);

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    customer_type VARCHAR(20) DEFAULT 'individual' CHECK (customer_type IN ('individual', 'corporate', 'fleet')),
    company_name VARCHAR(100),
    address TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    is_vip BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- VEHICLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    registration_no VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('saloon', 'suv', 'van', 'truck', 'pickup', 'motorcycle', 'bus', 'trailer')),
    color VARCHAR(30),
    make VARCHAR(50),
    model VARCHAR(50),
    customer_id INTEGER REFERENCES customers(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- BAYS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    bay_number INTEGER NOT NULL,
    bay_type VARCHAR(20) DEFAULT 'manual' CHECK (bay_type IN ('manual', 'automatic', 'tunnel', 'detailing')),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
    branch_id INTEGER NOT NULL REFERENCES branches(id),
    current_job_id INTEGER,
    capacity INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, bay_number)
);

-- =====================================================
-- SERVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(30) NOT NULL CHECK (category IN ('exterior', 'interior', 'full_wash', 'engine', 'wax_polish', 'underwash', 'detailing', 'other')),
    base_price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    branch_id INTEGER REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SERVICE PRICING TABLE (Price by Vehicle Type)
-- =====================================================
CREATE TABLE IF NOT EXISTS service_pricing (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('saloon', 'suv', 'van', 'truck', 'pickup', 'motorcycle', 'bus', 'trailer')),
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_id, vehicle_type)
);

-- =====================================================
-- JOBS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    job_no VARCHAR(20) UNIQUE NOT NULL,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
    customer_id INTEGER REFERENCES customers(id),
    branch_id INTEGER NOT NULL REFERENCES branches(id),
    bay_id INTEGER REFERENCES bays(id),
    status VARCHAR(20) DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'in_queue', 'washing', 'detailing', 'completed', 'paid', 'cancelled')),
    assigned_staff_id INTEGER REFERENCES users(id),
    checked_in_by INTEGER NOT NULL REFERENCES users(id),
    estimated_completion TIMESTAMP,
    actual_completion TIMESTAMP,
    total_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    final_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    damage_notes TEXT,
    is_rewash BOOLEAN DEFAULT false,
    original_job_id INTEGER REFERENCES jobs(id),
    photos JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for current job in bays
ALTER TABLE bays ADD CONSTRAINT fk_bay_current_job FOREIGN KEY (current_job_id) REFERENCES jobs(id);

-- =====================================================
-- JOB SERVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS job_services (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id),
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    staff_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'mpesa', 'card', 'bank_transfer', 'credit')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'partial')),
    reference_no VARCHAR(100),
    mpesa_receipt VARCHAR(50),
    card_last_four VARCHAR(4),
    received_by INTEGER NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SUPPLIERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INVENTORY ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(30) NOT NULL CHECK (category IN ('detergent', 'wax', 'polish', 'towel', 'sponge', 'chemical', 'equipment', 'other')),
    sku VARCHAR(50),
    unit VARCHAR(20) NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 0,
    reorder_level DECIMAL(10,2) DEFAULT 10,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    branch_id INTEGER NOT NULL REFERENCES branches(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, sku)
);

-- =====================================================
-- INVENTORY TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES inventory_items(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('stock_in', 'stock_out', 'adjustment', 'transfer', 'waste')),
    quantity DECIMAL(10,2) NOT NULL,
    previous_quantity DECIMAL(10,2) NOT NULL,
    new_quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    reference VARCHAR(100),
    job_id INTEGER REFERENCES jobs(id),
    performed_by INTEGER NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- EXPENSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    category VARCHAR(30) NOT NULL CHECK (category IN ('rent', 'utilities', 'supplies', 'salaries', 'maintenance', 'marketing', 'taxes', 'other')),
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'mpesa', 'card', 'bank_transfer', 'credit')),
    reference_no VARCHAR(100),
    receipt_url VARCHAR(255),
    expense_date DATE NOT NULL,
    branch_id INTEGER NOT NULL REFERENCES branches(id),
    recorded_by INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    is_approved BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CASH SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_sessions (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id),
    opened_by INTEGER NOT NULL REFERENCES users(id),
    closed_by INTEGER REFERENCES users(id),
    opening_balance DECIMAL(12,2) NOT NULL,
    expected_closing DECIMAL(12,2) DEFAULT 0,
    actual_closing DECIMAL(12,2),
    variance DECIMAL(12,2),
    cash_sales DECIMAL(12,2) DEFAULT 0,
    mpesa_sales DECIMAL(12,2) DEFAULT 0,
    card_sales DECIMAL(12,2) DEFAULT 0,
    total_sales DECIMAL(12,2) DEFAULT 0,
    expenses_paid DECIMAL(12,2) DEFAULT 0,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- EQUIPMENT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    equipment_type VARCHAR(50) NOT NULL,
    serial_number VARCHAR(100),
    bay_id INTEGER REFERENCES bays(id),
    branch_id INTEGER NOT NULL REFERENCES branches(id),
    status VARCHAR(20) DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'broken', 'retired')),
    purchase_date DATE,
    last_maintenance DATE,
    next_maintenance DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SUBSCRIPTION PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    subscription_type VARCHAR(20) NOT NULL CHECK (subscription_type IN ('weekly', 'monthly', 'prepaid')),
    price DECIMAL(10,2) NOT NULL,
    duration_days INTEGER NOT NULL,
    wash_limit INTEGER,
    services_included JSONB DEFAULT '[]',
    vehicle_types JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    branch_id INTEGER REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CUSTOMER SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_subscriptions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    washes_used INTEGER DEFAULT 0,
    washes_remaining INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
    payment_id INTEGER REFERENCES payments(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- LOYALTY TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    job_id INTEGER REFERENCES jobs(id),
    points INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted')),
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ACTIVITY LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SYSTEM SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PROMOTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS promotions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_purchase DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    applicable_services JSONB DEFAULT '[]',
    applicable_vehicle_types JSONB DEFAULT '[]',
    usage_limit INTEGER,
    times_used INTEGER DEFAULT 0,
    promo_code VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    branch_id INTEGER REFERENCES branches(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

CREATE INDEX idx_vehicles_registration ON vehicles(registration_no);
CREATE INDEX idx_vehicles_customer ON vehicles(customer_id);
CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_type ON customers(customer_type);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_branch ON jobs(branch_id);
CREATE INDEX idx_jobs_vehicle ON jobs(vehicle_id);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_created ON jobs(created_at);
CREATE INDEX idx_jobs_job_no ON jobs(job_no);

CREATE INDEX idx_job_services_job ON job_services(job_id);
CREATE INDEX idx_job_services_service ON job_services(service_id);

CREATE INDEX idx_payments_job ON payments(job_id);
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created ON payments(created_at);

CREATE INDEX idx_inventory_branch ON inventory_items(branch_id);
CREATE INDEX idx_inventory_category ON inventory_items(category);

CREATE INDEX idx_inventory_trans_item ON inventory_transactions(item_id);
CREATE INDEX idx_inventory_trans_type ON inventory_transactions(transaction_type);

CREATE INDEX idx_expenses_branch ON expenses(branch_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

CREATE INDEX idx_cash_sessions_branch ON cash_sessions(branch_id);
CREATE INDEX idx_cash_sessions_status ON cash_sessions(status);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

CREATE INDEX idx_subscriptions_customer ON customer_subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON customer_subscriptions(status);

CREATE INDEX idx_loyalty_customer ON loyalty_transactions(customer_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_pricing_updated_at BEFORE UPDATE ON service_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bays_updated_at BEFORE UPDATE ON bays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_subscriptions_updated_at BEFORE UPDATE ON customer_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
