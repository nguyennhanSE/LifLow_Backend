import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Payment, PaymentStatus, PaymentType, Prisma } from '@prisma/client';

export interface CreatePaymentData {
  userId: string;
  subscriptionId?: string;
  orderId: string;
  paymentKey: string;
  transactionKey?: string;
  mId?: string;
  totalAmount: number;
  balanceAmount: number;
  suppliedAmount?: number;
  vat?: number;
  taxFreeAmount?: number;
  taxExemptionAmount?: number;
  status: PaymentStatus;
  type: PaymentType;
  method?: string;
  currency: string;
  orderName: string;
  requestedAt: Date;
  approvedAt?: Date;
  failureCode?: string;
  failureMessage?: string;
  receiptUrl?: string;
  cardInfo?: any;
  virtualAccountInfo?: any;
  easyPayInfo?: any;
  transferInfo?: any;
  mobilePhoneInfo?: any;
  giftCertificateInfo?: any;
  cancels?: any;
  canceledAmount?: number;
  secret?: string;
  metadata?: any;
}

export interface UpdatePaymentData {
  status?: PaymentStatus;
  approvedAt?: Date;
  failureCode?: string;
  failureMessage?: string;
  receiptUrl?: string;
  balanceAmount?: number;
  cancels?: any;
  canceledAmount?: number;
  cardInfo?: any;
  virtualAccountInfo?: any;
}

export interface PaymentFilter {
  userId?: string;
  status?: PaymentStatus;
  type?: PaymentType;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class PaymentRepository {
  private readonly logger = new Logger(PaymentRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePaymentData): Promise<Payment> {
    this.logger.log(`Creating payment: ${data.orderId}`);

    return this.prisma.payment.create({
      data: {
        userId: data.userId,
        subscriptionId: data.subscriptionId,
        orderId: data.orderId,
        paymentKey: data.paymentKey,
        transactionKey: data.transactionKey,
        mId: data.mId,
        totalAmount: data.totalAmount,
        balanceAmount: data.balanceAmount,
        suppliedAmount: data.suppliedAmount,
        vat: data.vat,
        taxFreeAmount: data.taxFreeAmount || 0,
        taxExemptionAmount: data.taxExemptionAmount || 0,
        status: data.status,
        type: data.type,
        method: data.method,
        currency: data.currency,
        orderName: data.orderName,
        requestedAt: data.requestedAt,
        approvedAt: data.approvedAt,
        failureCode: data.failureCode,
        failureMessage: data.failureMessage,
        receiptUrl: data.receiptUrl,
        cardInfo: data.cardInfo,
        virtualAccountInfo: data.virtualAccountInfo,
        easyPayInfo: data.easyPayInfo,
        transferInfo: data.transferInfo,
        mobilePhoneInfo: data.mobilePhoneInfo,
        giftCertificateInfo: data.giftCertificateInfo,
        cancels: data.cancels,
        canceledAmount: data.canceledAmount || 0,
        secret: data.secret,
        metadata: data.metadata,
      },
    });
  }

  async findById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async findByPaymentKey(paymentKey: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { paymentKey },
      include: { user: true },
    });
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { orderId },
      include: { user: true },
    });
  }

  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Payment[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return { data, total };
  }

  async findMany(
    filter: PaymentFilter,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Payment[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      ...(filter.userId && { userId: filter.userId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.type && { type: filter.type }),
      ...(filter.startDate &&
        filter.endDate && {
          createdAt: {
            gte: filter.startDate,
            lte: filter.endDate,
          },
        }),
    };

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, data: UpdatePaymentData): Promise<Payment> {
    this.logger.log(`Updating payment: ${id}`);

    return this.prisma.payment.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.approvedAt && { approvedAt: data.approvedAt }),
        ...(data.failureCode && { failureCode: data.failureCode }),
        ...(data.failureMessage && { failureMessage: data.failureMessage }),
        ...(data.receiptUrl && { receiptUrl: data.receiptUrl }),
        ...(data.balanceAmount !== undefined && {
          balanceAmount: data.balanceAmount,
        }),
        ...(data.cancels && { cancels: data.cancels }),
        ...(data.canceledAmount !== undefined && {
          canceledAmount: data.canceledAmount,
        }),
        ...(data.cardInfo && { cardInfo: data.cardInfo }),
        ...(data.virtualAccountInfo && {
          virtualAccountInfo: data.virtualAccountInfo,
        }),
      },
    });
  }

  async updateByPaymentKey(
    paymentKey: string,
    data: UpdatePaymentData,
  ): Promise<Payment> {
    this.logger.log(`Updating payment by key: ${paymentKey}`);

    return this.prisma.payment.update({
      where: { paymentKey },
      data,
    });
  }

  async delete(id: string): Promise<Payment> {
    this.logger.log(`Deleting payment: ${id}`);

    return this.prisma.payment.delete({
      where: { id },
    });
  }

  async getTotalAmountByUser(userId: string): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: {
        userId,
        status: 'SUCCESS',
      },
      _sum: {
        totalAmount: true,
      },
    });

    return result._sum.totalAmount || 0;
  }

  async getPaymentStats(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: Prisma.PaymentWhereInput = {
      ...(userId && { userId }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    const [totalPayments, successPayments, totalAmount, avgAmount] =
      await Promise.all([
        this.prisma.payment.count({ where }),
        this.prisma.payment.count({
          where: { ...where, status: 'SUCCESS' },
        }),
        this.prisma.payment.aggregate({
          where: { ...where, status: 'SUCCESS' },
          _sum: { totalAmount: true },
        }),
        this.prisma.payment.aggregate({
          where: { ...where, status: 'SUCCESS' },
          _avg: { totalAmount: true },
        }),
      ]);

    return {
      totalPayments,
      successPayments,
      failedPayments: totalPayments - successPayments,
      totalAmount: totalAmount._sum.totalAmount || 0,
      avgAmount: avgAmount._avg.totalAmount || 0,
    };
  }
}

