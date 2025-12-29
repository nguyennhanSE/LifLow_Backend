import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { CategoryType } from '@prisma/client';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional({
    description: 'Category name',
    example: 'Oils & Condiments',
    maxLength: 50,
  })
  @IsString({ message: 'Category name must be a string' })
  @MinLength(1, { message: 'Category name must not be empty' })
  @MaxLength(50, { message: 'Category name must not exceed 50 characters' })
  name?: CategoryType;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Premium oils, vinegars, and condiments for your kitchen',
  })
  @IsString({ message: 'Description must be a string' })
  description?: string | null;
}
