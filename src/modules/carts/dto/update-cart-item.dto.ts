import { PartialType } from '@nestjs/swagger';
import { CreateCartItemDto } from './create-cart-item.dto';

/**
 * DTO for updating a cart item
 * All fields from CreateCartItemDto are optional
 */
export class UpdateCartItemDto extends PartialType(CreateCartItemDto) {}

