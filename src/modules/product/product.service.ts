import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ProductRepository, ProductFilters, ProductPagination } from './repositories/product.repository';
import { ProductEntity } from './entities/product.entity';
import { ProductListQueryDto, ProductListResponse, PaginationMeta, CreateProductDto, UpdateProductDto, BulkDeleteProductDto, UpdateProductStatusDto, ProductBulkUpdateStatusDto, ProductStats, CreateProductSpecialOfferDto } from './dto/product.dto';
import { validatePriceHierarchy, validateOrderQuantity } from '../../utils/customValidators';
import { DuplicateError } from '../../utils/customErrors';
import { ProductDiscountService } from '../product-discount/product-discount.service';
import { CreateProductDiscountDto } from '../product-discount/dto/create-product-discount.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { toProductEntity } from './mapper/product.mapper';
import { AwsService } from 'src/libs/integration/aws/aws.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productDiscountService: ProductDiscountService,
    private readonly prisma: PrismaService,
    private readonly awsService: AwsService,
  ) {}

  /**
   * Get products with filtering, pagination, and sorting
   */
  async getProducts(query: ProductListQueryDto): Promise<ProductListResponse> {
    // Process query parameters
    const page = query.page || 1;
    const limit = query.limit || 10;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    // Build filters
    const filters: ProductFilters = {
      search: query.search,
      category: query.category,
      storageMethod: query.storageMethod,
      saleStatus: query.saleStatus,
      displayStatus: query.displayStatus,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
    };

    // Build pagination
    const pagination: ProductPagination = {
      page,
      limit,
      sortBy,
      sortOrder,
      includeProductReview: query.includeProductReview ?? true,
    };

    // Get products and count
    const [products, total] = await Promise.all([
      this.productRepository.findMany(filters, pagination),
      this.productRepository.count(filters),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginationMeta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };

    return {
      products,
      pagination: paginationMeta,
    };
  }

  /**
   * Get single product by ID
   */
  async getProductById(id: string): Promise<ProductEntity> {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return product;
  }

  /**
   * Create a new product
   */
  async createProduct(data: CreateProductDto, imageRegistrationThumbnail?: Express.Multer.File, imageRegistrationDetail?: Express.Multer.File, additionalImages?: Express.Multer.File[]): Promise<ProductEntity> {
    // Validate business rules
    validatePriceHierarchy(data);
    // validateOrderQuantity(data);

    // Check for duplicate productCode
    if (data.productCode) {
      const exists = await this.productRepository.existsByProductCode(data.productCode);
      if (exists) {
        throw new DuplicateError(`Product with code ${data.productCode} already exists`);
      }
    }

    // Extract discount data, productBadges, and specialOffer from product data
    const {
      hsCode,
      category,
      discountRate,
      discountStartDate,
      discountEndDate,
      productBadges,
      specialOffer,
      ...productData
    } = data;
    const hasDiscountData = discountRate !== undefined && discountRate !== null && discountRate !== 0;
    const hasProductBadgesData = productBadges !== undefined && productBadges !== null;
    const hasSpecialOfferData = specialOffer !== undefined && specialOffer !== null;

    // Debug logging
    if (hasProductBadgesData) {
      console.log('ProductBadges data received:', JSON.stringify(productBadges));
    }

    // Use transaction to create product and discount atomically
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Prepare product data
        const createProductData: Prisma.ProductCreateInput = productData as Prisma.ProductCreateInput;
        createProductData.displayStatus = 'Y';
        if (hsCode !== undefined) {
          createProductData.hsCode = hsCode !== null ? BigInt(String(hsCode)) : null;
        }

        // Add category to create data if provided
        if (category !== undefined) {
          createProductData.productCategoryNumber = category;
        }

        // Create product
        const product = await tx.product.create({
          data: createProductData,
        });

        // Create discount if discount data is provided
        if (hasDiscountData && discountRate !== undefined && discountRate !== null) {
          // Check if discountStartDate is in the future, if so set status to false
          const today = new Date(); // Use current time when request hits server
          const shouldBeActive = discountStartDate 
            ? new Date(discountStartDate) <= today 
            : true; // If no startDate, default to active
          
          await tx.productDiscount.create({
            data: {
              productId: product.id,
              discountRate: discountRate,
              status: shouldBeActive,
              discountStartDate: discountStartDate ?? null,
              discountEndDate: discountEndDate ?? null,
            },
          });
        }

        // Create product badges if productBadges data is provided
        if (hasProductBadgesData && productBadges) {
          // Check if at least one badge field is set
          const hasAnyBadgeField = 
            productBadges.isHotDeal !== undefined ||
            productBadges.isNewProduct !== undefined ||
            productBadges.isBestSeller !== undefined;

          console.log('hasAnyBadgeField:', hasAnyBadgeField, 'productBadges:', JSON.stringify(productBadges));

          if (hasAnyBadgeField) {
            // Check if badge already exists for the product
            const existingBadge = await tx.productBadges.findFirst({
              where: { productId: product.id },
            });

            if (existingBadge) {
              // Update existing badge
              const updatedBadge = await tx.productBadges.update({
                where: { id: existingBadge.id },
                data: {
                  isHotDeal: productBadges.isHotDeal ?? false,
                  isNewProduct: productBadges.isNewProduct ?? false,
                  isBestSeller: productBadges.isBestSeller ?? false,
                },
              });
              console.log('Updated productBadges:', updatedBadge.id);
            } else {
              // Create new badge
              const createdBadge = await tx.productBadges.create({
                data: {
                  productId: product.id,
                  isHotDeal: productBadges.isHotDeal ?? false,
                  isNewProduct: productBadges.isNewProduct ?? false,
                  isBestSeller: productBadges.isBestSeller ?? false,
                },
              });
              console.log('Created productBadges:', createdBadge.id);
            }
          } else {
            console.log('No badge fields set, skipping productBadges creation');
          }
        } else {
          console.log('No productBadges data provided');
        }

        // Create product special offer if specialOffer data is provided
        if (hasSpecialOfferData && specialOffer) {
          // Check if special offer already exists for the product
          const existingSpecialOffer = await tx.productSpecialOffer.findUnique({
            where: { productId: product.id },
          });

          // Check if startDate is in the future, if so set status to false
          const today = new Date(); // Use current time when request hits server
          const shouldBeActive = specialOffer.startDate 
            ? new Date(specialOffer.startDate) <= today 
            : (specialOffer.status ?? false); // If no startDate, use provided status or default to false

          if (existingSpecialOffer) {
            // Update existing special offer
            await tx.productSpecialOffer.update({
              where: { productId: product.id },
              data: {
                status: shouldBeActive,
                discountAmount: specialOffer.discountAmount ?? 0,
                specialPriceApplied: specialOffer.specialPriceApplied ?? null,
                startDate: specialOffer.startDate ?? null,
                endDate: specialOffer.endDate ?? null,
              },
            });
          } else {
            // Create new special offer
            await tx.productSpecialOffer.create({
              data: {
                productId: product.id,
                status: shouldBeActive,
                discountAmount: specialOffer.discountAmount ?? 0,
                specialPriceApplied: specialOffer.specialPriceApplied ?? null,
                startDate: specialOffer.startDate ?? null,
                endDate: specialOffer.endDate ?? null,
              },
            });
          }

          // Update product salePrice to specialPriceApplied if provided and status is true
          if (shouldBeActive && specialOffer.specialPriceApplied !== undefined && specialOffer.specialPriceApplied !== null) {
            await tx.product.update({
              where: { id: product.id },
              data: { salePrice: specialOffer.specialPriceApplied },
            });
          }
        }
        // Upload image registration thumbnail
        if (imageRegistrationThumbnail) {
          const imageRegistrationThumbnailUrl = await this.awsService.uploadFile('products', product.id, imageRegistrationThumbnail);
          try {
            await tx.product.update({
              where: { id: product.id },
              data: { imageRegistrationThumbnail: imageRegistrationThumbnailUrl },
            });
          } catch (error) {
            throw new BadRequestException(`Failed to upload image registration thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        // Upload image registration detail
        if (imageRegistrationDetail) {
          const imageRegistrationDetailUrl = await this.awsService.uploadFile('products', product.id, imageRegistrationDetail);
          try {
            await tx.product.update({
              where: { id: product.id },
              data: { imageRegistrationDetail: imageRegistrationDetailUrl },
            });
          } catch (error) {
            throw new BadRequestException(`Failed to upload image registration detail: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        // Upload additional images
        if (additionalImages && additionalImages.length > 0) {
          try {
            const additionalImagesUrls: string[] = [];
            const prefix: string = `products/${product.id}/additional`;
            for (const image of additionalImages) {
              if (!image) continue;
              const url = await this.awsService.uploadFile(prefix, product.id, image);
              additionalImagesUrls.push(url!);
            }
            await tx.product.update({
              where: { id: product.id },
              data: { additionalImages: additionalImagesUrls },
            });
          } catch (error) {
            throw new BadRequestException(
              `Failed to upload additional images: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }
        return product;
        
      },
      {
        maxWait: 60000, // max time to wait to acquire a transaction (60 seconds)
        timeout: 30000, // max time the interactive transaction can run before being canceled (30 seconds)
      },
    );

      // Return product entity
      return toProductEntity(result);
    } catch (error: any) {
      // Handle Prisma unique constraint violation
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        if (field === 'productId') {
          throw new DuplicateError(`Product discount for this product already exists`);
        }
        throw new DuplicateError(`Product with this ${field} already exists`);
      }
      // Handle foreign key constraint violation
      if (error.code === 'P2003') {
        throw new NotFoundException(`Related record not found`);
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(
    id: string,
    data: UpdateProductDto,
    imageRegistrationThumbnail?: Express.Multer.File,
    imageRegistrationDetail?: Express.Multer.File,
    additionalImages?: Express.Multer.File[],
  ): Promise<ProductEntity> {
    // Check if product exists
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    // Merge existing data with updates for validation
    const mergedData = {
      ...existingProduct,
      ...data,
    };

    // Validate business rules with merged data
    validatePriceHierarchy(mergedData);
    validateOrderQuantity(mergedData);

    // Check for duplicate productCode (excluding current product)
    if (data.productCode && data.productCode !== existingProduct.productCode) {
      const exists = await this.productRepository.existsByProductCode(data.productCode, id);
      if (exists) {
        throw new DuplicateError(`Product with code ${data.productCode} already exists`);
      }
    }

    // Extract discount data, productBadges, and specialOffer from product data
    const {
      hsCode,
      category,
      discountRate,
      discountStartDate,
      discountEndDate,
      productBadges,
      specialOffer: _specialOffer,
      ...productData
    } = data;
    const hasDiscountData = discountRate !== undefined && discountRate !== null;
    const hasProductBadgesData = productBadges !== undefined && productBadges !== null;

    // Use transaction to update product, discount, and images atomically
    try {
      console.log('updateProduct data received:', data);
      const result = await this.prisma.$transaction(async (tx) => {
        // Prepare product data
        const updateProductData: Prisma.ProductUpdateInput = productData as Prisma.ProductUpdateInput;
        if (hsCode !== undefined) {
          updateProductData.hsCode = hsCode !== null ? BigInt(String(hsCode)) : null;
        }

        // Add category to update data if provided
        if (category !== undefined) {
          updateProductData.productCategoryNumber = category;
        }

        // Update product
        const product = await tx.product.update({
          where: { id },
          data: updateProductData,
        });

        // Handle discount update
        if (hasDiscountData && discountRate !== undefined && discountRate !== null) {
          const existingDiscount = await tx.productDiscount.findUnique({
            where: { productId: id },
          });

          // If discountRate = 0, remove discount record (if any)
          if (Number(discountRate) === 0) {
            if (existingDiscount) {
              await tx.productDiscount.delete({
                where: { productId: id },
              });
            }
          } else {
            // Check if discountStartDate is in the future, if so set status to false
            const today = new Date(); // Use current time when request hits server
            const shouldBeActive = discountStartDate
              ? new Date(discountStartDate) <= today
              : true; // If no startDate, default to active

            if (existingDiscount) {
              // Update existing discount
              await tx.productDiscount.update({
                where: { productId: id },
                data: {
                  discountRate: discountRate,
                  status: shouldBeActive,
                  discountStartDate: discountStartDate ?? null,
                  discountEndDate: discountEndDate ?? null,
                },
              });
            } else {
              // Create new discount
              await tx.productDiscount.create({
                data: {
                  productId: id,
                  discountRate: discountRate,
                  status: shouldBeActive,
                  discountStartDate: discountStartDate ?? null,
                  discountEndDate: discountEndDate ?? null,
                },
              });
            }
          }
        }

        // Handle product badges update
        if (hasProductBadgesData && productBadges) {
          console.log('productBadges data received:', JSON.stringify(productBadges));
          // Check if at least one badge field is set
          const hasAnyBadgeField = 
            productBadges.isHotDeal !== undefined ||
            productBadges.isNewProduct !== undefined ||
            productBadges.isBestSeller !== undefined;

          if (hasAnyBadgeField) {
            // Check if badge already exists for the product
            const existingBadge = await tx.productBadges.findFirst({
              where: { productId: id },
            });

            if (existingBadge) {
              // Update existing badge - only update fields that are provided
              const updateData: {
                isHotDeal?: boolean;
                isNewProduct?: boolean;
                isBestSeller?: boolean;
              } = {};

              if (productBadges.isHotDeal !== undefined) {
                updateData.isHotDeal = productBadges.isHotDeal;
              }
              if (productBadges.isNewProduct !== undefined) {
                updateData.isNewProduct = productBadges.isNewProduct;
              }
              if (productBadges.isBestSeller !== undefined) {
                updateData.isBestSeller = productBadges.isBestSeller;
              }

              await tx.productBadges.update({
                where: { id: existingBadge.id },
                data: updateData,
              });
            } else {
              // Create new badge
              await tx.productBadges.create({
                data: {
                  productId: id,
                  isHotDeal: productBadges.isHotDeal ?? false,
                  isNewProduct: productBadges.isNewProduct ?? false,
                  isBestSeller: productBadges.isBestSeller ?? false,
                },
              });
            }
          }
        }

        // Upload image registration thumbnail if provided
        if (imageRegistrationThumbnail) {
          const imageRegistrationThumbnailUrl = await this.awsService.uploadFile('products', id, imageRegistrationThumbnail);
          try {
            await tx.product.update({
              where: { id },
              data: { imageRegistrationThumbnail: imageRegistrationThumbnailUrl },
            });
          } catch (error) {
            throw new BadRequestException(`Failed to upload image registration thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Upload image registration detail if provided
        if (imageRegistrationDetail) {
          const imageRegistrationDetailUrl = await this.awsService.uploadFile('products', id, imageRegistrationDetail);
          try {
            await tx.product.update({
              where: { id },
              data: { imageRegistrationDetail: imageRegistrationDetailUrl },
            });
          } catch (error) {
            throw new BadRequestException(`Failed to upload image registration detail: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Upload additional images if provided
        if (additionalImages && additionalImages.length > 0) {
          try {
            const additionalImagesUrls: string[] = [];
            const prefix: string = `products/${id}/additional`;
            for (const image of additionalImages) {
              if (!image) continue;
              const url = await this.awsService.uploadFile(prefix, id, image);
              additionalImagesUrls.push(url!);
            }
            await tx.product.update({
              where: { id },
              data: { additionalImages: additionalImagesUrls },
            });
          } catch (error) {
            throw new BadRequestException(
              `Failed to upload additional images: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }

        return product;
      },
      {
        maxWait: 60000, // max time to wait to acquire a transaction (60 seconds)
        timeout: 30000, // max time the interactive transaction can run before being canceled (30 seconds)
      },
    );

      // Return product entity
      return toProductEntity(result);
    } catch (error: any) {
      // Handle Prisma unique constraint violation
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        if (field === 'productId') {
          throw new DuplicateError(`Product discount for this product already exists`);
        }
        throw new DuplicateError(`Product with this ${field} already exists`);
      }
      // Handle foreign key constraint violation
      if (error.code === 'P2003') {
        throw new NotFoundException(`Related record not found`);
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Delete a single product
   */
  async deleteProduct(id: string): Promise<{ message: string }> {
    // Verify product exists and get image URLs
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    // Helper function to extract S3 key from URL
    const extractS3KeyFromUrl = (url: string | null | undefined): string | null => {
      if (!url) return null;
      try {
        // URL format: https://bucket.s3.region.amazonaws.com/key
        const urlObj = new URL(url);
        // Remove leading slash from pathname
        return urlObj.pathname.substring(1);
      } catch (error) {
        // If URL parsing fails, try to extract key directly
        // Assume the URL contains the key after the domain
        const match = url.match(/amazonaws\.com\/(.+)$/);
        return match ? match[1] : null;
      }
    };

    // Collect all image URLs to delete
    const imageUrls: string[] = [];
    if (product.imageRegistrationThumbnail) {
      imageUrls.push(product.imageRegistrationThumbnail);
    }
    if (product.imageRegistrationDetail) {
      imageUrls.push(product.imageRegistrationDetail);
    }
    if (product.additionalImages && product.additionalImages.length > 0) {
      imageUrls.push(...product.additionalImages);
    }

    // Extract S3 keys from URLs
    const s3Keys = imageUrls
      .map(extractS3KeyFromUrl)
      .filter((key): key is string => key !== null);

    // Use transaction to delete images and product atomically
    try {
      await this.prisma.$transaction(async (tx) => {
        // Delete images from S3 (don't fail transaction if image deletion fails)
        const deletePromises = s3Keys.map(async (key) => {
          try {
            await this.awsService.deleteObject(key);
          } catch (error) {
            // Log error but don't throw - continue with product deletion
            throw new InternalServerErrorException(new Error(`Failed to delete image from S3 with key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        });
        await Promise.all(deletePromises);

        // Delete product (this will cascade delete related records)
        await tx.product.delete({
          where: { id },
        });
      });

      return {
        message: `Product ${id} deleted successfully`,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Bulk delete products
   */
  async bulkDeleteProducts(productIds: string[]): Promise<{ message: string; deletedCount: number }> {
    // Validate ids array
    if (!productIds || productIds.length === 0) {
      throw new BadRequestException('Product IDs array must not be empty');
    }

    // Delete products
    const deletedCount = await this.productRepository.deleteMany(productIds);

    return {
      message: `${deletedCount} product(s) deleted successfully`,
      deletedCount,
    };
  }

  /**
   * Update product status
   */
  async updateProductStatus(id: string, statusData: UpdateProductStatusDto): Promise<ProductEntity> {
    // Verify product exists
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    // Validate at least one status is provided
    if (!statusData.displayStatus && !statusData.saleStatus) {
      throw new BadRequestException('At least one status field must be provided');
    }

    // Update status
    return await this.productRepository.updateStatus(
      id,
      statusData.displayStatus,
      statusData.saleStatus
    );
  }

  /**
   * Bulk update product status
   */
  async bulkUpdateProductStatus(
    productIds: string[],
    statusData: { displayStatus?: string; saleStatus?: string }
  ): Promise<{ message: string; updatedCount: number }> {
    // Validate ids array
    if (!productIds || productIds.length === 0) {
      throw new BadRequestException('Product IDs array must not be empty');
    }

    // Validate at least one status is provided
    if (!statusData.displayStatus && !statusData.saleStatus) {
      throw new BadRequestException('At least one status field must be provided');
    }

    // Update statuses
    const updatedCount = await this.productRepository.bulkUpdateStatus(
      productIds,
      statusData.displayStatus,
      statusData.saleStatus
    );

    return {
      message: `${updatedCount} product(s) status updated successfully`,
      updatedCount,
    };
  }

  /**
   * Get product statistics
   */
  async getProductStats(): Promise<ProductStats> {
    return await this.productRepository.getStats();
  }

  /**
   * Upload product images to Cloudinary and update product
   */
  async uploadProductImages(
    productId: string,
    files: {
      detail?: Express.Multer.File[];
      list?: Express.Multer.File[];
      smallList?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];
    },
  ): Promise<ProductEntity> {
    // Verify product exists
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Import uploadToCloudinary dynamically
    const { uploadToCloudinary } = await import('../../config/cloudinary.js');

    const imageUrls: {
      imageRegistrationDetail?: string;
      imageRegistrationList?: string;
      imageRegistrationSmallList?: string;
      imageRegistrationThumbnail?: string;
    } = {};

    try {
      // Upload detail image
      if (files.detail && files.detail.length > 0) {
        const result = await uploadToCloudinary(files.detail[0], `products/${productId}/detail`);
        imageUrls.imageRegistrationDetail = result.url;
      }

      // Upload list image
      if (files.list && files.list.length > 0) {
        const result = await uploadToCloudinary(files.list[0], `products/${productId}/list`);
        imageUrls.imageRegistrationList = result.url;
      }

      // Upload small list image
      if (files.smallList && files.smallList.length > 0) {
        const result = await uploadToCloudinary(files.smallList[0], `products/${productId}/smallList`);
        imageUrls.imageRegistrationSmallList = result.url;
      }

      // Upload thumbnail image
      if (files.thumbnail && files.thumbnail.length > 0) {
        const result = await uploadToCloudinary(files.thumbnail[0], `products/${productId}/thumbnail`);
        imageUrls.imageRegistrationThumbnail = result.url;
      }

      // Update product with image URLs
      if (Object.keys(imageUrls).length > 0) {
        return await this.productRepository.updateImages(productId, imageUrls);
      }

      return product;
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload images: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Export products to CSV
   */
  async exportProductsToCSV(filters: ProductFilters): Promise<string> {
    // Import fast-csv dynamically
    const { format } = await import('fast-csv');
    const { Readable } = await import('stream');

    // Get all products matching filters (no pagination)
    const products = await this.productRepository.findMany(filters, {
      page: 1,
      limit: 1000000, // Get all products
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    return new Promise((resolve, reject) => {
      const chunks: string[] = [];
      const stream = format({ headers: true });

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk.toString());
      });

      stream.on('error', (error: Error) => {
        reject(error);
      });

      stream.on('end', () => {
        resolve(chunks.join(''));
      });

      // Write product data to CSV
      products.forEach((product) => {
        stream.write({
          '상품코드': product.productCode || '',
          '자체상품코드': product.ownProductCode || '',
          '상품명': product.productName || '',
          '진열상태': product.displayStatus || '',
          '판매상태': product.saleStatus || '',
          '브랜드': product.brand || '',
          '공급사': product.supplier || '',
          '카테고리번호': product.productCategoryNumber || '',
          '소비자가': product.consumerPrice || 0,
          '공급가': product.supplyPrice || 0,
          '상품가': product.productPrice || 0,
          '판매가': product.salePrice || 0,
          '최소주문수량': product.minOrderQuantity || 0,
          '최대주문수량': product.maxOrderQuantity || 0,
          '과세구분': product.taxClassification || '',
          '원산지': product.origin || '',
          '모델명': product.modelName || '',
          '제조사': product.manufacturer || '',
          '트렌드': product.trend || '',
          '상품요약설명': product.productSummaryDescription || '',
          '생성일': product.createdAt ? new Date(product.createdAt).toISOString() : '',
          '수정일': product.updatedAt ? new Date(product.updatedAt).toISOString() : '',
        });
      });

      stream.end();
    });
  }

  async updateProductSpecialOffer(id: string, data: CreateProductSpecialOfferDto): Promise<ProductEntity> {
    // Verify product exists
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    const productSpecialOffer = await this.productRepository.getProductSpecialOfferByProductId(id);

    // Determine if special offer should be active based on date range
    const today = new Date();
    const startDate = data.startDate ? new Date(data.startDate) : null;
    const endDate = data.endDate ? new Date(data.endDate) : null;
    
    // Check if expired (endDate < today)
    const isExpired = endDate && endDate < today;
    
    // If expired, delete the special offer and restore price
    if (isExpired) {
      // Restore price: salePrice = specialPriceApplied + discountAmount
      const specialPriceApplied = data.specialPriceApplied ?? productSpecialOffer?.specialPriceApplied ?? 0;
      const discountAmount = data.discountAmount ?? productSpecialOffer?.discountAmount ?? 0;
      const originalPrice = specialPriceApplied + discountAmount;
      
      await this.prisma.product.update({
        where: { id },
        data: { salePrice: originalPrice > 0 ? originalPrice : product.salePrice },
      });
      
      // Delete special offer if exists
      if (productSpecialOffer) {
        await this.productRepository.deleteProductSpecialOffer(id);
      }
      
      const updatedProduct = await this.productRepository.findById(id);
      if (!updatedProduct) {
        throw new NotFoundException(`Product with id ${id} not found after deletion`);
      }
      return updatedProduct;
    }
    
    // Active if: startDate <= today <= endDate
    const shouldBeActive = startDate && endDate 
      ? (startDate <= today && today <= endDate)
      : false;

    // If productSpecialOffer doesn't exist, create it
    if (!productSpecialOffer) {
      // Create with calculated status based on date range
      const createData = { ...data, status: shouldBeActive };
      await this.productRepository.createProductSpecialOffer(id, createData);
      
      // Update product salePrice to specialPriceApplied if active
      if (shouldBeActive && data.specialPriceApplied !== undefined && data.specialPriceApplied !== null) {
        await this.prisma.product.update({
          where: { id },
          data: { salePrice: data.specialPriceApplied },
        });
      }
      
      const updatedProduct = await this.productRepository.findById(id);
      if (!updatedProduct) {
        throw new NotFoundException(`Product with id ${id} not found after creation`);
      }
      return updatedProduct;
    }

    // Update existing product special offer with calculated status
    const updateData = { ...data, status: shouldBeActive };
    await this.productRepository.updateProductSpecialOffer(id, updateData);
    
    // Update product salePrice based on status
    if (shouldBeActive && data.specialPriceApplied !== undefined && data.specialPriceApplied !== null) {
      // Active: set salePrice to specialPriceApplied
      await this.prisma.product.update({
        where: { id },
        data: { salePrice: data.specialPriceApplied },
      });
    } else {
      // Inactive: restore original price (specialPriceApplied + discountAmount)
      const specialPriceApplied = data.specialPriceApplied ?? productSpecialOffer?.specialPriceApplied ?? 0;
      const discountAmount = data.discountAmount ?? productSpecialOffer?.discountAmount ?? 0;
      const originalPrice = specialPriceApplied + discountAmount;
      
      await this.prisma.product.update({
        where: { id },
        data: { salePrice: originalPrice },
      });
    }
    
    const updatedProduct = await this.productRepository.findById(id);
    if (!updatedProduct) {
      throw new NotFoundException(`Product with id ${id} not found after update`);
    }
    return updatedProduct;
  }

  /**
   * Xoá product special offer: trước khi xoá set product.salePrice = discountAmount + specialPriceApplied, rồi xoá bản ghi.
   */
  async deleteProductSpecialOffer(id: string): Promise<ProductEntity> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    const specialOffer = await this.productRepository.getProductSpecialOfferByProductId(id);
    if (!specialOffer) {
      throw new NotFoundException(`Product ${id} has no special offer to delete`);
    }

    const originPrice =
      (specialOffer.specialPriceApplied ?? 0) + (specialOffer.discountAmount ?? 0);
    await this.prisma.product.update({
      where: { id },
      data: { salePrice: originPrice > 0 ? originPrice : product.salePrice },
    });

    await this.productRepository.deleteProductSpecialOffer(id);

    const updatedProduct = await this.productRepository.findById(id);
    if (!updatedProduct) {
      throw new NotFoundException(`Product with id ${id} not found after deletion`);
    }
    return updatedProduct;
  }

  /**
   * Get products with active special offers
   */
  async getSpecialOffers(query: ProductListQueryDto): Promise<ProductListResponse> {
    // Process query parameters
    const page = query.page || 1;
    const limit = query.limit || 10;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const search = query.search || '';

    // Build pagination
    const pagination: ProductPagination = {
      page,
      limit,
      sortBy,
      sortOrder,
      includeProductReview: query.includeProductReview ?? true,
      search
    };

    // Get products and count (same search filter for list and total)
    const [products, total] = await Promise.all([
      this.productRepository.findManyWithSpecialOffer(pagination),
      this.productRepository.countWithSpecialOffer(pagination),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginationMeta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };

    return {
      products,
      pagination: paginationMeta,
    };
  }

  async getBrands(): Promise<string[]> {
    const brands = await this.prisma.product.findMany({
      select: {
        brand: true,
      },
      distinct: ['brand'],
    });
    return brands.map(brand => brand.brand ?? '').filter(brand => brand !== null);
  }
}
