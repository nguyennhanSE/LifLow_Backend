import { PartialType } from '@nestjs/swagger';
import { CreateCouponDto } from './create-coupon.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCouponDto extends PartialType(CreateCouponDto) {
  @ApiPropertyOptional({
    description: 'All fields from CreateCouponDto are optional for update',
  })
  _description?: string;
}
