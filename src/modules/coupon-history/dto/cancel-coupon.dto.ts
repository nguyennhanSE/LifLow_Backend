import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelCouponDto {
  @ApiProperty({
    description: 'Coupon history ID to cancel',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  couponHistoryId: string;

  @ApiPropertyOptional({
    description: 'Optional reason for cancellation',
    example: 'User requested cancellation',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

