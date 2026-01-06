import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { CreateProductReviewDto } from './create-product-review.dto';

/**
 * DTO for updating a product review
 * All fields are optional as this extends PartialType
 */
export class UpdateProductReviewDto extends PartialType(CreateProductReviewDto) {
  @ApiPropertyOptional({
    description: 'Review content text',
    example: 'Updated review content',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Review must be a string' })
  @MaxLength(2000, { message: 'Review cannot exceed 2000 characters' })
  review?: string;

  @ApiPropertyOptional({
    description: 'Rating value (1.0 to 5.0)',
    example: 4.5,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Rating must be a number' })
  @Min(1, { message: 'Rating must be at least 1.0' })
  @Max(5, { message: 'Rating cannot exceed 5.0' })
  rating?: number;
}
