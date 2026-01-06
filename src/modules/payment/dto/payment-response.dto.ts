import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, PaymentType } from '@prisma/client';

export class PaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  paymentKey: string;

  @ApiProperty()
  orderName: string;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  balanceAmount: number;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiProperty({ enum: PaymentType })
  type: PaymentType;

  @ApiProperty()
  method: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  requestedAt: Date;

  @ApiProperty()
  approvedAt?: Date;

  @ApiProperty()
  receiptUrl?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class InitiatePaymentResponseDto {
  @ApiProperty({ description: '주문 ID' })
  orderId: string;

  @ApiProperty({ description: '결제 금액' })
  amount: number;

  @ApiProperty({ description: '주문명' })
  orderName: string;

  @ApiProperty({ description: 'Toss 결제 페이지 URL' })
  checkoutUrl?: string;

  @ApiProperty({ description: '고객 키 (정기결제용)' })
  customerKey?: string;
}

export class PaymentListResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  data: PaymentResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

