import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EBannerType, EBannerStatus } from '../enums/banner.enum';
import { ECategoryType } from '../../categories/enums/category.enum';

export class QueryBannerDto {
  @ApiPropertyOptional({
    description: 'Filter by banner type',
    enum: EBannerType,
    example: EBannerType.MAIN_PRODUCTS,
  })
  @IsOptional()
  @IsEnum(EBannerType)
  type?: EBannerType;

  @ApiPropertyOptional({
    description: 'Filter by banner status',
    enum: EBannerStatus,
    example: EBannerStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EBannerStatus)
  status?: EBannerStatus;

  @ApiPropertyOptional({
    description: 'Filter by product ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'productId must be a valid UUID' })
  productId?: string;

  @ApiPropertyOptional({
    description: 'Filter by product category number',
    example: 'CAT001',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  productCategoryNumber?: string;

  @ApiPropertyOptional({
    description: 'Filter by category type',
    enum: ECategoryType,
    example: ECategoryType.LIVESTOCK,
  })
  @IsOptional()
  @IsEnum(ECategoryType)
  categoryType?: ECategoryType;

  @ApiPropertyOptional({
    description: 'Search by title or badge text (case-insensitive)',
    example: 'Holiday',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter banners starting from this date (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter banners starting up to this date (ISO 8601 format)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter banners ending from this date (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  endDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter banners ending up to this date (ISO 8601 format)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDateTo?: string;

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
    example: 'displayOrder',
    default: 'displayOrder',
    enum: ['displayOrder', 'createdAt', 'startDate', 'endDate'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'displayOrder';

  @ApiPropertyOptional({
    description: 'Sort order: asc or desc',
    example: 'asc',
    default: 'asc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}

