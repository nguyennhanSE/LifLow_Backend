import { PartialType } from '@nestjs/swagger';
import { CreateProductBadgeDto } from './create-product-badge.dto';

export class UpdateProductBadgeDto extends PartialType(CreateProductBadgeDto) {}
