import { Category, Prisma } from '@prisma/client';
import { CategoryEntity } from '../entities/category.entity';
import { toProductEntitySummary } from '../../product/mapper/product.mapper';

type CategoryWithProducts = Prisma.CategoryGetPayload<{
  include: {
    products: true;
  };
}>;

// Helper function to safely convert Date
const safeDate = (date: unknown): Date | null => {
  if (date === null || date === undefined) {
    return null;
  }
  // Check if it's a valid Date instance
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date;
  }
  return null;
};

export function toCategoryEntity(category: Category): CategoryEntity {
  return {
    productCategoryNumber: category.productCategoryNumber,
    name: category.name,
    description: category.description,
    createdAt: safeDate(category.createdAt),
    updatedAt: safeDate(category.updatedAt),
  };
}

export function toCategoryEntityWithProducts(category: CategoryWithProducts): CategoryEntity {
  return {
    ...toCategoryEntity(category),
    products: category.products && category.products.length > 0 
      ? category.products.map(product => {
          // Convert Product to ProductEntity format for toProductEntitySummary
          const productEntity = {
            id: product.id,
            productName: product.productName,
            productCode: product.productCode,
            productPrice: product.productPrice,
            salePrice: product.salePrice,
            consumerPrice: product.consumerPrice,
            supplyPrice: product.supplyPrice,
            modelName: product.modelName,
          };
          return toProductEntitySummary(productEntity);
        })
      : null,
  };
}

