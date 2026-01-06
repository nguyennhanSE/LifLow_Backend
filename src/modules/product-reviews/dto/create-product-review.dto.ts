import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsNumber, Min, Max, MaxLength, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new product review
 */
export class CreateProductReviewDto {
  @ApiProperty({
    description: 'Product ID that this review belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId!: string;

  @ApiProperty({
    description: 'User ID of the review author',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsOptional()
  authorId?: string;

  @ApiProperty({
    description: 'Review content text',
    example: 'This product is amazing! Great quality and fast delivery.',
    maxLength: 2000,
  })
  @IsString({ message: 'Review must be a string' })
  @IsNotEmpty({ message: 'Review content is required' })
  @MaxLength(2000, { message: 'Review cannot exceed 2000 characters' })
  review!: string;

  @ApiProperty({
    description: 'Rating value (1.0 to 5.0)',
    example: 4.5,
    minimum: 1,
    maximum: 5,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Rating must be a number' })
  @IsNotEmpty({ message: 'Rating is required' })
  @Min(1, { message: 'Rating must be at least 1.0' })
  @Max(5, { message: 'Rating cannot exceed 5.0' })
  rating!: number;
}
