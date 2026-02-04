import { ProductDiscountEntity } from "src/modules/product-discount/entities/product-discount.entity";
import { BannerEntity } from "src/modules/banner/entities/banner.entity";
import { ProductBadgeResponseDto } from "src/modules/product-badges/dto/product-badge-response.dto";

export class ProductEntity {
  id!: string;
  productCode?: string | null;
  ownProductCode?: string | null;
  displayStatus?: string | null;
  saleStatus?: string | null;
  productCategoryNumber?: number | null;
  productCategoryNewProductArea?: string | null;
  productCategoryRecommendedProductArea?: string | null;
  productName?: string | null;
  englishProductName?: string | null;
  productNameForManagement?: string | null;
  supplierProductName?: string | null;
  modelName?: string | null;
  productSummaryDescription?: string | null;
  productBriefDescription?: string | null;
  searchKeywordSetting?: string | null;
  taxClassification?: string | null;
  consumerPrice?: number | null;
  supplyPrice?: number | null;
  productPrice?: number | null;
  salePrice?: number | null;
  useSalePriceAlternativeText?: string | null;
  salePriceAlternativeText?: string | null;
  orderQuantityLimitCriteria?: string | null;
  minOrderQuantity?: number | null;
  maxOrderQuantity?: number | null;
  rewardPoints?: number | null;
  rewardPointsClassification?: string | null;
  commonEventInfo?: string | null;
  adultVerification?: string | null;
  optionUsage?: string | null;
  itemCompositionMethod?: string | null;
  optionDisplayMethod?: string | null;
  optionSetName?: string | null;
  optionInput?: string | null;
  optionStyle?: string | null;
  buttonImageSetting?: string | null;
  colorSetting?: string | null;
  requiredOrNot?: string | null;
  outOfStockDisplayText?: string | null;
  additionalInputOption?: string | null;
  additionalInputOptionName?: string | null;
  additionalInputOptionRequiredOrNot?: string | null;
  inputCharacterCount?: string | null;
  imageRegistrationDetail?: string | null;
  imageRegistrationList?: string | null;
  imageRegistrationSmallList?: string | null;
  imageRegistrationThumbnail?: string | null;
  manufacturer?: string | null;
  supplier?: string | null;
  brand?: string | null;
  trend?: string | null;
  ownClassificationCode?: string | null;
  manufacturingDate?: string | null;
  releaseDate?: string | null;
  validityPeriodUsage?: string | null;
  validityPeriod?: string | null;
  origin?: number | null;
  productVolume?: string | null;
  volumeWeight?: string | null;
  productPaymentGuide?: string | null;
  productDeliveryGuide?: string | null;
  exchangeReturnGuide?: string | null;
  serviceInquiryGuide?: string | null;
  deliveryInfo?: string | null;
  deliveryMethod?: string | null;
  domesticOverseasDelivery?: string | null;
  deliveryArea?: string | null;
  deliveryFeePrepaymentSetting?: string | null;
  deliveryPeriod?: string | null;
  deliveryFeeClassification?: string | null;
  deliveryFeeInput?: string | null;
  productClassificationCustoms?: string | null;
  productMaterial?: string | null;
  englishProductMaterialCustoms?: string | null;
  fabricCustoms?: string | null;
  seoSearchEngineExposureSetting?: string | null;
  seoTitle?: string | null;
  seoAuthor?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  seoProductImageAltText?: string | null;
  individualPaymentMethodSetting?: string | null;
  productDeliveryTypeCode?: string | null;
  storePickupSetting?: string | null;
  productTotalWeight?: number | null;
  hsCode?: string | null;
  additionalItem01TodayDepartureDeliveryUsage?: string | null;
  additionalItem02TodayDepartureDeliveryTime?: string | null;
  additionalItem03StorageMethod?: string | null;
  additionalItem04Origin?: string | null;
  additionalItem05Event?: string | null;
  additionalItem06ParcelDelivery?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  // extension
  isSoldOut?: boolean | null;
  stockQuantity?: number | null;
  storageMethod?: string | null;
  additionalImages?: string[] | null;
  ctaButtonUrl?: string | null;

  // relation
  productSpecialOffer?: ProductSpecialOfferEntity | null;
  productDiscount?: ProductDiscountEntity | null;
  banner?: BannerEntity[] | null;
  productBadges?: ProductBadgeResponseDto | null;
  productReviews?: ProductReviewsEntityList | null;
  category?: {
    productCategoryNumber: number;
    name: string;
    description?: string | null;
  } | null;
}


export type ProductSpecialOfferEntity = {
  id: string;
  status: boolean;
  discountAmount: number;
  specialPriceApplied: number;
  startDate?: Date | null;
  endDate?: Date | null;
}

export type ProductReviewsEntity = {
    id: string;
    productId: string;
    authorId: string;
    review: string;
    rating: number;
    imageUrl: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}

export type ProductReviewsEntityList = {
  data: ProductReviewsEntity[];
  averageRating: number;
  total: number;
}