import { PartialType } from '@nestjs/swagger';
import { CreateProductDiscountDto } from './create-product-discount.dto';

export class UpdateProductDiscountDto extends PartialType(CreateProductDiscountDto) {}
