import { Expose, Type } from 'class-transformer';
import { EBannerType, EBannerStatus } from '../enums/banner.enum';
import { ProductEntity } from '../../product/entities/product.entity';

export class BannerEntity {
  @Expose()
  id!: string;

  @Expose()
  type!: EBannerType;

  @Expose()
  status!: EBannerStatus;

  @Expose()
  productId?: string | null;

  @Expose()
  title?: string | null;

  @Expose()
  badgeText?: string | null;

  @Expose()
  mainText?: string | null;

  @Expose()
  ctaButtonText?: string | null;

  @Expose()
  ctaButtonUrl?: string | null;

  @Expose()
  imageUrl!: string;

  @Expose()
  mobileImageUrl?: string | null;

  @Expose()
  displayOrder?: number | null;

  @Expose()
  startDate?: Date | null;

  @Expose()
  endDate?: Date | null;

  @Expose()
  productName?: string | null;

  @Expose()
  productPrice?: number | null;

  @Expose()
  productBrand?: string | null;

  @Expose()
  productExplanation?: string | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  // Relations
  @Expose()
  @Type(() => ProductEntity)
  product?: ProductEntity | null;
}
