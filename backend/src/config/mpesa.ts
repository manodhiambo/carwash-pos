import { config } from './index';

export const mpesaConfig = {
  consumerKey: config.mpesa.consumerKey,
  consumerSecret: config.mpesa.consumerSecret,
  passkey: config.mpesa.passkey,
  shortCode: config.mpesa.shortCode,
  callbackUrl: config.mpesa.callbackUrl,
  environment: config.mpesa.environment,

  // API URLs
  urls: {
    sandbox: {
      oauth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      stkPush: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkQuery: 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
      c2bRegister: 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl',
      b2c: 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
      transactionStatus: 'https://sandbox.safaricom.co.ke/mpesa/transactionstatus/v1/query',
      accountBalance: 'https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query',
    },
    production: {
      oauth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      stkPush: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkQuery: 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
      c2bRegister: 'https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl',
      b2c: 'https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
      transactionStatus: 'https://api.safaricom.co.ke/mpesa/transactionstatus/v1/query',
      accountBalance: 'https://api.safaricom.co.ke/mpesa/accountbalance/v1/query',
    },
  },

  getUrls() {
    return this.environment === 'production' ? this.urls.production : this.urls.sandbox;
  },

  getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  },

  generatePassword(timestamp: string): string {
    const data = `${this.shortCode}${this.passkey}${timestamp}`;
    return Buffer.from(data).toString('base64');
  },

  formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/\D/g, '');

    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.substring(1);
    } else if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    } else if (!formatted.startsWith('254')) {
      formatted = '254' + formatted;
    }

    return formatted;
  },

  validatePhoneNumber(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone);
    return /^254[17]\d{8}$/.test(formatted);
  },
};

export default mpesaConfig;
