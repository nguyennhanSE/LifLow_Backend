import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateProductInquiryDto } from './create-product-inquiry.dto';

/**
 * DTO for updating a product inquiry
 * All fields are optional as this extends PartialType
 */
export class UpdateProductInquiryDto extends PartialType(CreateProductInquiryDto) {
  @ApiPropertyOptional({
    description: 'Inquiry title',
    example: 'Updated inquiry title',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Inquiry content text',
    example: 'Updated inquiry content',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Content must be a string' })
  @MaxLength(2000, { message: 'Content cannot exceed 2000 characters' })
  content?: string;

  @ApiPropertyOptional({
    description: 'Inquiry status',
    example: 'completed',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString({ message: 'Status must be a string' })
  status?: string;
}
