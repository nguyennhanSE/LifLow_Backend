import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { CreateProductInquiryAnswerDto } from './create-product-inquiry-answer.dto';

/**
 * DTO for updating a product inquiry answer
 * All fields are optional as this extends PartialType
 */
export class UpdateProductInquiryAnswerDto extends PartialType(CreateProductInquiryAnswerDto) {
  @ApiPropertyOptional({
    description: 'Answer content text',
    example: 'Updated answer content',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Answer must be a string' })
  @MaxLength(2000, { message: 'Answer cannot exceed 2000 characters' })
  answer?: string;
}

