import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { EPolicyStatus } from '../enums/policy.enum';

export class CreatePolicyDto {
  @ApiProperty({
    description: 'Payment information policy content',
    example: 'Payment by card/bank transfer...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  paymentInformation!: string;

  @ApiProperty({
    description: 'Delivery information policy content',
    example: 'Delivery takes 2-3 days...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  deliveryInformation!: string;

  @ApiProperty({
    description: 'Exchange/return information policy content',
    example: 'Exchange within 7 days...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  exchangeInformation!: string;
}
