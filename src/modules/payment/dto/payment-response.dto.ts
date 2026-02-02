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

  @ApiProperty()
  deliveryFee?: number;

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
  @ApiProperty({ description: '주문 그룹 번호 (orderId)' })
  orderId: string;

  @ApiProperty({ description: '원본 금액 (할인 전)' })
  originalAmount: number;

  @ApiProperty({ description: '할인 금액' })
  discountAmount: number;

  @ApiProperty({ description: '최종 결제 금액' })
  finalAmount: number;

  @ApiProperty({ description: '주문 그룹 이름' })
  orderGroupName: string;

  @ApiProperty({ description: '고객 키 (Toss 요구사항)' })
  customerKey: string;

  @ApiProperty({ description: '성공 URL' })
  successUrl: string;

  @ApiProperty({ description: '실패 URL' })
  failUrl: string;

  @ApiProperty({ description: '배송비' })
  deliveryFee?: number;

  @ApiProperty({ description: '사용자 배송 주소 ID', required: false })
  userShippingAddressId?: string;

  @ApiProperty({ description: '장바구니 아이템 ID 배열', type: [String] })
  cartItems: string[];

  @ApiProperty({ description: '적용된 쿠폰 ID 배열', type: [String] })
  coupons: {
    couponId: string;
    quantity: number;
  }[];

  @ApiProperty({ description: 'Payment token for confirmPayment (expires in 1 hour)' })
  paymentToken: string;
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

