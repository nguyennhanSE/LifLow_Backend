import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsNotEmpty,
  MaxLength,
  Matches,
  IsUUID,
  Max,
  IsIn,
} from 'class-validator';

// ============================================
// 1. CREATE POINT DTO
// ============================================
export class CreatePointDto {
  @ApiPropertyOptional({
    description: 'Date (format: YYYY-MM-DD)',
    example: '2025-01-15',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Date must be a string' })
  @MaxLength(50, { message: 'Date must not exceed 50 characters' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in format YYYY-MM-DD',
  })
  date?: string;

  @ApiPropertyOptional({
    description: 'User ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'User ID must be a string' })
  @MaxLength(50, { message: 'User ID must not exceed 50 characters' })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Membership level',
    example: 'GOLD',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Membership level must be a string' })
  @MaxLength(50, { message: 'Membership level must not exceed 50 characters' })
  membershipLevel?: string;

  @ApiPropertyOptional({
    description: 'Content/Details',
    example: 'Order points',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Content must be a string' })
  @MaxLength(50, { message: 'Content must not exceed 50 characters' })
  content?: string;

  @ApiPropertyOptional({
    description: 'Order number',
    example: 'ORD-2025-001234',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Order number must be a string' })
  @MaxLength(50, { message: 'Order number must not exceed 50 characters' })
  orderNumber?: string;

  @ApiPropertyOptional({
    description: 'Points type',
    example: 'EARNED',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Points type must be a string' })
  @MaxLength(50, { message: 'Points type must not exceed 50 characters' })
  pointsType?: string;

  @ApiPropertyOptional({
    description: 'Available points increase',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Available points increase must be an integer' })
  @Min(0, { message: 'Available points increase must be at least 0' })
  availablePointsIncrease?: number;

  @ApiPropertyOptional({
    description: 'Available points deduction',
    example: 500,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Available points deduction must be an integer' })
  @Min(0, { message: 'Available points deduction must be at least 0' })
  availablePointsDeduction?: number;

  @ApiPropertyOptional({
    description: 'Available points balance',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Available points balance must be an integer' })
  @Min(0, { message: 'Available points balance must be at least 0' })
  availablePointsBalance?: number;
}

// ============================================
// 2. UPDATE POINT DTO
// ============================================
export class UpdatePointDto {
  @ApiPropertyOptional({
    description: 'Date (format: YYYY-MM-DD)',
    example: '2025-01-15',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Date must be a string' })
  @MaxLength(50, { message: 'Date must not exceed 50 characters' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in format YYYY-MM-DD',
  })
  date?: string;

  @ApiPropertyOptional({
    description: 'User ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'User ID must be a string' })
  @MaxLength(50, { message: 'User ID must not exceed 50 characters' })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Membership level',
    example: 'GOLD',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Membership level must be a string' })
  @MaxLength(50, { message: 'Membership level must not exceed 50 characters' })
  membershipLevel?: string;

  @ApiPropertyOptional({
    description: 'Content/Details',
    example: 'Order points',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Content must be a string' })
  @MaxLength(50, { message: 'Content must not exceed 50 characters' })
  content?: string;

  @ApiPropertyOptional({
    description: 'Order number',
    example: 'ORD-2025-001234',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Order number must be a string' })
  @MaxLength(50, { message: 'Order number must not exceed 50 characters' })
  orderNumber?: string;

  @ApiPropertyOptional({
    description: 'Points type',
    example: 'EARNED',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Points type must be a string' })
  @MaxLength(50, { message: 'Points type must not exceed 50 characters' })
  pointsType?: string;

  @ApiPropertyOptional({
    description: 'Available points increase',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Available points increase must be an integer' })
  @Min(0, { message: 'Available points increase must be at least 0' })
  availablePointsIncrease?: number;

  @ApiPropertyOptional({
    description: 'Available points deduction',
    example: 500,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Available points deduction must be an integer' })
  @Min(0, { message: 'Available points deduction must be at least 0' })
  availablePointsDeduction?: number;

  @ApiPropertyOptional({
    description: 'Available points balance',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Available points balance must be an integer' })
  @Min(0, { message: 'Available points balance must be at least 0' })
  availablePointsBalance?: number;
}

// ============================================
// 3. POINT RESPONSE DTO
// ============================================
export class PointResponseDto {
  @ApiProperty({ description: 'Point ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiPropertyOptional({ description: 'Date', example: '2025-01-15' })
  date?: string | null;

  @ApiPropertyOptional({ description: 'User ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  userId?: string | null;

  @ApiPropertyOptional({ description: 'Membership level', example: 'GOLD' })
  membershipLevel?: string | null;

  @ApiPropertyOptional({ description: 'Content/Details', example: 'Order points' })
  content?: string | null;

  @ApiPropertyOptional({ description: 'Order number', example: 'ORD-2025-001234' })
  orderNumber?: string | null;

  @ApiPropertyOptional({ description: 'Points type', example: 'EARNED' })
  pointsType?: string | null;

  @ApiPropertyOptional({ description: 'Available points increase', example: 1000 })
  availablePointsIncrease?: number | null;

  @ApiPropertyOptional({ description: 'Available points deduction', example: 500 })
  availablePointsDeduction?: number | null;

  @ApiPropertyOptional({ description: 'Available points balance', example: 5000 })
  availablePointsBalance?: number | null;

  @ApiProperty({ description: 'Point creation timestamp', example: '2025-01-15T10:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Point last update timestamp', example: '2025-01-15T10:30:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Associated user information' })
  user?: any;

  @ApiPropertyOptional({ description: 'Associated order information' })
  order?: any;
}

// ============================================
// 4. POINT FILTER DTO (Search & Pagination)
// ============================================
export class PointFilterDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional() 
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Search by user ID, order number, content',
    example: 'user123 OR ORD-2025-001234',
  })
  @IsOptional()
  @IsString({ message: 'Search query must be a string' })
  q?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by order number',
    example: 'ORD-2025-001234',
  })
  @IsOptional()
  @IsString({ message: 'Order number must be a string' })
  orderNumber?: string;

  @ApiPropertyOptional({
    description: 'Filter by points type',
    example: 'EARNED',
  })
  @IsOptional()
  @IsString({ message: 'Points type must be a string' })
  pointsType?: string;

  @ApiPropertyOptional({
    description: 'Date range start (format: YYYY-MM-DD)',
    example: '2025-01-01',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsString({ message: 'Date from must be a string' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date from must be in format YYYY-MM-DD',
  })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Date range end (format: YYYY-MM-DD)',
    example: '2025-12-31',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsString({ message: 'Date to must be a string' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date to must be in format YYYY-MM-DD',
  })
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: [
      'createdAt',
      'updatedAt',
      'date',
      'availablePointsBalance',
      'availablePointsIncrease',
      'availablePointsDeduction',
    ],
  })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  @IsIn(
    [
      'createdAt',
      'updatedAt',
      'date',
      'availablePointsBalance',
      'availablePointsIncrease',
      'availablePointsDeduction',
    ],
    { message: 'Invalid sort field' },
  )
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  @IsIn(['asc', 'desc'], { message: 'Sort order must be either "asc" or "desc"' })
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// PAGINATION & LIST RESPONSE INTERFACES
// ============================================
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PointListResponse {
  points: PointResponseDto[];
  pagination: PaginationMeta;
}

