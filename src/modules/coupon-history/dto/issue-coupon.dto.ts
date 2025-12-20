import { IsString, IsArray, ArrayNotEmpty, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IssueCouponDto {
  @ApiProperty({
    description: 'Coupon ID to issue',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  couponId: string;

  @ApiProperty({
    description: 'Array of user IDs to issue the coupon to (supports bulk issuance)',
    example: ['user1', 'user2', 'user3'],
    isArray: true,
    type: String,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userIds: string[];

  @ApiPropertyOptional({
    description: 'Optional custom expiration date for the issued coupons (ISO 8601 format)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}

