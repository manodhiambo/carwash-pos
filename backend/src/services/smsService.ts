import axios from 'axios';
import { config } from '../config';
import { formatPhoneNumber, formatCurrency } from '../utils/helpers';

interface SMSResponse {
  SMSMessageData: {
    Message: string;
    Recipients: Array<{
      statusCode: number;
      number: string;
      status: string;
      cost: string;
      messageId: string;
    }>;
  };
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  cost?: string;
  error?: string;
}

class SMSService {
  private apiUrl: string;
  private apiKey: string;
  private username: string;
  private senderId: string;

  constructor() {
    this.apiUrl = 'https://api.africastalking.com/version1/messaging';
    this.apiKey = config.sms.apiKey;
    this.username = config.sms.username;
    this.senderId = config.sms.senderId;
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, message: string): Promise<SMSResult> {
    if (!this.apiKey || this.username === 'sandbox') {
      console.log(`[SMS Mock] To: ${to}, Message: ${message}`);
      return {
        success: true,
        messageId: 'mock-message-id',
        cost: 'KES 0.00',
      };
    }

    try {
      const formattedPhone = formatPhoneNumber(to);

      const response = await axios.post<SMSResponse>(
        this.apiUrl,
        new URLSearchParams({
          username: this.username,
          to: `+${formattedPhone}`,
          message: message,
          from: this.senderId,
        }),
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            apiKey: this.apiKey,
          },
        }
      );

      const recipient = response.data.SMSMessageData.Recipients[0];

      if (recipient && recipient.statusCode === 101) {
        return {
          success: true,
          messageId: recipient.messageId,
          cost: recipient.cost,
        };
      }

      return {
        success: false,
        error: recipient?.status || 'Failed to send SMS',
      };
    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS',
      };
    }
  }

  /**
   * Send job completion notification
   */
  async sendJobCompletionNotification(
    phone: string,
    customerName: string,
    vehicleReg: string,
    jobNo: string
  ): Promise<SMSResult> {
    const message = `Hi ${customerName}, your vehicle ${vehicleReg} is ready for pickup. Job No: ${jobNo}. Thank you for choosing ${config.company.name}!`;

    return this.sendSMS(phone, message);
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(
    phone: string,
    amount: number,
    vehicleReg: string,
    receiptNo: string
  ): Promise<SMSResult> {
    const message = `Payment of ${formatCurrency(amount)} received for vehicle ${vehicleReg}. Receipt: ${receiptNo}. Thank you for visiting ${config.company.name}!`;

    return this.sendSMS(phone, message);
  }

  /**
   * Send subscription expiry reminder
   */
  async sendSubscriptionReminder(
    phone: string,
    customerName: string,
    planName: string,
    expiryDate: string,
    washesRemaining?: number
  ): Promise<SMSResult> {
    let message = `Hi ${customerName}, your ${planName} subscription expires on ${expiryDate}.`;

    if (washesRemaining !== undefined && washesRemaining > 0) {
      message += ` You have ${washesRemaining} washes remaining.`;
    }

    message += ` Renew now at ${config.company.name}!`;

    return this.sendSMS(phone, message);
  }

  /**
   * Send loyalty points update
   */
  async sendLoyaltyPointsUpdate(
    phone: string,
    customerName: string,
    pointsEarned: number,
    totalPoints: number
  ): Promise<SMSResult> {
    const message = `Hi ${customerName}, you earned ${pointsEarned} loyalty points! Total: ${totalPoints} points. Redeem at your next visit. ${config.company.name}`;

    return this.sendSMS(phone, message);
  }

  /**
   * Send promotional message
   */
  async sendPromotion(
    phone: string,
    promoMessage: string
  ): Promise<SMSResult> {
    const message = `${promoMessage} - ${config.company.name}. Tel: ${config.company.phone}`;

    return this.sendSMS(phone, message);
  }

  /**
   * Send bulk SMS
   */
  async sendBulkSMS(
    recipients: Array<{ phone: string; message: string }>
  ): Promise<Array<{ phone: string; result: SMSResult }>> {
    const results: Array<{ phone: string; result: SMSResult }> = [];

    for (const recipient of recipients) {
      const result = await this.sendSMS(recipient.phone, recipient.message);
      results.push({ phone: recipient.phone, result });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Send service reminder (e.g., "Time for your monthly wash!")
   */
  async sendServiceReminder(
    phone: string,
    customerName: string,
    lastVisitDays: number
  ): Promise<SMSResult> {
    const message = `Hi ${customerName}, it's been ${lastVisitDays} days since your last visit. Time for a car wash? Visit us at ${config.company.name}!`;

    return this.sendSMS(phone, message);
  }

  /**
   * Validate phone number for SMS
   */
  isValidPhone(phone: string): boolean {
    const formatted = formatPhoneNumber(phone);
    return /^254[17]\d{8}$/.test(formatted);
  }

  /**
   * Format message to fit SMS character limit
   */
  formatMessage(message: string, maxLength: number = 160): string {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength - 3) + '...';
  }
}

export default new SMSService();
