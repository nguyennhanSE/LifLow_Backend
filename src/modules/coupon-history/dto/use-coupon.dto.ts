import { IsString, IsInt, Min, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UseCouponDto {
  @ApiProperty({
    description: 'Coupon history ID to use',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  couponHistoryId: string;

  @ApiProperty({
    description: 'Order ID associated with this coupon usage',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Purchase amount in KRW for this order',
    example: 100000,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  purchaseAmount: number;
}

