import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  TossPaymentResponse,
  ConfirmPaymentDto,
  CancelPaymentDto,
  ChargeWithBillingKeyDto,
} from '../dto/toss-payment.dto';

@Injectable()
export class TossPaymentApiService {
  private readonly logger = new Logger(TossPaymentApiService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly secretKey: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('TOSS_SECRET_KEY') || '';
    this.apiUrl =
      this.configService.get<string>('TOSS_API_URL') ||
      'https://api.tosspayments.com/v1';

    // Create axios instance with default config
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error('Toss API Error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        throw new HttpException(
          error.response?.data || 'Toss Payment API Error',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      },
    );
  }

  /**
   * Confirm payment after user completes payment on Toss checkout page
   */
  async confirmPayment(
    confirmDto: ConfirmPaymentDto,
  ): Promise<TossPaymentResponse> {
    this.logger.log(`Confirming payment: ${confirmDto.orderId}`);

    try {
      const response = await this.axiosInstance.post<TossPaymentResponse>(
        '/payments/confirm',
        {
          paymentKey: confirmDto.paymentKey,
          orderId: confirmDto.orderId,
          amount: confirmDto.amount,
        },
      );

      this.logger.log(`Payment confirmed successfully: ${confirmDto.orderId}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to confirm payment', error);
      throw error;
    }
  }

  /**
   * Get payment details by payment key
   */
  async getPayment(paymentKey: string): Promise<TossPaymentResponse> {
    this.logger.log(`Getting payment: ${paymentKey}`);

    try {
      const response = await this.axiosInstance.get<TossPaymentResponse>(
        `/payments/${paymentKey}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get payment', error);
      throw error;
    }
  }

  /**
   * Get payment details by order ID
   */
  async getPaymentByOrderId(orderId: string): Promise<TossPaymentResponse> {
    this.logger.log(`Getting payment by order ID: ${orderId}`);

    try {
      const response = await this.axiosInstance.get<TossPaymentResponse>(
        `/payments/orders/${orderId}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get payment by order ID', error);
      throw error;
    }
  }

  /**
   * Cancel payment (full or partial)
   */
  async cancelPayment(
    paymentKey: string,
    cancelDto: CancelPaymentDto,
  ): Promise<TossPaymentResponse> {
    this.logger.log(`Canceling payment: ${paymentKey}`);

    try {
      const response = await this.axiosInstance.post<TossPaymentResponse>(
        `/payments/${paymentKey}/cancel`,
        {
          cancelReason: cancelDto.cancelReason,
          cancelAmount: cancelDto.cancelAmount,
          refundReceiveAccount: cancelDto.refundReceiveAccount,
        },
      );

      this.logger.log(`Payment canceled successfully: ${paymentKey}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to cancel payment', error);
      throw error;
    }
  }

  /**
   * Issue billing key for automatic payment
   */
  async issueBillingKey(data: {
    customerKey: string;
    authKey: string;
  }): Promise<any> {
    this.logger.log(`Issuing billing key for customer: ${data.customerKey}`);

    try {
      const response = await this.axiosInstance.post(
        '/billing/authorizations/issue',
        {
          customerKey: data.customerKey,
          authKey: data.authKey,
        },
      );

      this.logger.log(
        `Billing key issued successfully for: ${data.customerKey}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to issue billing key', error);
      throw error;
    }
  }

  /**
   * Charge using billing key (for subscription/recurring payments)
   */
  async chargeWithBillingKey(
    chargeDto: ChargeWithBillingKeyDto,
  ): Promise<TossPaymentResponse> {
    this.logger.log(
      `Charging with billing key: ${chargeDto.billingKey}, order: ${chargeDto.orderId}`,
    );

    try {
      const response = await this.axiosInstance.post<TossPaymentResponse>(
        `/billing/${chargeDto.billingKey}`,
        {
          customerKey: chargeDto.customerKey,
          amount: chargeDto.amount,
          orderId: chargeDto.orderId,
          orderName: chargeDto.orderName,
          customerEmail: chargeDto.customerEmail,
          customerName: chargeDto.customerName,
        },
      );

      this.logger.log(
        `Charged successfully with billing key: ${chargeDto.orderId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to charge with billing key', error);
      throw error;
    }
  }

  /**
   * Get billing key information
   */
  async getBillingKey(billingKey: string, customerKey: string): Promise<any> {
    this.logger.log(`Getting billing key info: ${billingKey}`);

    try {
      const response = await this.axiosInstance.get(
        `/billing/authorizations/${billingKey}?customerKey=${customerKey}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get billing key', error);
      throw error;
    }
  }

  /**
   * Delete billing key
   */
  async deleteBillingKey(
    billingKey: string,
    customerKey: string,
  ): Promise<void> {
    this.logger.log(`Deleting billing key: ${billingKey}`);

    try {
      await this.axiosInstance.delete(
        `/billing/authorizations/${billingKey}?customerKey=${customerKey}`,
      );

      this.logger.log(`Billing key deleted successfully: ${billingKey}`);
    } catch (error) {
      this.logger.error('Failed to delete billing key', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature (for security)
   */
  verifyWebhook(signature: string, payload: string): boolean {
    const crypto = require('crypto');
    const webhookSecret =
      this.configService.get<string>('TOSS_WEBHOOK_SECRET') || '';

    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }
}

