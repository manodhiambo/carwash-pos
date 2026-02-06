import bcrypt from 'bcryptjs';
import db from '../../config/database';
import { config } from '../../config';

async function seed(): Promise<void> {
  console.log('Starting database seeding...');

  try {
    // Seed default branch
    console.log('Seeding branches...');
    const branchResult = await db.query(`
      INSERT INTO branches (name, code, address, phone, email, settings)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [
      'Main Branch',
      'MAIN',
      'Nairobi CBD, Kenya',
      '+254700000000',
      'main@carwashpro.co.ke',
      JSON.stringify({
        working_hours: { open: '07:00', close: '19:00' },
        happy_hour: { enabled: true, start: '14:00', end: '16:00', discount_percent: 10 },
        receipt_footer: 'Thank you for choosing CarWash Pro!',
        tax_rate: 16
      })
    ]);
    const branchId = branchResult.rows[0].id;

    // Seed admin user
    console.log('Seeding users...');
    const passwordHash = await bcrypt.hash('admin123', config.bcrypt.saltRounds);
    await db.query(`
      INSERT INTO users (name, email, username, password_hash, phone, role, status, branch_id)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8),
        ($9, $10, $11, $12, $13, $14, $15, $16),
        ($17, $18, $19, $20, $21, $22, $23, $24),
        ($25, $26, $27, $28, $29, $30, $31, $32)
      ON CONFLICT (username) DO NOTHING
    `, [
      'Super Admin', 'admin@carwashpro.co.ke', 'admin', passwordHash, '+254700000001', 'super_admin', 'active', branchId,
      'Branch Manager', 'manager@carwashpro.co.ke', 'manager', passwordHash, '+254700000002', 'manager', 'active', branchId,
      'John Cashier', 'cashier@carwashpro.co.ke', 'cashier', passwordHash, '+254700000003', 'cashier', 'active', branchId,
      'Peter Washer', 'washer@carwashpro.co.ke', 'washer', passwordHash, '+254700000004', 'attendant', 'active', branchId
    ]);

    // Seed services
    console.log('Seeding services...');
    const services = [
      { name: 'Exterior Wash', category: 'exterior', base_price: 250, duration: 20, desc: 'Complete exterior wash including windows and wheels' },
      { name: 'Interior Cleaning', category: 'interior', base_price: 300, duration: 30, desc: 'Full interior vacuum, dashboard wipe, and seat cleaning' },
      { name: 'Full Wash', category: 'full_wash', base_price: 500, duration: 45, desc: 'Complete exterior and interior cleaning package' },
      { name: 'Engine Wash', category: 'engine', base_price: 400, duration: 25, desc: 'Engine bay cleaning and degreasing' },
      { name: 'Wax & Polish', category: 'wax_polish', base_price: 600, duration: 40, desc: 'Hand wax and polish for lasting shine' },
      { name: 'Underwash', category: 'underwash', base_price: 350, duration: 15, desc: 'Undercarriage pressure wash' },
      { name: 'Premium Detailing', category: 'detailing', base_price: 2500, duration: 120, desc: 'Complete detailing including clay bar, polish, and ceramic coating' },
      { name: 'Quick Rinse', category: 'exterior', base_price: 150, duration: 10, desc: 'Quick exterior rinse for light dust' }
    ];

    for (const service of services) {
      const result = await db.query(`
        INSERT INTO services (name, description, category, base_price, duration_minutes, branch_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [service.name, service.desc, service.category, service.base_price, service.duration, branchId]);

      if (result.rows.length > 0) {
        const serviceId = result.rows[0].id;

        // Seed service pricing for different vehicle types
        const vehiclePricing = [
          { type: 'saloon', multiplier: 1.0 },
          { type: 'suv', multiplier: 1.5 },
          { type: 'van', multiplier: 1.8 },
          { type: 'truck', multiplier: 2.0 },
          { type: 'pickup', multiplier: 1.6 },
          { type: 'motorcycle', multiplier: 0.5 },
          { type: 'bus', multiplier: 2.5 },
          { type: 'trailer', multiplier: 3.0 }
        ];

        for (const vp of vehiclePricing) {
          await db.query(`
            INSERT INTO service_pricing (service_id, vehicle_type, price)
            VALUES ($1, $2, $3)
            ON CONFLICT (service_id, vehicle_type) DO NOTHING
          `, [serviceId, vp.type, Math.round(service.base_price * vp.multiplier)]);
        }
      }
    }

    // Seed bays
    console.log('Seeding bays...');
    const bays = [
      { name: 'Bay 1', number: 1, type: 'manual' },
      { name: 'Bay 2', number: 2, type: 'manual' },
      { name: 'Bay 3', number: 3, type: 'manual' },
      { name: 'Detailing Bay', number: 4, type: 'detailing' }
    ];

    for (const bay of bays) {
      await db.query(`
        INSERT INTO bays (name, bay_number, bay_type, branch_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (branch_id, bay_number) DO NOTHING
      `, [bay.name, bay.number, bay.type, branchId]);
    }

    // Seed inventory items
    console.log('Seeding inventory...');
    const inventoryItems = [
      { name: 'Car Shampoo', category: 'detergent', unit: 'liters', quantity: 50, reorder: 10, cost: 500 },
      { name: 'Wheel Cleaner', category: 'chemical', unit: 'liters', quantity: 20, reorder: 5, cost: 800 },
      { name: 'Car Wax', category: 'wax', unit: 'pieces', quantity: 30, reorder: 10, cost: 1200 },
      { name: 'Polish Compound', category: 'polish', unit: 'pieces', quantity: 15, reorder: 5, cost: 1500 },
      { name: 'Microfiber Towels', category: 'towel', unit: 'pieces', quantity: 100, reorder: 20, cost: 150 },
      { name: 'Wash Sponges', category: 'sponge', unit: 'pieces', quantity: 50, reorder: 15, cost: 100 },
      { name: 'Glass Cleaner', category: 'chemical', unit: 'liters', quantity: 25, reorder: 8, cost: 350 },
      { name: 'Tire Shine', category: 'chemical', unit: 'liters', quantity: 15, reorder: 5, cost: 600 },
      { name: 'Interior Cleaner', category: 'chemical', unit: 'liters', quantity: 20, reorder: 5, cost: 450 },
      { name: 'Air Fresheners', category: 'other', unit: 'pieces', quantity: 100, reorder: 30, cost: 50 }
    ];

    for (const item of inventoryItems) {
      await db.query(`
        INSERT INTO inventory_items (name, category, unit, quantity, reorder_level, unit_cost, branch_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [item.name, item.category, item.unit, item.quantity, item.reorder, item.cost, branchId]);
    }

    // Seed subscription plans
    console.log('Seeding subscription plans...');
    const plans = [
      {
        name: 'Weekly Basic',
        type: 'weekly',
        price: 1500,
        days: 7,
        limit: 3,
        desc: 'Up to 3 exterior washes per week'
      },
      {
        name: 'Monthly Unlimited',
        type: 'monthly',
        price: 5000,
        days: 30,
        limit: null,
        desc: 'Unlimited exterior and interior washes for a month'
      },
      {
        name: 'Prepaid 10 Washes',
        type: 'prepaid',
        price: 4000,
        days: 90,
        limit: 10,
        desc: '10 full wash credits valid for 3 months'
      }
    ];

    for (const plan of plans) {
      await db.query(`
        INSERT INTO subscription_plans (name, description, subscription_type, price, duration_days, wash_limit, branch_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [plan.name, plan.desc, plan.type, plan.price, plan.days, plan.limit, branchId]);
    }

    // Seed system settings
    console.log('Seeding system settings...');
    const settings = [
      { key: 'company_name', value: 'CarWash Pro', desc: 'Company name displayed on receipts', public: true },
      { key: 'company_phone', value: '+254700000000', desc: 'Company phone number', public: true },
      { key: 'company_email', value: 'info@carwashpro.co.ke', desc: 'Company email address', public: true },
      { key: 'company_address', value: 'Nairobi, Kenya', desc: 'Company physical address', public: true },
      { key: 'company_pin', value: 'P000000000A', desc: 'KRA PIN number', public: true },
      { key: 'tax_rate', value: '16', desc: 'Default VAT rate (%)', public: false },
      { key: 'loyalty_points_per_100', value: '1', desc: 'Loyalty points earned per KES 100 spent', public: false },
      { key: 'loyalty_redemption_value', value: '10', desc: 'Value of 1 loyalty point in KES', public: false },
      { key: 'receipt_footer', value: 'Thank you for choosing CarWash Pro! We appreciate your business.', desc: 'Footer message on receipts', public: false },
      { key: 'sms_notifications', value: 'true', desc: 'Enable SMS notifications', public: false },
      { key: 'auto_assign_bay', value: 'true', desc: 'Automatically assign available bay on check-in', public: false },
      { key: 'require_customer_info', value: 'false', desc: 'Require customer info for check-in', public: false }
    ];

    for (const setting of settings) {
      await db.query(`
        INSERT INTO system_settings (key, value, description, is_public)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [setting.key, setting.value, setting.desc, setting.public]);
    }

    // Seed sample customers
    console.log('Seeding sample customers...');
    const customers = [
      { name: 'John Kamau', phone: '+254712345678', type: 'individual', vip: true },
      { name: 'Jane Wanjiku', phone: '+254723456789', type: 'individual', vip: false },
      { name: 'Safari Tours Ltd', phone: '+254734567890', type: 'corporate', company: 'Safari Tours Ltd', vip: true },
      { name: 'Peter Omondi', phone: '+254745678901', type: 'individual', vip: false }
    ];

    for (const customer of customers) {
      await db.query(`
        INSERT INTO customers (name, phone, customer_type, company_name, is_vip)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (phone) DO NOTHING
      `, [customer.name, customer.phone, customer.type, customer.company || null, customer.vip]);
    }

    // Seed sample vehicles
    console.log('Seeding sample vehicles...');
    const vehicles = [
      { reg: 'KDA 123A', type: 'saloon', color: 'White', make: 'Toyota', model: 'Corolla' },
      { reg: 'KDB 456B', type: 'suv', color: 'Black', make: 'Toyota', model: 'Land Cruiser' },
      { reg: 'KDC 789C', type: 'van', color: 'Silver', make: 'Toyota', model: 'HiAce' },
      { reg: 'KDD 012D', type: 'pickup', color: 'Blue', make: 'Toyota', model: 'Hilux' }
    ];

    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];
      await db.query(`
        INSERT INTO vehicles (registration_no, vehicle_type, color, make, model, customer_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (registration_no) DO NOTHING
      `, [vehicle.reg, vehicle.type, vehicle.color, vehicle.make, vehicle.model, i + 1]);
    }

    // Seed equipment
    console.log('Seeding equipment...');
    const equipment = [
      { name: 'High Pressure Washer 1', type: 'pressure_washer', serial: 'HPW-001', bay: 1 },
      { name: 'High Pressure Washer 2', type: 'pressure_washer', serial: 'HPW-002', bay: 2 },
      { name: 'Vacuum Cleaner 1', type: 'vacuum', serial: 'VAC-001', bay: null },
      { name: 'Foam Machine 1', type: 'foam_machine', serial: 'FM-001', bay: 1 },
      { name: 'Polishing Machine', type: 'polisher', serial: 'POL-001', bay: 4 }
    ];

    const bayResult = await db.query(`SELECT id, bay_number FROM bays WHERE branch_id = $1`, [branchId]);
    const bayMap = new Map(bayResult.rows.map(b => [b.bay_number, b.id]));

    for (const eq of equipment) {
      const bayId = eq.bay ? bayMap.get(eq.bay) : null;
      await db.query(`
        INSERT INTO equipment (name, equipment_type, serial_number, bay_id, branch_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [eq.name, eq.type, eq.serial, bayId, branchId]);
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await db.closePool();
  }
}

// Run if executed directly
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seed;
