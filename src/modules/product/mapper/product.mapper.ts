import { Product, Prisma, ProductSpecialOffer, Banner, productBadges } from "@prisma/client";
import { ProductEntity, ProductSpecialOfferEntity } from "../entities/product.entity";
import { BannerMapper } from "src/modules/banner/mappers/banner.mapper";
import { ProductBadgeMapper } from "src/modules/product-badges/mappers/product-badge.mapper";

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: { 
    productSpecialOffer: true,
    productDiscount: true,
    banner: true,
    productBadges: true
  }
}>


function toProductSpecialOfferEntity(productSpecialOffer: ProductSpecialOffer): ProductSpecialOfferEntity {
  return {
    id: productSpecialOffer.id,
    status: productSpecialOffer.status,
    discountAmount: productSpecialOffer.discountAmount,
    specialPriceApplied: productSpecialOffer.specialPriceApplied ? Number(productSpecialOffer.specialPriceApplied) : 0,
    startDate: productSpecialOffer.startDate ?? null,
    endDate: productSpecialOffer.endDate ?? null,
  };
}

export function toProductEntitySummary(product: ProductEntity): any {
    return {
        id: product.id,
        productName: product.productName,
        productCode: product.productCode,
        productPrice: product.productPrice,
        salePrice: product.salePrice,
        consumerPrice: product.consumerPrice,
        supplyPrice: product.supplyPrice,
        modelName: product.modelName
    }
}

export function toProductEntity(product: Product): ProductEntity {
  return {
    id: product.id,
    productCode: product.productCode,
    ownProductCode: product.ownProductCode,
    displayStatus: product.displayStatus,
    saleStatus: product.saleStatus,
    productCategoryNumber: product.productCategoryNumber ?? null,
    productCategoryNewProductArea: product.productCategoryNewProductArea,
    productCategoryRecommendedProductArea: product.productCategoryRecommendedProductArea,
    productName: product.productName,
    englishProductName: product.englishProductName,
    productNameForManagement: product.productNameForManagement,
    supplierProductName: product.supplierProductName,
    modelName: product.modelName,
    productSummaryDescription: product.productSummaryDescription,
    productBriefDescription: product.productBriefDescription,
    searchKeywordSetting: product.searchKeywordSetting,
    taxClassification: product.taxClassification,
    consumerPrice: product.consumerPrice,
    supplyPrice: product.supplyPrice,
    productPrice: product.productPrice,
    salePrice: product.salePrice,
    useSalePriceAlternativeText: product.useSalePriceAlternativeText,
    salePriceAlternativeText: product.salePriceAlternativeText,
    orderQuantityLimitCriteria: product.orderQuantityLimitCriteria,
    minOrderQuantity: product.minOrderQuantity,
    maxOrderQuantity: product.maxOrderQuantity,
    rewardPoints: product.rewardPoints,
    rewardPointsClassification: product.rewardPointsClassification,
    commonEventInfo: product.commonEventInfo,
    adultVerification: product.adultVerification,
    optionUsage: product.optionUsage,
    itemCompositionMethod: product.itemCompositionMethod,
    optionDisplayMethod: product.optionDisplayMethod,
    optionSetName: product.optionSetName,
    optionInput: product.optionInput,
    optionStyle: product.optionStyle,
    buttonImageSetting: product.buttonImageSetting,
    colorSetting: product.colorSetting,
    requiredOrNot: product.requiredOrNot,
    outOfStockDisplayText: product.outOfStockDisplayText,
    additionalInputOption: product.additionalInputOption,
    additionalInputOptionName: product.additionalInputOptionName,
    additionalInputOptionRequiredOrNot: product.additionalInputOptionRequiredOrNot,
    inputCharacterCount: product.inputCharacterCount,
    imageRegistrationDetail: product.imageRegistrationDetail,
    imageRegistrationList: product.imageRegistrationList,
    imageRegistrationSmallList: product.imageRegistrationSmallList,
    imageRegistrationThumbnail: product.imageRegistrationThumbnail,
    manufacturer: product.manufacturer,
    supplier: product.supplier,
    brand: product.brand,
    trend: product.trend,
    ownClassificationCode: product.ownClassificationCode,
    manufacturingDate: product.manufacturingDate,
    releaseDate: product.releaseDate,
    validityPeriodUsage: product.validityPeriodUsage,
    validityPeriod: product.validityPeriod,
    origin: product.origin,
    productVolume: product.productVolume,
    volumeWeight: product.volumeWeight,
    productPaymentGuide: product.productPaymentGuide,
    productDeliveryGuide: product.productDeliveryGuide,
    exchangeReturnGuide: product.exchangeReturnGuide,
    serviceInquiryGuide: product.serviceInquiryGuide,
    deliveryInfo: product.deliveryInfo,
    deliveryMethod: product.deliveryMethod,
    domesticOverseasDelivery: product.domesticOverseasDelivery,
    deliveryArea: product.deliveryArea,
    deliveryFeePrepaymentSetting: product.deliveryFeePrepaymentSetting,
    deliveryPeriod: product.deliveryPeriod,
    deliveryFeeClassification: product.deliveryFeeClassification,
    deliveryFeeInput: product.deliveryFeeInput,
    productClassificationCustoms: product.productClassificationCustoms,
    productMaterial: product.productMaterial,
    englishProductMaterialCustoms: product.englishProductMaterialCustoms,
    fabricCustoms: product.fabricCustoms,
    seoSearchEngineExposureSetting: product.seoSearchEngineExposureSetting,
    seoTitle: product.seoTitle,
    seoAuthor: product.seoAuthor,
    seoDescription: product.seoDescription,
    seoKeywords: product.seoKeywords,
    seoProductImageAltText: product.seoProductImageAltText,
    individualPaymentMethodSetting: product.individualPaymentMethodSetting,
    productDeliveryTypeCode: product.productDeliveryTypeCode,
    storePickupSetting: product.storePickupSetting,
    productTotalWeight: product.productTotalWeight,
    hsCode: product.hsCode ? String(product.hsCode) : null,
    additionalItem01TodayDepartureDeliveryUsage: product.additionalItem01TodayDepartureDeliveryUsage,
    additionalItem02TodayDepartureDeliveryTime: product.additionalItem02TodayDepartureDeliveryTime,
    additionalItem03StorageMethod: product.additionalItem03StorageMethod,
    additionalItem04Origin: product.additionalItem04Origin,
    additionalItem05Event: product.additionalItem05Event,
    additionalItem06ParcelDelivery: product.additionalItem06ParcelDelivery,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    // extension
    stockQuantity: product.stockQuantity,
    storageMethod: product.storageMethod,
    additionalImages: product.additionalImages,
    ctaButtonUrl: product.ctaButtonUrl,
  };
}

export function toProductEntityWithRelations(product: ProductWithRelations): ProductEntity {
  return {
    ...toProductEntity(product),
    productSpecialOffer: product.productSpecialOffer ? toProductSpecialOfferEntity(product.productSpecialOffer) : null,
    productDiscount: product.productDiscount ? {
      id: product.productDiscount.id,
      status: product.productDiscount.status,
      productId: product.productDiscount.productId,
      discountRate: product.productDiscount.discountRate,
      discountStartDate: product.productDiscount.discountStartDate,
      discountEndDate: product.productDiscount.discountEndDate,
      createdAt: product.productDiscount.createdAt,
      updatedAt: product.productDiscount.updatedAt,
    } : null,
    banner: product.banner ? product.banner.map((banner: Banner) => BannerMapper.toEntity(banner)) : null,
    productBadges: product.productBadges && product.productBadges.length > 0 
      ? ProductBadgeMapper.toResponseDto(product.productBadges[0]) 
      : null,
  }
}