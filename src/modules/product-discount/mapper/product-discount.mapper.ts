import { ProductDiscount } from '@prisma/client';
import { ProductDiscountEntity } from '../entities/product-discount.entity';

export function toProductDiscountEntity(productDiscount: ProductDiscount): ProductDiscountEntity {
  return {
    id: productDiscount.id,
    status: productDiscount.status,
    productId: productDiscount.productId,
    discountRate: productDiscount.discountRate,
    discountStartDate: productDiscount.discountStartDate ?? undefined,
    discountEndDate: productDiscount.discountEndDate ?? undefined,
    createdAt: productDiscount.createdAt,
    updatedAt: productDiscount.updatedAt,
  };
}

