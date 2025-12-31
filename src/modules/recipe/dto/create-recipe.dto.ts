import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsOptional,
  IsArray,
} from 'class-validator';
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
    description: 'Recipe ingredients',
    example: ['Pasta', 'Tomato', 'Garlic', 'Cheese'],
  })
  @IsOptional()
  @IsArray({ message: 'Ingredients must be an array' })
  @IsString({ each: true, message: 'Each ingredient must be a string' })
  ingredients?: string[];
  
  // Additional optional fields can be added here as needed
  [key: string]: any;
}
