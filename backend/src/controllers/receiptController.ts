import { Response } from 'express';
import db from '../config/database';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Generate receipt for a job
 * GET /api/v1/receipts/:jobId
 */
export const generateReceipt = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { jobId } = req.params;
  const { format = 'json' } = req.query;

  // Get job details with all related data
  const jobResult = await db.query(
    `SELECT
      j.*,
      j.job_no,
      c.name as customer_name,
      c.phone as customer_phone,
      c.email as customer_email,
      v.registration_no as vehicle_reg,
      v.make as vehicle_make,
      v.model as vehicle_model,
      b.name as bay_name,
      u.name as cashier_name,
      att.name as attendant_name
    FROM jobs j
    LEFT JOIN customers c ON j.customer_id = c.id
    LEFT JOIN vehicles v ON j.vehicle_id = v.id
    LEFT JOIN bays b ON j.bay_id = b.id
    LEFT JOIN users u ON j.created_by = u.id
    LEFT JOIN users att ON j.assigned_staff_id = att.id
    WHERE j.id = $1`,
    [jobId]
  );

  if (jobResult.rows.length === 0) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return;
  }

  const job = jobResult.rows[0];

  // Get services
  const servicesResult = await db.query(
    `SELECT 
      s.name,
      js.quantity,
      js.price,
      js.discount,
      js.total
    FROM job_services js
    JOIN services s ON js.service_id = s.id
    WHERE js.job_id = $1
    ORDER BY js.id`,
    [jobId]
  );

  // Get payments
  const paymentsResult = await db.query(
    `SELECT 
      payment_method,
      amount,
      reference_no AS reference,
      created_at
    FROM payments
    WHERE job_id = $1 AND status = 'completed'
    ORDER BY created_at`,
    [jobId]
  );

  // Get business settings
  const settingsResult = await db.query(
    `SELECT key, value FROM system_settings
     WHERE key IN ('business_name', 'business_tagline', 'business_phone',
                   'business_email', 'business_address', 'tax_rate', 'currency',
                   'receipt_footer')`
  );

  const settings: Record<string, string> = {};
  settingsResult.rows.forEach(row => {
    settings[row.key] = row.value;
  });

  const receipt = {
    receipt_no: `RCP-${String(job.id).padStart(6, '0')}`,
    job_no: job.job_no || `JOB-${String(job.id).padStart(6, '0')}`,
    date: new Date(job.created_at).toLocaleString('en-KE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    business: {
      name: settings.business_name || 'Car Wash',
      tagline: settings.business_tagline || '',
      phone: settings.business_phone || '',
      email: settings.business_email || '',
      address: settings.business_address || '',
    },
    customer: {
      name: job.customer_name || 'Walk-in',
      phone: job.customer_phone || '',
      email: job.customer_email || '',
    },
    vehicle: {
      registration: job.vehicle_reg || 'N/A',
      make: job.vehicle_make || '',
      model: job.vehicle_model || '',
    },
    bay: job.bay_name || 'N/A',
    attendant: job.attendant_name || '',
    cashier: job.cashier_name || 'System',
    services: servicesResult.rows,
    subtotal: parseFloat(job.total_amount || 0),
    discount: parseFloat(job.discount_amount || 0),
    tax: parseFloat(job.tax_amount || 0),
    total: parseFloat(job.final_amount || 0),
    payments: paymentsResult.rows,
    currency: settings.currency || 'KES',
    tax_rate: parseFloat(settings.tax_rate || '0'),
    footer: settings.receipt_footer || 'Thank you for your business!',
  };

  if (format === 'text') {
    const textReceipt = generateTextReceipt(receipt);
    res.json({ success: true, data: textReceipt, format: 'text' });
  } else {
    res.json({ success: true, data: receipt, format: 'json' });
  }
});

/**
 * Generate text receipt for WhatsApp
 */
function generateTextReceipt(receipt: any): string {
  const lines: string[] = [];
  
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`*${receipt.business.name}*`);
  if (receipt.business.tagline) {
    lines.push(receipt.business.tagline);
  }
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  
  if (receipt.business.address) {
    lines.push(`📍 ${receipt.business.address}`);
  }
  if (receipt.business.phone) {
    lines.push(`📞 ${receipt.business.phone}`);
  }
  lines.push('');
  
  lines.push(`Receipt #: *${receipt.receipt_no}*`);
  lines.push(`Date: ${receipt.date}`);
  lines.push(`Cashier: ${receipt.cashier}`);
  lines.push('');
  
  if (receipt.customer.name !== 'Walk-in') {
    lines.push(`Customer: ${receipt.customer.name}`);
    if (receipt.customer.phone) {
      lines.push(`Phone: ${receipt.customer.phone}`);
    }
    lines.push('');
  }
  
  if (receipt.vehicle.registration !== 'N/A') {
    lines.push(`Vehicle: ${receipt.vehicle.registration}`);
    if (receipt.vehicle.make) {
      lines.push(`${receipt.vehicle.make} ${receipt.vehicle.model}`);
    }
    lines.push('');
  }
  
  lines.push('*SERVICES*');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  receipt.services.forEach((service: any) => {
    const qty = service.quantity > 1 ? `${service.quantity}x ` : '';
    const price = formatCurrency(service.total, receipt.currency);
    lines.push(`${qty}${service.name}`);
    lines.push(`  ${price}`);
  });
  
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  
  lines.push(`Subtotal: ${formatCurrency(receipt.subtotal, receipt.currency)}`);
  
  if (receipt.discount > 0) {
    lines.push(`Discount: -${formatCurrency(receipt.discount, receipt.currency)}`);
  }
  
  if (receipt.tax > 0) {
    lines.push(`Tax (${receipt.tax_rate}%): ${formatCurrency(receipt.tax, receipt.currency)}`);
  }
  
  lines.push('');
  lines.push(`*TOTAL: ${formatCurrency(receipt.total, receipt.currency)}*`);
  lines.push('');
  
  lines.push('*PAYMENT*');
  receipt.payments.forEach((payment: any) => {
    const method = payment.payment_method.replace('_', ' ').toUpperCase();
    lines.push(`${method}: ${formatCurrency(payment.amount, receipt.currency)}`);
    if (payment.reference) {
      lines.push(`  Ref: ${payment.reference}`);
    }
  });
  
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(receipt.footer || 'Thank you for your business!');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  return lines.join('\n');
}

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get WhatsApp share link
 * GET /api/v1/receipts/:jobId/whatsapp
 */
export const getWhatsAppLink = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { jobId } = req.params;
  
  // Get job details
  const jobResult = await db.query(
    `SELECT
      j.*,
      j.job_no,
      c.name as customer_name,
      c.phone as customer_phone,
      v.registration_no as vehicle_reg,
      v.make as vehicle_make,
      v.model as vehicle_model,
      u.name as cashier_name
    FROM jobs j
    LEFT JOIN customers c ON j.customer_id = c.id
    LEFT JOIN vehicles v ON j.vehicle_id = v.id
    LEFT JOIN users u ON j.created_by = u.id
    WHERE j.id = $1`,
    [jobId]
  );

  if (jobResult.rows.length === 0) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return;
  }

  const job = jobResult.rows[0];
  const phone = job.customer_phone;
  
  if (!phone) {
    res.status(400).json({ success: false, error: 'No phone number available for this customer' });
    return;
  }

  // Get services
  const servicesResult = await db.query(
    `SELECT 
      s.name,
      js.quantity,
      js.price,
      js.discount,
      js.total
    FROM job_services js
    JOIN services s ON js.service_id = s.id
    WHERE js.job_id = $1
    ORDER BY js.id`,
    [jobId]
  );

  // Get payments
  const paymentsResult = await db.query(
    `SELECT 
      payment_method,
      amount,
      reference_no AS reference
    FROM payments
    WHERE job_id = $1 AND status = 'completed'
    ORDER BY created_at`,
    [jobId]
  );

  // Get business settings
  const settingsResult = await db.query(
    `SELECT key, value FROM system_settings
     WHERE key IN ('business_name', 'business_tagline', 'business_phone',
                   'business_email', 'business_address', 'tax_rate', 'currency',
                   'receipt_footer')`
  );

  const settings: Record<string, string> = {};
  settingsResult.rows.forEach(row => {
    settings[row.key] = row.value;
  });

  const receipt = {
    receipt_no: `RCP-${String(job.id).padStart(6, '0')}`,
    job_no: job.job_no || `JOB-${String(job.id).padStart(6, '0')}`,
    date: new Date(job.created_at).toLocaleString('en-KE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    business: {
      name: settings.business_name || 'Car Wash',
      tagline: settings.business_tagline || '',
      phone: settings.business_phone || '',
      address: settings.business_address || '',
    },
    customer: {
      name: job.customer_name || 'Walk-in',
      phone: job.customer_phone || '',
    },
    vehicle: {
      registration: job.vehicle_reg || 'N/A',
      make: job.vehicle_make || '',
      model: job.vehicle_model || '',
    },
    cashier: job.cashier_name || 'System',
    services: servicesResult.rows,
    subtotal: parseFloat(job.total_amount || 0),
    discount: parseFloat(job.discount_amount || 0),
    tax: parseFloat(job.tax_amount || 0),
    total: parseFloat(job.final_amount || 0),
    payments: paymentsResult.rows,
    currency: settings.currency || 'KES',
    tax_rate: parseFloat(settings.tax_rate || '0'),
    footer: settings.receipt_footer || 'Thank you for your business!',
  };

  // Generate text receipt
  const textReceipt = generateTextReceipt(receipt);
  
  // Clean phone number
  const cleanPhone = phone.replace(/\D/g, '');
  
  // URL encode the text
  const encodedText = encodeURIComponent(textReceipt);
  
  res.json({
    success: true,
    data: {
      phone: cleanPhone,
      whatsapp_url: `https://wa.me/${cleanPhone}?text=${encodedText}`,
      receipt_text: textReceipt,
    },
  });
});

export default {
  generateReceipt,
  getWhatsAppLink,
};
