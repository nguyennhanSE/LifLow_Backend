import { ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementType } from '@prisma/client';
import { Type, Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO for querying/filtering announcements with pagination.
 */
export class QueryAnnouncementDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by announcement type',
    enum: AnnouncementType,
    example: AnnouncementType.RECIPE,
  })
  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'active',
    default: 'active',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString({ message: 'Status must be a string' })
  status?: string;

  @ApiPropertyOptional({
    description: 'Search in title/content (case-insensitive)',
    example: 'update',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Search must be a string' })
  search?: string;
}


