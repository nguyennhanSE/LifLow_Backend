import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateCartDto } from './create-cart.dto';
import { ECartStatus } from '../enums/cart.enum';

/**
 * DTO for updating a cart
 */
export class UpdateCartDto extends PartialType(CreateCartDto) {
  @ApiPropertyOptional({
    description: 'Cart status',
    enum: ECartStatus,
    example: ECartStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ECartStatus, { message: 'Status must be either ACTIVE or CHECKED_OUT' })
  status?: ECartStatus;
}
