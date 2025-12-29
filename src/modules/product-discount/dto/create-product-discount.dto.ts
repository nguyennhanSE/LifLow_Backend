import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, Min, Max, IsOptional, IsBoolean, IsDate, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDiscountDto {
  @ApiProperty({ description: 'Product ID', example: 'uuid-string' })
  @IsNotEmpty({ message: 'Product ID is required' })
  @IsString()
  @IsUUID()
  productId!: string;

  @ApiProperty({ description: 'Discount rate (percentage)', example: 10, minimum: 0, maximum: 100 })
  @IsNotEmpty({ message: 'Discount rate is required' })
  @Type(() => Number)
  @IsInt({ message: 'Discount rate must be an integer' })
  @Min(0, { message: 'Discount rate must be at least 0' })
  @Max(100, { message: 'Discount rate must not exceed 100' })
  discountRate!: number;

  @ApiPropertyOptional({ description: 'Status', example: true, default: false })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ description: 'Discount start date', example: '2025-01-01T00:00:00Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  discountStartDate?: Date;

  @ApiPropertyOptional({ description: 'Discount end date', example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  discountEndDate?: Date;
}
