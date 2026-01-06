import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

/**
 * DTO for creating a new product inquiry answer
 */
export class CreateProductInquiryAnswerDto {
  @ApiProperty({
    description: 'Answer content text',
    example: 'Yes, this product is 100% vegetarian and certified organic.',
    maxLength: 2000,
  })
  @IsString({ message: 'Answer must be a string' })
  @IsNotEmpty({ message: 'Answer content is required' })
  @MaxLength(2000, { message: 'Answer cannot exceed 2000 characters' })
  answer!: string;
}

