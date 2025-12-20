import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreateRecipeDto {
  @ApiProperty({
    description: 'Recipe title',
    example: 'Delicious Homemade Pasta Recipe',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'Title is required' })
  @IsString({ message: 'Title must be a string' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title!: string;

  @ApiProperty({
    description: 'Recipe category',
    example: 'Italian',
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'Category is required' })
  @IsString({ message: 'Category must be a string' })
  @MaxLength(50, { message: 'Category must not exceed 50 characters' })
  category!: string;

  @ApiPropertyOptional({
    description: 'Recipe thumbnail URL',
    example: 'https://example.com/images/pasta.jpg',
  })
  @IsOptional()
  @IsString({ message: 'Thumbnail URL must be a string' })
  thumbnailUrl?: string;

  @ApiProperty({
    description: 'Recipe content (detailed instructions and ingredients)',
    example: 'This is the full recipe content with ingredients and instructions...',
  })
  @IsNotEmpty({ message: 'Content is required' })
  @IsString({ message: 'Content must be a string' })
  content!: string;

  @ApiProperty({
    description: 'Recipe ingredients',
    example: ['Pasta', 'Tomato', 'Garlic', 'Cheese'],
  })
  @IsNotEmpty({ message: 'Ingredients are required' })
  @IsArray({ message: 'Ingredients must be an array' })
  @IsString({ each: true, message: 'Ingredients must be a string' })
  ingredients!: string[];
}
