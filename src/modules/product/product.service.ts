import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductRepository, ProductFilters, ProductPagination } from './repositories/product.repository';
import { ProductEntity } from './entities/product.entity';
import { ProductListQueryDto, ProductListResponse, PaginationMeta, CreateProductDto, UpdateProductDto, BulkDeleteProductDto, UpdateProductStatusDto, ProductBulkUpdateStatusDto, ProductStats } from './dto/product.dto';
import { validatePriceHierarchy, validateOrderQuantity } from '../../utils/customValidators';
import { DuplicateError } from '../../utils/customErrors';

@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

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
      brand: query.brand,
      saleStatus: query.saleStatus,
      displayStatus: query.displayStatus,
    };

    // Build pagination
    const pagination: ProductPagination = {
      page,
      limit,
      sortBy,
      sortOrder,
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
  async createProduct(data: CreateProductDto): Promise<ProductEntity> {
    // Validate business rules
    validatePriceHierarchy(data);
    validateOrderQuantity(data);

    // Check for duplicate productCode
    if (data.productCode) {
      const exists = await this.productRepository.existsByProductCode(data.productCode);
      if (exists) {
        throw new DuplicateError(`Product with code ${data.productCode} already exists`);
      }
    }

    // Create product
    return await this.productRepository.create(data);
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: string, data: UpdateProductDto): Promise<ProductEntity> {
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

    // Update product
    return await this.productRepository.update(id, data);
  }

  /**
   * Delete a single product
   */
  async deleteProduct(id: string): Promise<{ message: string }> {
    // Verify product exists
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    // Delete product
    await this.productRepository.delete(id);

    return {
      message: `Product ${id} deleted successfully`,
    };
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
}
