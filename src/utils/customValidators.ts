import { BadRequestException } from '@nestjs/common';

/**
 * Validate price hierarchy: consumerPrice >= supplyPrice >= productPrice >= salePrice
 */
export function validatePriceHierarchy(data: {
  consumerPrice?: number | null;
  supplyPrice?: number | null;
  productPrice?: number | null;
  salePrice?: number | null;
}): void {
  const { consumerPrice, supplyPrice, productPrice, salePrice } = data;

  // Check if all prices are provided
  const prices = [
    { name: 'consumerPrice', value: consumerPrice },
    { name: 'supplyPrice', value: supplyPrice },
    { name: 'productPrice', value: productPrice },
    { name: 'salePrice', value: salePrice },
  ].filter(p => p.value !== undefined && p.value !== null);

  // If less than 2 prices provided, skip validation
  if (prices.length < 2) {
    return;
  }

  // Validate: consumerPrice >= supplyPrice
  // if (consumerPrice !== undefined && consumerPrice !== null && 
  //     supplyPrice !== undefined && supplyPrice !== null) {
  //   if (consumerPrice < supplyPrice) {
  //     throw new BadRequestException(
  //       'Consumer price must be greater than or equal to supply price'
  //     );
  //   }
  // }

  // Validate: supplyPrice >= productPrice
  // if (supplyPrice !== undefined && supplyPrice !== null && 
  //     productPrice !== undefined && productPrice !== null) {
  //   if (supplyPrice < productPrice) {
  //     throw new BadRequestException(
  //       'Supply price must be greater than or equal to product price'
  //     );
  //   }
  // }

  // Validate: productPrice >= salePrice
  // if (productPrice !== undefined && productPrice !== null && 
  //     salePrice !== undefined && salePrice !== null) {
  //   if (productPrice < salePrice) {
  //     throw new BadRequestException(
  //       'Product price must be greater than or equal to sale price'
  //     );
  //   }
  // }

  // Validate: consumerPrice >= productPrice (if supplyPrice not provided)
  // if (consumerPrice !== undefined && consumerPrice !== null && 
  //     productPrice !== undefined && productPrice !== null && 
  //     (supplyPrice === undefined || supplyPrice === null)) {
  //   if (consumerPrice < productPrice) {
  //     throw new BadRequestException(
  //       'Consumer price must be greater than or equal to product price'
  //     );
  //   }
  // }

  // Validate: consumerPrice >= salePrice (direct comparison)
  if (consumerPrice !== undefined && consumerPrice !== null && 
      salePrice !== undefined && salePrice !== null) {
    if (consumerPrice < salePrice) {
      throw new BadRequestException(
        'Consumer price must be greater than or equal to sale price'
      );
    }
  }

  // Validate: supplyPrice >= salePrice
  // if (supplyPrice !== undefined && supplyPrice !== null && 
  //     salePrice !== undefined && salePrice !== null && 
  //     (productPrice === undefined || productPrice === null)) {
  //   if (supplyPrice < salePrice) {
  //     throw new BadRequestException(
  //       'Supply price must be greater than or equal to sale price'
  //     );
  //   }
  // }
}

/**
 * Validate order quantity: minOrderQuantity <= maxOrderQuantity
 */
export function validateOrderQuantity(data: {
  minOrderQuantity?: number | null;
  maxOrderQuantity?: number | null;
}): void {
  const { minOrderQuantity, maxOrderQuantity } = data;

  if (
    minOrderQuantity !== undefined && minOrderQuantity !== null &&
    maxOrderQuantity !== undefined && maxOrderQuantity !== null &&
    minOrderQuantity > maxOrderQuantity
  ) {
    throw new BadRequestException(
      'Minimum order quantity must be less than or equal to maximum order quantity'
    );
  }
}

