import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, MaxLength, IsOptional } from 'class-validator';

/**
 * DTO for creating a new product inquiry
 */
export class CreateProductInquiryDto {
  @ApiProperty({
    description: 'Product ID that this inquiry is about',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId!: string;

  @ApiProperty({
    description: 'User ID of the inquiry author',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString({ message: 'Author ID must be a string' })
  @IsOptional({ message: 'Author ID is required' })
  authorId?: string;

  @ApiProperty({
    description: 'Inquiry title',
    example: 'Question about product ingredients',
    maxLength: 200,
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title!: string;

  @ApiProperty({
    description: 'Inquiry content text',
    example: 'Is this product suitable for vegetarians?',
    maxLength: 2000,
  })
  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Content is required' })
  @MaxLength(2000, { message: 'Content cannot exceed 2000 characters' })
  content!: string;
}
