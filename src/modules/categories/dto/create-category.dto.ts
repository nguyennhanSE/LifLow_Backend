import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiPropertyOptional({
    description: 'Product category number (unique identifier, auto-generated if not provided)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Product category number must be an integer' })
  @Min(1, { message: 'Product category number must be at least 1' })
  productCategoryNumber?: number;

  @ApiProperty({
    description: 'Category name',
    example: 'Oils & Condiments',
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'Category name is required' })
  @IsString({ message: 'Category name must be a string' })
  @MinLength(1, { message: 'Category name must not be empty' })
  @MaxLength(50, { message: 'Category name must not exceed 50 characters' })
  name!: CategoryType;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Premium oils, vinegars, and condiments for your kitchen',
  })
  @IsString({ message: 'Description must be a string' })
  description?: string | null;
}
