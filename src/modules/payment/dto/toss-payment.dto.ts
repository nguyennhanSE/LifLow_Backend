import { IsString, IsNumber, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TossPaymentMethod {
  CARD = '카드',
  VIRTUAL_ACCOUNT = '가상계좌',
  EASY_PAY = '간편결제',
  TRANSFER = '계좌이체',
  MOBILE_PHONE = '휴대폰',
  GIFT_CERTIFICATE = '상품권',
}

// DTO for initiating payment
export class InitiatePaymentDto {
  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '주문명' })
  @IsString()
  orderName: string;

  @ApiProperty({ description: '결제 금액' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: '고객 이메일' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: '고객 이름' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: '메타데이터' })
  @IsOptional()
  metadata?: any;
}

// DTO for confirming payment
export class ConfirmPaymentDto {
  @ApiProperty({ description: '결제 키' })
  @IsString()
  paymentKey: string;

  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '결제 금액' })
  @IsNumber()
  amount: number;
}

// DTO for canceling payment
export class CancelPaymentDto {
  @ApiProperty({ description: '취소 사유' })
  @IsString()
  cancelReason: string;

  @ApiPropertyOptional({ description: '취소 금액 (부분 취소 시)' })
  @IsOptional()
  @IsNumber()
  cancelAmount?: number;

  @ApiPropertyOptional({ description: '환불 계좌 은행 코드' })
  @IsOptional()
  @IsString()
  refundReceiveAccount?: string;
}

// Response DTOs from Toss
export interface TossCardInfo {
  company: string;
  number: string;
  installmentPlanMonths: number;
  isInterestFree: boolean;
  approveNo: string;
  useCardPoint: boolean;
  cardType: string;
  ownerType: string;
  acquireStatus: string;
  receiptUrl: string;
}

export interface TossVirtualAccountInfo {
  accountType: string;
  accountNumber: string;
  bankCode: string;
  customerName: string;
  dueDate: string;
  refundStatus: string;
  expired: boolean;
  settlementStatus: string;
}

export interface TossEasyPayInfo {
  provider: string;
  amount: number;
  discountAmount: number;
}

export interface TossCancelInfo {
  cancelAmount: number;
  cancelReason: string;
  taxFreeAmount: number;
  taxExemptionAmount: number;
  refundableAmount: number;
  easyPayDiscountAmount: number;
  canceledAt: string;
  transactionKey: string;
  receiptKey: string;
}

export interface TossPaymentResponse {
  mId: string;
  version: string;
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string;
  requestedAt: string;
  approvedAt: string;
  useEscrow: boolean;
  cultureExpense: boolean;
  card?: TossCardInfo;
  virtualAccount?: TossVirtualAccountInfo;
  easyPay?: TossEasyPayInfo;
  transfer?: any;
  mobilePhone?: any;
  giftCertificate?: any;
  cashReceipt?: any;
  cashReceipts?: any;
  discount?: any;
  cancels?: TossCancelInfo[];
  secret: string;
  type: string;
  method: string;
  totalAmount: number;
  balanceAmount: number;
  suppliedAmount: number;
  vat: number;
  taxFreeAmount: number;
  taxExemptionAmount: number;
  currency: string;
  country: string;
  receipt?: {
    url: string;
  };
  checkout?: {
    url: string;
  };
  failure?: {
    code: string;
    message: string;
  };
  transactionKey?: string;
  metadata?: any;
}

// DTO for billing key (정기결제)
export class IssueBillingKeyDto {
  @ApiProperty({ description: '고객 키' })
  @IsString()
  customerKey: string;

  @ApiProperty({ description: '인증 키' })
  @IsString()
  authKey: string;

  @ApiPropertyOptional({ description: '고객 이메일' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: '고객 이름' })
  @IsOptional()
  @IsString()
  customerName?: string;
}

export class ChargeWithBillingKeyDto {
  @ApiProperty({ description: '빌링 키' })
  @IsString()
  billingKey: string;

  @ApiProperty({ description: '고객 키' })
  @IsString()
  customerKey: string;

  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '주문명' })
  @IsString()
  orderName: string;

  @ApiProperty({ description: '결제 금액' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: '고객 이메일' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: '고객 이름' })
  @IsOptional()
  @IsString()
  customerName?: string;
}

