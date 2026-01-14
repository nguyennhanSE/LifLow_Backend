import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BannerRepository } from './repositories/banner.repository';
import { ProductService } from '../product/product.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { QueryBannerDto } from './dto/query-banner.dto';
import { PaginatedResponseDto } from './dto/paginated-response.dto';
import { BannerBulkUpdateStatusDto } from './dto/bulk-update-status.dto';
import { ReorderBannersDto } from './dto/reorder-banners.dto';
import { BannerMapper } from './mappers/banner.mapper';
import { EBannerType } from './enums/banner.enum';
import { ECategoryType } from '../categories/enums/category.enum';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppLogger } from '../../libs/logger/logger.service';
import { BannerEntity } from './entities/banner.entity';
import { AwsService } from 'src/libs/integration/aws/aws.service';


@Injectable()
export class BannerService {
  constructor(private readonly bannerRepository: BannerRepository, private readonly productService: ProductService, private readonly prisma: PrismaService, private readonly logger: AppLogger,
    private readonly awsService: AwsService,
  ) {}

  /**
   * Create a new banner
   */
  async create(
    createBannerDto: CreateBannerDto,
  ): Promise<BannerEntity> {
    try {
      // Validate business rules
      await this.validateCreateBanner(createBannerDto);

      // Create banner through repository
      const banner = await this.bannerRepository.create(createBannerDto);

      // Log creation
      this.logger.log(
        `Banner created successfully: ID=${banner.id}, Type=${banner.type}`,
      );

      // Map to response DTO
      return banner;
    } catch (error) {
      this.logger.error(
        `Failed to create banner: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Find all banners with pagination and filters
   */
  async findAll(
    queryDto: QueryBannerDto,
  ): Promise<PaginatedResponseDto<BannerEntity>> {
    try {
      // Set defaults
      const page = queryDto.page ?? 1;
      const limit = queryDto.limit ?? 10;
      const sortBy = queryDto.sortBy ?? 'displayOrder';
      const sortOrder = queryDto.sortOrder ?? 'asc';

      const query: QueryBannerDto = {
        ...queryDto,
        page,
        limit,
        sortBy,
        sortOrder,
      };

      // Get banners from repository
      const { data, total } = await this.bannerRepository.findAll(query);
      // Return paginated response
      return new PaginatedResponseDto(data, total, page, limit);
    } catch (error) {
      this.logger.error(
        `Failed to fetch banners: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Find a single banner by ID
   */
  async findOne(id: string): Promise<BannerEntity> {
    const banner = await this.bannerRepository.findOne(id);

    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    return banner;
  }

  /**
   * Update a banner
   */
  async update(
    id: string,
    updateBannerDto: UpdateBannerDto,
  ): Promise<BannerEntity> {
    try {
      // Verify banner exists
      const existingBanner = await this.findOne(id);
      if (!existingBanner) {
        throw new NotFoundException(`Banner with ID ${id} not found`);
      }
      // Validate business rules
      await this.validateUpdateBanner(id, updateBannerDto);

      // Update through repository
      const updatedBanner = await this.bannerRepository.update(
        id,
        updateBannerDto,
      );

      // Log update
      this.logger.log(`Banner updated successfully: ID=${id}`);

      // Map and return response DTO
      return updatedBanner;
    } catch (error) {
      this.logger.error(
        `Failed to update banner ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Remove a banner
   */
  async remove(id: string): Promise<void> {
    try {
      // Verify banner exists
      await this.findOne(id);

      // Delete through repository
      await this.bannerRepository.remove(id);

      // Log deletion
      this.logger.log(`Banner deleted successfully: ID=${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete banner ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Find all active banners by type
   * Useful for frontend display
   */
  async findActiveByType(type: EBannerType): Promise<BannerEntity[]> {
    try {
      const banners = await this.bannerRepository.findActiveByType(type);

      // Map to response DTOs
      return banners;
    } catch (error) {
      this.logger.error(
        `Failed to fetch active banners by type ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Sync product data for a banner
   * Verifies that the product still exists and is valid through ProductCategoryBannerRelation
   */
  async syncProductData(bannerId: string): Promise<BannerEntity> {
    try {
      // Find banner
      const banner = await this.bannerRepository.findOne(bannerId);

      if (!banner) {
        throw new NotFoundException(`Banner with ID ${bannerId} not found`);
      }

      // Check if banner has product relation
      if (!banner.product) {
        throw new BadRequestException(
          'Banner does not have an associated product',
        );
      }

      // Verify product still exists
      if (banner.productId) {
        await this.productService.getProductById(banner.productId);
      }

      this.logger.log(
        `Verified product data for banner: ID=${bannerId}, ProductId=${banner.productId}`,
      );

      // Return the banner as-is since we're just verifying the products exist
      return banner;
    } catch (error) {
      this.logger.error(
        `Failed to sync product data for banner ${bannerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Bulk update status for multiple banners
   */
  async bulkUpdateStatus(
    dto: BannerBulkUpdateStatusDto,
  ): Promise<{ updated: number; message: string }> {
    try {
      // Optional: Validate all banner IDs exist
      const validationPromises = dto.ids.map((id) =>
        this.bannerRepository.findOne(id),
      );
      const banners = await Promise.all(validationPromises);

      const notFoundIds = dto.ids.filter((id, index) => !banners[index]);
      if (notFoundIds.length > 0) {
        throw new NotFoundException(
          `Banners not found: ${notFoundIds.join(', ')}`,
        );
      }

      // Bulk update status
      const count = await this.bannerRepository.bulkUpdateStatus(
        dto.ids,
        dto.status,
      );

      this.logger.log(
        `Bulk status update: ${count} banners updated to ${dto.status}`,
      );

      return { updated: count, message: `Bulk status update: ${count} banners updated to ${dto.status}` };
    } catch (error) {
      this.logger.error(
        `Failed to bulk update banner status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Reorder banners by updating display orders
   * Uses transaction to ensure atomic update
   */
  async reorderBanners(dto: ReorderBannersDto): Promise<void> {
    try {
      // Validate all banner IDs exist
      const validationPromises = dto.bannerOrders.map((item) =>
        this.bannerRepository.findOne(item.id),
      );
      const banners = await Promise.all(validationPromises);

      const notFoundIds = dto.bannerOrders
        .filter((item, index) => !banners[index])
        .map((item) => item.id);

      if (notFoundIds.length > 0) {
        throw new NotFoundException(
          `Banners not found: ${notFoundIds.join(', ')}`,
        );
      }

      // Use transaction to update all display orders atomically
      await this.prisma.$transaction(async (tx) => {
        const updatePromises = dto.bannerOrders.map((item) =>
          tx.banner.update({
            where: { id: item.id },
            data: { displayOrder: item.displayOrder },
          }),
        );

        await Promise.all(updatePromises);
      });

      this.logger.log(
        `Reordered ${dto.bannerOrders.length} banners successfully`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to reorder banners: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Private helper: Validate business rules for creating a banner
   */
  private async validateCreateBanner(
    createBannerDto: CreateBannerDto,
  ): Promise<void> {
    // Validate that productId is only allowed for MAIN_PRODUCTS banner type
    if (createBannerDto.productId) {
      if (createBannerDto.type !== EBannerType.MAIN_PRODUCTS) {
        throw new BadRequestException(
          'productId chỉ được sử dụng cho banner type MAIN_PRODUCTS. productId is only allowed for MAIN_PRODUCTS banner type.',
        );
      }
      
      await this.validateProductExists(createBannerDto.productId);
      
      // Validate that category is also provided when productId is provided
      if (!createBannerDto.category) {
        throw new BadRequestException(
          'category is required when productId is provided',
        );
      }
    }

    // Validate date range
    if (createBannerDto.startDate && createBannerDto.endDate) {
      this.validateDateRange(
        new Date(createBannerDto.startDate),
        new Date(createBannerDto.endDate),
      );
    }

    // Log image validation note
    this.logger.log(
      'Note: Ensure banner image meets minimum requirements (800x800px)',
    );
  }

  /**
   * Private helper: Validate business rules for updating a banner
   */
  private async validateUpdateBanner(
    id: string,
    updateBannerDto: UpdateBannerDto,
  ): Promise<void> {
    // Get existing banner to check current type if type is not being updated
    const existingBanner = await this.bannerRepository.findOne(id);
    if (!existingBanner) {
      throw new NotFoundException(`Banner with id ${id} not found`);
    }

    // Determine the banner type (use updated type if provided, otherwise existing type)
    const bannerType = updateBannerDto.type ?? existingBanner.type;

    // Validate product exists if productId is being updated
    if (
      updateBannerDto.productId !== undefined &&
      updateBannerDto.productId !== null
    ) {
      // Validate that productId is only allowed for MAIN_PRODUCTS banner type
      if (bannerType !== EBannerType.MAIN_PRODUCTS) {
        throw new BadRequestException(
          'productId chỉ được sử dụng cho banner type MAIN_PRODUCTS. productId is only allowed for MAIN_PRODUCTS banner type.',
        );
      }

      await this.validateProductExists(updateBannerDto.productId);
      
      // Validate that category is also provided when productId is provided
      if (!updateBannerDto.category) {
        throw new BadRequestException(
          'category is required when productId is provided',
        );
      }
    }

    // If type is being changed to non-MAIN_PRODUCTS and productId exists, clear productId
    if (
      updateBannerDto.type &&
      updateBannerDto.type !== EBannerType.MAIN_PRODUCTS &&
      existingBanner.productId
    ) {
      // Note: This should be handled in the update logic to clear productId
      // For now, we'll throw an error to prevent invalid state
      throw new BadRequestException(
        'Không thể thay đổi banner type từ MAIN_PRODUCTS sang loại khác khi đã có productId. Cannot change banner type from MAIN_PRODUCTS to another type when productId exists. Please remove productId first.',
      );
    }

    // Validate date range if dates are being updated
    // const banner = await this.bannerRepository.findOne(id);
    // if (banner) {
    //   const startDate = updateBannerDto.startDate
    //     ? new Date(updateBannerDto.startDate)
    //     : banner.startDate;
    //   const endDate = updateBannerDto.endDate
    //     ? new Date(updateBannerDto.endDate)
    //     : banner.endDate;

    //   if (startDate && endDate) {
    //     this.validateDateRange(startDate, endDate);
    //   }
    // }
  }

  /**
   * Private helper: Validate that a product exists
   */
  private async validateProductExists(productId: string): Promise<void> {
    try {
      await this.productService.getProductById(productId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }
      throw error;
    }
  }

  /**
   * Private helper: Validate date range
   */
  private validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate >= endDate) {
      throw new BadRequestException(
        'Start date must be before end date',
      );
    }
  }

  async getBannersByCategory(category: ECategoryType | 'ALL'): Promise<BannerEntity[]> {
    const banners = await this.bannerRepository.getBannersByCategory(category);
    return banners;
  }

  async updateBannerImageUrl(id: string, file?: Express.Multer.File): Promise<BannerEntity> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const banner = await this.bannerRepository.findOne(id);
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    // Store old image URL for cleanup
    const oldImageUrl = banner.imageUrl;
    let oldS3Key: string | null = null;

    // Extract S3 key from old image URL if it's an S3 URL
    try {
      const imageUrlObj = new URL(oldImageUrl);
      // Extract key from S3 URL format: https://bucket.s3.region.amazonaws.com/key
      // or https://bucket.s3-region.amazonaws.com/key
      if (imageUrlObj.hostname.includes('s3') && imageUrlObj.hostname.includes('amazonaws.com')) {
        // Remove leading slash from pathname to get the key
        oldS3Key = imageUrlObj.pathname.startsWith('/') 
          ? imageUrlObj.pathname.substring(1) 
          : imageUrlObj.pathname;
        this.logger.debug('Old S3 key extracted:', oldS3Key);
      }
    } catch (error) {
      this.logger.warn('Could not parse old image URL for cleanup:', oldImageUrl);
    }

    // Upload new file and update banner in transaction
    const transaction = await this.prisma.$transaction(async (tx) => {
      const newImageUrl = await this.awsService.uploadFile('banners', banner.id, file);
      const updatedBanner = await this.bannerRepository.updateWithImageUrl(id, newImageUrl as string);
      
      // Delete old file from S3 after successful update (non-blocking)
      if (oldS3Key) {
        this.awsService.deleteObject(oldS3Key).catch((error) => {
          this.logger.warn(`Failed to delete old S3 object: ${oldS3Key}`, error);
          // Don't throw - cleanup failure shouldn't break the update
        });
      }
      
      return updatedBanner;
    });
    
    return transaction;
  }
}
