import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ERecipeCategory } from '../enums/recipe.enum';

export class CreateRecipeDto {
  @ApiPropertyOptional({
    description: 'Recipe title',
    example: 'Delicious Homemade Pasta Recipe',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Recipe category',
    example: 'Italian',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Category must be a string' })
  @MaxLength(50, { message: 'Category must not exceed 50 characters' })
  category?: ERecipeCategory;

  @ApiPropertyOptional({
    description: 'Recipe content (detailed instructions and ingredients)',
    example: 'This is the full recipe content with ingredients and instructions...',
  })
  @IsOptional()
  @IsString({ message: 'Content must be a string' })
  content?: string;

  @ApiPropertyOptional({
    description: 'Recipe ingredients (can be a string or array of strings)',
    example: ['Pasta', 'Tomato', 'Garlic', 'Cheese'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) {
      return value;
    }
    // If already an array, return as is
    if (Array.isArray(value)) {
      return value;
    }
    // If it's a string, try to parse as JSON first
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Not valid JSON, treat as single string value
      }
      // Convert single string to array
      return [value];
    }
    // For numbers or other types, convert to string and wrap in array
    return [String(value)];
  })
  @IsArray({ message: 'Ingredients must be an array' })
  @IsString({ each: true, message: 'Each ingredient must be a string' })
  ingredients?: string[];
  
  // Additional optional fields can be added here as needed
  [key: string]: any;

  @ApiPropertyOptional({
    description: 'Product ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  productId?: string;


  @ApiPropertyOptional({
    description: 'Author ID',
    example: 'liflowadmin',
  })
  @IsOptional()
  @IsString({ message: 'Author ID must be a string' })
  authorId?: string;
}
