import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateRecipeCommentDto {
  @ApiProperty({
    description: 'Recipe ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'Recipe ID is required' })
  @IsUUID('4', { message: 'Recipe ID must be a valid UUID' })
  recipeId!: string;

  @ApiProperty({
    description: 'Author ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'Author ID is required' })
  @IsUUID('4', { message: 'Author ID must be a valid UUID' })
  authorId!: string;

  @ApiProperty({
    description: 'Comment content',
    example: 'This recipe looks amazing! I will definitely try it.',
    minLength: 1,
    maxLength: 1000,
  })
  @IsNotEmpty({ message: 'Content is required' })
  @IsString({ message: 'Content must be a string' })
  @MinLength(1, { message: 'Content must be at least 1 character long' })
  @MaxLength(1000, { message: 'Content must not exceed 1000 characters' })
  content!: string;
}

