import axios, { AxiosError } from 'axios';
import mpesaConfig from '../config/mpesa';
import { MpesaSTKPushRequest } from '../types';

interface MpesaTokenResponse {
  access_token: string;
  expires_in: string;
}

interface MpesaSTKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface MpesaSTKQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

class MpesaService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Get OAuth access token
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(
      `${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`
    ).toString('base64');

    try {
      const response = await axios.get<MpesaTokenResponse>(
        mpesaConfig.getUrls().oauth,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 50 minutes (token valid for 60 minutes)
      this.tokenExpiry = Date.now() + 50 * 60 * 1000;

      return this.accessToken;
    } catch (error) {
      console.error('Failed to get M-Pesa access token:', error);
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  /**
   * Initiate STK Push (Lipa Na M-Pesa Online)
   */
  async initiateSTKPush(request: MpesaSTKPushRequest): Promise<MpesaSTKPushResponse> {
    const token = await this.getAccessToken();
    const timestamp = mpesaConfig.getTimestamp();
    const password = mpesaConfig.generatePassword(timestamp);

    // Validate and format phone number
    if (!mpesaConfig.validatePhoneNumber(request.phone)) {
      throw new Error('Invalid phone number');
    }

    const phone = mpesaConfig.formatPhoneNumber(request.phone);

    const payload = {
      BusinessShortCode: mpesaConfig.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(request.amount),
      PartyA: phone,
      PartyB: mpesaConfig.shortCode,
      PhoneNumber: phone,
      CallBackURL: mpesaConfig.callbackUrl,
      AccountReference: request.accountReference.substring(0, 12),
      TransactionDesc: request.transactionDesc.substring(0, 13),
    };

    try {
      const response = await axios.post<MpesaSTKPushResponse>(
        mpesaConfig.getUrls().stkPush,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.ResponseCode !== '0') {
        throw new Error(response.data.ResponseDescription || 'STK Push failed');
      }

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('M-Pesa STK Push error:', error.response?.data);
        throw new Error(error.response?.data?.errorMessage || 'STK Push request failed');
      }
      throw error;
    }
  }

  /**
   * Query STK Push transaction status
   */
  async querySTKStatus(checkoutRequestId: string): Promise<MpesaSTKQueryResponse> {
    const token = await this.getAccessToken();
    const timestamp = mpesaConfig.getTimestamp();
    const password = mpesaConfig.generatePassword(timestamp);

    const payload = {
      BusinessShortCode: mpesaConfig.shortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    try {
      const response = await axios.post<MpesaSTKQueryResponse>(
        mpesaConfig.getUrls().stkQuery,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('M-Pesa STK Query error:', error.response?.data);
        throw new Error(error.response?.data?.errorMessage || 'STK Query failed');
      }
      throw error;
    }
  }

  /**
   * Register C2B URLs (for Till/Paybill confirmations)
   */
  async registerC2BUrls(confirmationUrl: string, validationUrl: string): Promise<void> {
    const token = await this.getAccessToken();

    const payload = {
      ShortCode: mpesaConfig.shortCode,
      ResponseType: 'Completed',
      ConfirmationURL: confirmationUrl,
      ValidationURL: validationUrl,
    };

    try {
      await axios.post(
        mpesaConfig.getUrls().c2bRegister,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('M-Pesa C2B Registration error:', error.response?.data);
        throw new Error('C2B URL registration failed');
      }
      throw error;
    }
  }

  /**
   * Check account balance
   */
  async checkBalance(initiatorName: string, securityCredential: string): Promise<unknown> {
    const token = await this.getAccessToken();

    const payload = {
      Initiator: initiatorName,
      SecurityCredential: securityCredential,
      CommandID: 'AccountBalance',
      PartyA: mpesaConfig.shortCode,
      IdentifierType: '4',
      Remarks: 'Balance query',
      QueueTimeOutURL: `${mpesaConfig.callbackUrl}/timeout`,
      ResultURL: `${mpesaConfig.callbackUrl}/balance`,
    };

    try {
      const response = await axios.post(
        mpesaConfig.getUrls().accountBalance,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('M-Pesa Balance Query error:', error.response?.data);
        throw new Error('Balance query failed');
      }
      throw error;
    }
  }

  /**
   * Check transaction status
   */
  async checkTransactionStatus(
    transactionId: string,
    initiatorName: string,
    securityCredential: string
  ): Promise<unknown> {
    const token = await this.getAccessToken();

    const payload = {
      Initiator: initiatorName,
      SecurityCredential: securityCredential,
      CommandID: 'TransactionStatusQuery',
      TransactionID: transactionId,
      PartyA: mpesaConfig.shortCode,
      IdentifierType: '4',
      Remarks: 'Transaction status query',
      Occasion: '',
      QueueTimeOutURL: `${mpesaConfig.callbackUrl}/timeout`,
      ResultURL: `${mpesaConfig.callbackUrl}/status`,
    };

    try {
      const response = await axios.post(
        mpesaConfig.getUrls().transactionStatus,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('M-Pesa Transaction Status error:', error.response?.data);
        throw new Error('Transaction status query failed');
      }
      throw error;
    }
  }

  /**
   * Parse STK callback data
   */
  parseSTKCallback(body: unknown): {
    success: boolean;
    checkoutRequestId: string;
    merchantRequestId: string;
    resultCode: number;
    resultDesc: string;
    amount?: number;
    mpesaReceiptNumber?: string;
    phoneNumber?: string;
    transactionDate?: string;
  } {
    const callback = (body as { Body?: { stkCallback?: unknown } })?.Body?.stkCallback as {
      CheckoutRequestID: string;
      MerchantRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value: string | number }>;
      };
    };

    if (!callback) {
      throw new Error('Invalid callback data');
    }

    const result = {
      success: callback.ResultCode === 0,
      checkoutRequestId: callback.CheckoutRequestID,
      merchantRequestId: callback.MerchantRequestID,
      resultCode: callback.ResultCode,
      resultDesc: callback.ResultDesc,
    } as {
      success: boolean;
      checkoutRequestId: string;
      merchantRequestId: string;
      resultCode: number;
      resultDesc: string;
      amount?: number;
      mpesaReceiptNumber?: string;
      phoneNumber?: string;
      transactionDate?: string;
    };

    if (callback.ResultCode === 0 && callback.CallbackMetadata?.Item) {
      const metadata = callback.CallbackMetadata.Item;

      for (const item of metadata) {
        switch (item.Name) {
          case 'Amount':
            result.amount = Number(item.Value);
            break;
          case 'MpesaReceiptNumber':
            result.mpesaReceiptNumber = String(item.Value);
            break;
          case 'PhoneNumber':
            result.phoneNumber = String(item.Value);
            break;
          case 'TransactionDate':
            result.transactionDate = String(item.Value);
            break;
        }
      }
    }

    return result;
  }

  /**
   * Format amount for display (removes decimals for M-Pesa)
   */
  formatAmount(amount: number): number {
    return Math.round(amount);
  }

  /**
   * Validate M-Pesa receipt number format
   */
  isValidReceiptNumber(receipt: string): boolean {
    // M-Pesa receipts are typically alphanumeric and 10 characters
    return /^[A-Z0-9]{10}$/i.test(receipt);
  }
}

export default new MpesaService();
