import { config } from '../config';
import { ReceiptData } from '../types';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import { RECEIPT } from '../utils/constants';
import QRCode from 'qrcode';

interface ReceiptLine {
  text: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  size?: 'normal' | 'large';
  newLine?: boolean;
}

class ReceiptService {
  private width: number;

  constructor() {
    this.width = config.printer.width === 58 ? RECEIPT.WIDTH_58MM : RECEIPT.WIDTH_80MM;
  }

  /**
   * Generate receipt text content
   */
  async generateReceipt(data: ReceiptData): Promise<string> {
    const lines: string[] = [];

    // Header
    lines.push(this.centerText(config.company.name.toUpperCase()));
    lines.push(this.centerText(config.company.address));
    lines.push(this.centerText(`Tel: ${config.company.phone}`));
    if (config.company.pin) {
      lines.push(this.centerText(`PIN: ${config.company.pin}`));
    }
    lines.push(RECEIPT.DOUBLE_LINE.substring(0, this.width));
    lines.push('');

    // Receipt info
    lines.push(`Receipt No: ${data.jobNo}`);
    lines.push(`Date: ${formatDateTime(data.date)}`);
    lines.push(RECEIPT.SEPARATOR.substring(0, this.width));

    // Vehicle info
    lines.push(`Vehicle: ${data.vehicle.registration}`);
    lines.push(`Type: ${data.vehicle.type.toUpperCase()}`);

    // Customer info (if available)
    if (data.customer) {
      lines.push(`Customer: ${data.customer.name}`);
      if (data.customer.phone) {
        lines.push(`Phone: ${data.customer.phone}`);
      }
    }
    lines.push(RECEIPT.SEPARATOR.substring(0, this.width));

    // Services header
    lines.push(this.padColumns('ITEM', 'QTY', 'AMOUNT', [this.width - 20, 5, 12]));
    lines.push(RECEIPT.SEPARATOR.substring(0, this.width));

    // Services
    for (const service of data.services) {
      const itemName = this.truncate(service.name, this.width - 20);
      lines.push(
        this.padColumns(
          itemName,
          service.quantity.toString(),
          formatCurrency(service.total).replace('KSh ', ''),
          [this.width - 20, 5, 12]
        )
      );
    }
    lines.push(RECEIPT.SEPARATOR.substring(0, this.width));

    // Totals
    lines.push(this.padRight('Subtotal:', formatCurrency(data.subtotal)));
    if (data.discount > 0) {
      lines.push(this.padRight('Discount:', `-${formatCurrency(data.discount)}`));
    }
    if (data.tax > 0) {
      lines.push(this.padRight('VAT (16%):', formatCurrency(data.tax)));
    }
    lines.push(RECEIPT.DOUBLE_LINE.substring(0, this.width));
    lines.push(this.padRight('TOTAL:', formatCurrency(data.total)));
    lines.push(RECEIPT.DOUBLE_LINE.substring(0, this.width));

    // Payment info
    lines.push('');
    lines.push('PAYMENT DETAILS:');
    for (const payment of data.payments) {
      let paymentLine = `${payment.method.toUpperCase()}: ${formatCurrency(payment.amount)}`;
      if (payment.reference) {
        paymentLine += ` (${payment.reference})`;
      }
      lines.push(paymentLine);
    }
    lines.push(RECEIPT.SEPARATOR.substring(0, this.width));

    // Cashier
    lines.push(`Served by: ${data.cashier}`);
    lines.push(`Branch: ${data.branch}`);
    lines.push('');

    // Footer
    lines.push(RECEIPT.SEPARATOR.substring(0, this.width));
    lines.push(this.centerText('Thank you for your business!'));
    lines.push(this.centerText('We appreciate your visit.'));
    lines.push('');
    lines.push(this.centerText(config.company.email));
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate receipt as HTML (for web printing)
   */
  async generateReceiptHTML(data: ReceiptData): Promise<string> {
    const qrData = JSON.stringify({
      job: data.jobNo,
      date: data.date,
      total: data.total,
      vehicle: data.vehicle.registration,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 100,
      margin: 1,
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${data.jobNo}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      width: ${config.printer.width}mm;
      padding: 5mm;
    }
    .receipt {
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 10px;
    }
    .company-name {
      font-size: 16px;
      font-weight: bold;
    }
    .separator {
      border-top: 1px dashed #000;
      margin: 5px 0;
    }
    .double-line {
      border-top: 2px solid #000;
      margin: 5px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }
    .item-row {
      display: grid;
      grid-template-columns: 1fr 30px 60px;
      gap: 5px;
    }
    .item-row .qty, .item-row .amount {
      text-align: right;
    }
    .total-row {
      font-weight: bold;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 10px;
    }
    .qr-code {
      text-align: center;
      margin: 10px 0;
    }
    .qr-code img {
      width: 80px;
      height: 80px;
    }
    @media print {
      body {
        width: ${config.printer.width}mm;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="company-name">${config.company.name.toUpperCase()}</div>
      <div>${config.company.address}</div>
      <div>Tel: ${config.company.phone}</div>
      ${config.company.pin ? `<div>PIN: ${config.company.pin}</div>` : ''}
    </div>

    <div class="double-line"></div>

    <div class="row">
      <span>Receipt No:</span>
      <span>${data.jobNo}</span>
    </div>
    <div class="row">
      <span>Date:</span>
      <span>${formatDateTime(data.date)}</span>
    </div>

    <div class="separator"></div>

    <div class="row">
      <span>Vehicle:</span>
      <span>${data.vehicle.registration}</span>
    </div>
    <div class="row">
      <span>Type:</span>
      <span>${data.vehicle.type.toUpperCase()}</span>
    </div>
    ${data.customer ? `
    <div class="row">
      <span>Customer:</span>
      <span>${data.customer.name}</span>
    </div>
    ${data.customer.phone ? `
    <div class="row">
      <span>Phone:</span>
      <span>${data.customer.phone}</span>
    </div>
    ` : ''}
    ` : ''}

    <div class="separator"></div>

    <div class="item-row" style="font-weight: bold;">
      <span>ITEM</span>
      <span class="qty">QTY</span>
      <span class="amount">AMOUNT</span>
    </div>

    <div class="separator"></div>

    ${data.services.map(service => `
    <div class="item-row">
      <span>${service.name}</span>
      <span class="qty">${service.quantity}</span>
      <span class="amount">${formatCurrency(service.total).replace('KSh ', '')}</span>
    </div>
    `).join('')}

    <div class="separator"></div>

    <div class="row">
      <span>Subtotal:</span>
      <span>${formatCurrency(data.subtotal)}</span>
    </div>
    ${data.discount > 0 ? `
    <div class="row">
      <span>Discount:</span>
      <span>-${formatCurrency(data.discount)}</span>
    </div>
    ` : ''}
    ${data.tax > 0 ? `
    <div class="row">
      <span>VAT (16%):</span>
      <span>${formatCurrency(data.tax)}</span>
    </div>
    ` : ''}

    <div class="double-line"></div>

    <div class="row total-row">
      <span>TOTAL:</span>
      <span>${formatCurrency(data.total)}</span>
    </div>

    <div class="double-line"></div>

    <div style="margin-top: 5px;">PAYMENT DETAILS:</div>
    ${data.payments.map(payment => `
    <div class="row">
      <span>${payment.method.toUpperCase()}:</span>
      <span>${formatCurrency(payment.amount)}${payment.reference ? ` (${payment.reference})` : ''}</span>
    </div>
    `).join('')}

    <div class="separator"></div>

    <div class="row">
      <span>Served by:</span>
      <span>${data.cashier}</span>
    </div>
    <div class="row">
      <span>Branch:</span>
      <span>${data.branch}</span>
    </div>

    <div class="qr-code">
      <img src="${qrCodeDataUrl}" alt="QR Code" />
    </div>

    <div class="footer">
      <div>Thank you for your business!</div>
      <div>We appreciate your visit.</div>
      <div style="margin-top: 5px;">${config.company.email}</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Generate receipt JSON for API response
   */
  generateReceiptJSON(data: ReceiptData): {
    header: {
      companyName: string;
      address: string;
      phone: string;
      pin: string;
      email: string;
    };
    receipt: {
      number: string;
      date: string;
    };
    vehicle: {
      registration: string;
      type: string;
    };
    customer: {
      name: string;
      phone: string;
    } | null;
    services: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
    }>;
    totals: {
      subtotal: number;
      discount: number;
      tax: number;
      total: number;
    };
    payments: Array<{
      method: string;
      amount: number;
      reference?: string;
    }>;
    footer: {
      cashier: string;
      branch: string;
      message: string;
    };
  } {
    return {
      header: {
        companyName: config.company.name,
        address: config.company.address,
        phone: config.company.phone,
        pin: config.company.pin,
        email: config.company.email,
      },
      receipt: {
        number: data.jobNo,
        date: formatDateTime(data.date),
      },
      vehicle: {
        registration: data.vehicle.registration,
        type: data.vehicle.type,
      },
      customer: data.customer || null,
      services: data.services,
      totals: {
        subtotal: data.subtotal,
        discount: data.discount,
        tax: data.tax,
        total: data.total,
      },
      payments: data.payments,
      footer: {
        cashier: data.cashier,
        branch: data.branch,
        message: 'Thank you for your business!',
      },
    };
  }

  // Helper methods

  private centerText(text: string): string {
    const padding = Math.max(0, Math.floor((this.width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  private padRight(left: string, right: string): string {
    const spaces = this.width - left.length - right.length;
    return left + ' '.repeat(Math.max(1, spaces)) + right;
  }

  private padColumns(col1: string, col2: string, col3: string, widths: number[]): string {
    const c1 = col1.substring(0, widths[0]).padEnd(widths[0]);
    const c2 = col2.substring(0, widths[1]).padStart(widths[1]);
    const c3 = col3.substring(0, widths[2]).padStart(widths[2]);
    return `${c1}${c2} ${c3}`;
  }

  private truncate(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 2) + '..' : text;
  }
}

export default new ReceiptService();
