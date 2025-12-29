import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Product category number (unique identifier)',
    example: 'CAT001',
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'Product category number is required' })
  @IsString({ message: 'Product category number must be a string' })
  @MinLength(1, { message: 'Product category number must not be empty' })
  @MaxLength(50, { message: 'Product category number must not exceed 50 characters' })
  productCategoryNumber!: string;

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
