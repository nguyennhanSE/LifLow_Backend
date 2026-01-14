import { ProductEntity } from '../../product/entities/product.entity';

export class CategoryEntity {
  productCategoryNumber!: number;
  name!: string;
  description?: string | null;
  createdAt!: Date | null;
  updatedAt!: Date | null;
  // Relations
  products?: ProductEntity[] | null;
}
