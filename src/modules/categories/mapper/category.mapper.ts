import { Category } from '@prisma/client';
import { CategoryEntity } from '../entities/category.entity';

export function toCategoryEntity(category: Category): CategoryEntity {
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

  return {
    productCategoryNumber: category.productCategoryNumber,
    name: category.name,
    description: category.description,
    createdAt: safeDate(category.createdAt),
    updatedAt: safeDate(category.updatedAt),
  };
}

