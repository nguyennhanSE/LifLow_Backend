import { ProductCategoryBannerRelation } from '@prisma/client';

export class CategoryEntity {
  productCategoryNumber!: string;
  name!: string;
  description?: string | null;
  createdAt!: Date | null;
  updatedAt!: Date | null;
  // Relations
  productCategoryBannerRelations?: ProductCategoryBannerRelation[] | null;
}
