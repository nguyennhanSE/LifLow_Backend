import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, PaymentType } from '@prisma/client';
import { TossPaymentApiService } from './services/toss-payment-api.service';
import { PaymentRepository } from './repositories/payment.repository';
import {
  CreatePaymentDto,
  ConfirmPaymentRequestDto,
  CancelPaymentRequestDto,
  GetPaymentDto,
} from './dto/payment-request.dto';
import {
  PaymentResponseDto,
  InitiatePaymentResponseDto,
  PaymentListResponseDto,
} from './dto/payment-response.dto';
import { TossPaymentResponse } from './dto/toss-payment.dto';
import { OrdersService } from '../order/order.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly tossApiService: TossPaymentApiService,
    private readonly paymentRepository: PaymentRepository,
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Initiate payment - Create order ID and return payment info
   * Client will use this to open Toss checkout page
   */
  async initiatePayment(
    userId: string,
    customerName: string,
  ): Promise<InitiatePaymentResponseDto> {
    this.logger.log(`Initiating payment for user: ${userId}`);

    try {
      // Generate unique order ID
      const orderGroupNumber = await this.ordersService.generateUniqueOrderGroupNumber();

      // The client will use this to call Toss Payment Widget
      return Promise.resolve({
        orderId: orderGroupNumber,
        customerName: customerName, 
      });
    } catch (error) {
      this.logger.error('Failed to initiate payment', error);
      throw new HttpException(
        'Failed to initiate payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Confirm payment after user completes checkout
   * This is called from the success callback URL
   */
  async confirmPayment(
    dto: ConfirmPaymentRequestDto,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Confirming payment: ${dto.orderId}`);

    try {
      // Call Toss API to confirm payment
      const tossPayment = await this.tossApiService.confirmPayment({
        paymentKey: dto.paymentKey,
        orderId: dto.orderId,
        amount: dto.amount,
      });

      // Save payment to database
      const payment = await this.savePaymentFromToss(tossPayment);

      this.logger.log(`Payment confirmed and saved: ${payment.id}`);

      return this.mapToResponseDto(payment);
    } catch (error) {
      this.logger.error('Failed to confirm payment', error);

      // Try to save failed payment record
      try {
        await this.paymentRepository.create({
          userId: '', // Will need to get from order context
          orderGroupNumber: dto.orderId,
          paymentKey: dto.paymentKey,
          totalAmount: dto.amount,
          balanceAmount: 0,
          status: PaymentStatus.FAILED,
          type: PaymentType.NORMAL,
          currency: 'KRW',
          orderName: '',
          requestedAt: new Date(),
          failureCode: error.response?.data?.code || 'UNKNOWN',
          failureMessage: error.response?.data?.message || error.message,
        });
      } catch (saveError) {
        this.logger.error('Failed to save failed payment record', saveError);
      }

      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findById(id);

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return this.mapToResponseDto(payment);
  }

  /**
   * Get payment by payment key
   */
  async getPaymentByKey(paymentKey: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findByPaymentKey(paymentKey);

    if (!payment) {
      throw new NotFoundException(
        `Payment with key ${paymentKey} not found`,
      );
    }

    return this.mapToResponseDto(payment);
  }

  /**
   * Get payment by order group number
   */
  async getPaymentByOrderId(orderGroupNumber: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findByOrderGroupNumber(orderGroupNumber);

    if (!payment) {
      throw new NotFoundException(
        `Payment with order group number ${orderGroupNumber} not found`,
      );
    }

    return this.mapToResponseDto(payment);
  }

  /**
   * Get payments with filters and pagination
   */
  async getPayments(query: GetPaymentDto): Promise<PaymentListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const filter: { userId?: string; status?: PaymentStatus } = {};
    if (query.userId) filter.userId = query.userId;
    if (query.status) filter.status = query.status;

    const { data, total } = await this.paymentRepository.findMany(
      filter,
      page,
      limit,
    );

    return {
      data: data.map((p) => this.mapToResponseDto(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Cancel payment (full or partial)
   */
  async cancelPayment(
    dto: CancelPaymentRequestDto,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Canceling payment: ${dto.paymentId}`);

    try {
      // Get payment from database
      const payment = await this.paymentRepository.findById(dto.paymentId);

      if (!payment) {
        throw new NotFoundException(
          `Payment with ID ${dto.paymentId} not found`,
        );
      }

      // Check if payment can be canceled
      if (payment.status !== PaymentStatus.SUCCESS) {
        throw new BadRequestException(
          'Only successful payments can be canceled',
        );
      }

      if (payment.balanceAmount <= 0) {
        throw new BadRequestException('No balance available to cancel');
      }

      // Call Toss API to cancel
      const tossPayment = await this.tossApiService.cancelPayment(
        payment.paymentKey,
        {
          cancelReason: dto.cancelReason,
          cancelAmount: dto.cancelAmount,
        },
      );

      // Update payment in database
      const updatedPayment = await this.paymentRepository.update(payment.id, {
        status:
          tossPayment.balanceAmount === 0
            ? PaymentStatus.CANCELLED
            : PaymentStatus.SUCCESS,
        balanceAmount: tossPayment.balanceAmount,
        cancels: tossPayment.cancels,
        canceledAmount:
          payment.totalAmount - tossPayment.balanceAmount,
      });

      this.logger.log(`Payment canceled successfully: ${payment.id}`);

      return this.mapToResponseDto(updatedPayment);
    } catch (error) {
      this.logger.error('Failed to cancel payment', error);
      throw error;
    }
  }

  /**
   * Handle webhook from Toss
   * This is called when payment status changes (e.g., virtual account deposit)
   */
  handleWebhook(eventType: string, data: any): void {
    this.logger.log(`Handling webhook: ${eventType}`);

    try {
      switch (eventType) {
        case 'PAYMENT_STATUS_CHANGED':
          this.handlePaymentStatusChanged(data);
          break;
        case 'VIRTUAL_ACCOUNT_DEPOSIT':
          this.handleVirtualAccountDeposit(data);
          break;
        default:
          this.logger.warn(`Unknown webhook event type: ${eventType}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle webhook', error);
      throw error;
    }
  }

  /**
   * Sync payment with Toss (get latest status)
   */
  async syncPayment(paymentKey: string): Promise<PaymentResponseDto> {
    this.logger.log(`Syncing payment: ${paymentKey}`);

    try {
      // Get latest payment info from Toss
      const tossPayment = await this.tossApiService.getPayment(paymentKey);

      // Update in database
      const payment = await this.paymentRepository.findByPaymentKey(paymentKey);

      if (!payment) {
        // Create new payment record if not exists
        const newPayment = await this.savePaymentFromToss(tossPayment);
        return this.mapToResponseDto(newPayment);
      }

      // Update existing payment
      const updatedPayment = await this.paymentRepository.update(payment.id, {
        status: this.mapTossStatusToPaymentStatus(tossPayment.status),
        approvedAt: tossPayment.approvedAt
          ? new Date(tossPayment.approvedAt)
          : undefined,
        balanceAmount: tossPayment.balanceAmount,
        receiptUrl: tossPayment.receipt?.url,
        cancels: tossPayment.cancels,
        cardInfo: tossPayment.card,
        virtualAccountInfo: tossPayment.virtualAccount,
      });

      return this.mapToResponseDto(updatedPayment);
    } catch (error) {
      this.logger.error('Failed to sync payment', error);
      throw error;
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.paymentRepository.getPaymentStats(userId, startDate, endDate);
  }

  // Private helper methods

  private generateOrderId(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `order_${timestamp}_${random}`;
  }

  private async savePaymentFromToss(
    tossPayment: TossPaymentResponse,
  ): Promise<any> {
    return this.paymentRepository.create({
      userId: tossPayment.metadata?.userId || '', // Should be passed in metadata
      subscriptionId: tossPayment.metadata?.subscriptionId,
      orderGroupNumber: tossPayment.orderId, // Toss's orderId is our orderGroupNumber
      paymentKey: tossPayment.paymentKey,
      transactionKey: tossPayment.transactionKey,
      mId: tossPayment.mId,
      totalAmount: tossPayment.totalAmount,
      balanceAmount: tossPayment.balanceAmount,
      suppliedAmount: tossPayment.suppliedAmount,
      vat: tossPayment.vat,
      taxFreeAmount: tossPayment.taxFreeAmount,
      taxExemptionAmount: tossPayment.taxExemptionAmount,
      status: this.mapTossStatusToPaymentStatus(tossPayment.status),
      type: this.mapTossTypeToPaymentType(tossPayment.type),
      method: tossPayment.method,
      currency: tossPayment.currency,
      orderName: tossPayment.orderName,
      requestedAt: new Date(tossPayment.requestedAt),
      approvedAt: tossPayment.approvedAt
        ? new Date(tossPayment.approvedAt)
        : undefined,
      receiptUrl: tossPayment.receipt?.url,
      cardInfo: tossPayment.card,
      virtualAccountInfo: tossPayment.virtualAccount,
      easyPayInfo: tossPayment.easyPay,
      transferInfo: tossPayment.transfer,
      mobilePhoneInfo: tossPayment.mobilePhone,
      giftCertificateInfo: tossPayment.giftCertificate,
      cancels: tossPayment.cancels,
      secret: tossPayment.secret,
      metadata: tossPayment.metadata,
    });
  }

  private mapTossStatusToPaymentStatus(tossStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      READY: PaymentStatus.PENDING,
      IN_PROGRESS: PaymentStatus.PENDING,
      WAITING_FOR_DEPOSIT: PaymentStatus.PENDING,
      DONE: PaymentStatus.SUCCESS,
      CANCELED: PaymentStatus.CANCELLED,
      PARTIAL_CANCELED: PaymentStatus.SUCCESS,
      ABORTED: PaymentStatus.FAILED,
      EXPIRED: PaymentStatus.FAILED,
    };

    return statusMap[tossStatus] || PaymentStatus.PENDING;
  }

  private mapTossTypeToPaymentType(tossType: string): PaymentType {
    const typeMap: Record<string, PaymentType> = {
      NORMAL: PaymentType.NORMAL,
      BILLING: PaymentType.BILLING,
      BRANDPAY: PaymentType.BRANDPAY,
    };

    return typeMap[tossType] || PaymentType.NORMAL;
  }

  private mapToResponseDto(payment: any): PaymentResponseDto {
    return {
      id: payment.id,
      userId: payment.userId,
      orderId: payment.orderGroupNumber, // Map orderGroupNumber to orderId for API response
      paymentKey: payment.paymentKey,
      orderName: payment.orderName,
      totalAmount: payment.totalAmount,
      balanceAmount: payment.balanceAmount,
      status: payment.status,
      type: payment.type,
      method: payment.method || '',
      currency: payment.currency,
      requestedAt: payment.requestedAt,
      approvedAt: payment.approvedAt,
      receiptUrl: payment.receiptUrl,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private handlePaymentStatusChanged(data: any): void {
    // Implement payment status change logic
    this.logger.log('Handling payment status change', data);
  }

  private handleVirtualAccountDeposit(data: any): void {
    // Implement virtual account deposit logic
    this.logger.log('Handling virtual account deposit', data);
  }
}
