import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CouponHistoryStatus } from '../../coupons/enums/coupon.enum';

export class QueryCouponHistoryDto {
  @ApiPropertyOptional({
    description: 'Filter by coupon ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  couponId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 'user123',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by coupon history status',
    enum: CouponHistoryStatus,
    example: CouponHistoryStatus.ISSUED,
  })
  @IsOptional()
  @IsEnum(CouponHistoryStatus)
  status?: CouponHistoryStatus;

  @ApiPropertyOptional({
    description: 'Filter by issuance date from (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  issuedAtFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by issuance date to (ISO 8601 format)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  issuedAtTo?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'issuedAt',
    default: 'issuedAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'issuedAt';

  @ApiPropertyOptional({
    description: 'Sort order: asc or desc',
    example: 'desc',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

