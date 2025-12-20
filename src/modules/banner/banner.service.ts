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
import { PrismaService } from '../../../prisma/prisma.service';
import { AppLogger } from '../../libs/logger/logger.service';
import { BannerEntity } from './entities/banner.entity';

@Injectable()
export class BannerService {
  constructor(private readonly bannerRepository: BannerRepository, private readonly productService: ProductService, private readonly prisma: PrismaService, private readonly logger: AppLogger) {}

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
      await this.findOne(id);

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
   * Useful when product information changes
   */
  async syncProductData(bannerId: string): Promise<BannerEntity> {
    try {
      // Find banner
      const banner = await this.bannerRepository.findOne(bannerId);

      if (!banner) {
        throw new NotFoundException(`Banner with ID ${bannerId} not found`);
      }

      if (!banner.productId) {
        throw new BadRequestException(
          'Banner does not have an associated product',
        );
      }

      // Fetch latest product data
      const product = await this.productService.getProductById(
        banner.productId,
      );

      // Update banner with fresh denormalized product fields
      const updateData: UpdateBannerDto = {
        productName: product.productName ?? undefined,
        productPrice: product.productPrice ?? undefined,
        productBrand: product.brand ?? undefined,
        productExplanation: product.productSummaryDescription ?? undefined,
      };

      const updatedBanner = await this.bannerRepository.update(
        bannerId,
        updateData,
      );

      this.logger.log(
        `Synced product data for banner: ID=${bannerId}, ProductID=${banner.productId}`,
      );

      return updatedBanner;
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
    // Validate product exists if productId is provided
    if (createBannerDto.productId) {
      await this.validateProductExists(createBannerDto.productId);
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
    // Validate product exists if productId is being updated
    if (
      updateBannerDto.productId !== undefined &&
      updateBannerDto.productId !== null
    ) {
      await this.validateProductExists(updateBannerDto.productId);
    }

    // Validate date range if dates are being updated
    const banner = await this.bannerRepository.findOne(id);
    if (banner) {
      const startDate = updateBannerDto.startDate
        ? new Date(updateBannerDto.startDate)
        : banner.startDate;
      const endDate = updateBannerDto.endDate
        ? new Date(updateBannerDto.endDate)
        : banner.endDate;

      if (startDate && endDate) {
        this.validateDateRange(startDate, endDate);
      }
    }
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
}
