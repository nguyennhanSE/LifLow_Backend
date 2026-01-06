import { IsString, IsNumber, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, PaymentType } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({ description: '사용자 ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: '주문명' })
  @IsString()
  orderName: string;

  @ApiProperty({ description: '결제 금액' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: '정기결제 ID' })
  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @ApiPropertyOptional({ description: '결제 타입' })
  @IsOptional()
  @IsEnum(PaymentType)
  type?: PaymentType;

  @ApiPropertyOptional({ description: '메타데이터' })
  @IsOptional()
  metadata?: any;
}

export class ConfirmPaymentRequestDto {
  @ApiProperty({ description: '결제 키 (Toss에서 전달)' })
  @IsString()
  paymentKey: string;

  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '결제 금액' })
  @IsNumber()
  amount: number;
}

export class CancelPaymentRequestDto {
  @ApiProperty({ description: '결제 ID' })
  @IsUUID()
  paymentId: string;

  @ApiProperty({ description: '취소 사유' })
  @IsString()
  cancelReason: string;

  @ApiPropertyOptional({ description: '취소 금액 (부분 취소)' })
  @IsOptional()
  @IsNumber()
  cancelAmount?: number;
}

export class PaymentWebhookDto {
  @ApiProperty()
  @IsString()
  eventType: string;

  @ApiProperty()
  @IsString()
  createdAt: string;

  @ApiProperty()
  data: any;
}

export class GetPaymentDto {
  @ApiPropertyOptional({ description: '사용자 ID로 필터' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '상태로 필터' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: '페이지 번호' })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기' })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

