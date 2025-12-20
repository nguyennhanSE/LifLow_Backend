import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma, Banner } from '@prisma/client';
import { CreateBannerDto } from '../dto/create-banner.dto';
import { UpdateBannerDto } from '../dto/update-banner.dto';
import { QueryBannerDto } from '../dto/query-banner.dto';
import { EBannerType, EBannerStatus } from '../enums/banner.enum';
import { BannerEntity } from '../entities/banner.entity';
import { BannerMapper } from '../mappers/banner.mapper';

interface ProductFields {
  productName: string | null;
  productPrice: number | null;
  productBrand: string | null;
  productExplanation: string | null;
}

@Injectable()
export class BannerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new banner
   * If productId is provided, fetch and populate denormalized product fields
   */
  async create(createBannerDto: CreateBannerDto): Promise<BannerEntity> {
    try {
      // Build base data object
      const data: Prisma.BannerCreateInput = {
        type: createBannerDto.type ,
        status: createBannerDto.status || EBannerStatus.ACTIVE,
        title: createBannerDto.title,
        badgeText: createBannerDto.badgeText,
        mainText: createBannerDto.mainText,
        ctaButtonText: createBannerDto.ctaButtonText,
        ctaButtonUrl: createBannerDto.ctaButtonUrl,
        imageUrl: createBannerDto.imageUrl,
        mobileImageUrl: createBannerDto.mobileImageUrl,
        displayOrder: createBannerDto.displayOrder ?? 0,
        startDate: createBannerDto.startDate
          ? new Date(createBannerDto.startDate)
          : null,
        endDate: createBannerDto.endDate
          ? new Date(createBannerDto.endDate)
          : null,
        productName: createBannerDto.productName,
        productPrice: createBannerDto.productPrice,
        productBrand: createBannerDto.productBrand,
        productExplanation: createBannerDto.productExplanation,
      };

      // If productId is provided, connect product and populate denormalized fields
      if (createBannerDto.productId) {
        // Check if product already has a banner (unique constraint)
        const existingBanner = await this.findByProductId(
          createBannerDto.productId,
        );
        if (existingBanner) {
          throw new BadRequestException(
            `Product with ID ${createBannerDto.productId} already has a banner`,
          );
        }

        // Use transaction to fetch product and create banner
        const banner = await this.prisma.$transaction(async (tx) => {
          // Fetch product fields
          const productFields = await this.populateProductFields(
            createBannerDto.productId!,
            tx,
          );

          // Merge product fields into data
          data.productName = productFields.productName;
          data.productPrice = productFields.productPrice;
          data.productBrand = productFields.productBrand;
          data.productExplanation = productFields.productExplanation;

          // Connect product relation
          data.product = {
            connect: { id: createBannerDto.productId },
          };

          // Create banner with product relation included
          return tx.banner.create({
            data,
            include: {
              product: true,
            },
          });
        });
        return BannerMapper.toEntity(banner);
      }

      // Create banner without product
      const banner = await this.prisma.banner.create({
        data,
        include: {
          product: true,
        },
      });
      return BannerMapper.toEntity(banner);
    } catch (error) {
      // Handle Prisma unique constraint violations
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'A banner with this productId already exists',
          );
        }
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `Product with ID ${createBannerDto.productId} not found`,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Find all banners with pagination and filters
   */
  async findAll(
    queryDto: QueryBannerDto,
  ): Promise<{ data: BannerEntity[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'displayOrder',
      sortOrder = 'asc',
      type,
      status,
      productId,
      search,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
    } = queryDto;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
    const where: Prisma.BannerWhereInput = {};

    // Filter by type
    if (type) {
      where.type = type;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by productId
    if (productId) {
      where.productId = productId;
    }

    // Search by title or badgeText
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { badgeText: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Date range filters for startDate
    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) {
        where.startDate.gte = new Date(startDateFrom);
      }
      if (startDateTo) {
        where.startDate.lte = new Date(startDateTo);
      }
    }

    // Date range filters for endDate
    if (endDateFrom || endDateTo) {
      where.endDate = {};
      if (endDateFrom) {
        where.endDate.gte = new Date(endDateFrom);
      }
      if (endDateTo) {
        where.endDate.lte = new Date(endDateTo);
      }
    }

    // Build orderBy clause
    const orderBy: Prisma.BannerOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries in parallel
    const [banners, total] = await Promise.all([
      this.prisma.banner.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          product: true,
        },
      }),
      this.prisma.banner.count({ where }),
    ]);

    const data = banners.map(banner => BannerMapper.toEntity(banner));
    return { data, total };
  }

  /**
   * Find a single banner by ID
   */
  async findOne(id: string): Promise<BannerEntity | null> {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });
    
    return banner ? BannerMapper.toEntity(banner) : null;
  }

  /**
   * Find banner by productId (useful for checking if product already has a banner)
   */
  async findByProductId(productId: string): Promise<BannerEntity | null> {
    const banner = await this.prisma.banner.findUnique({
      where: { productId },
    });
    
    return banner ? BannerMapper.toEntity(banner) : null;
  }

  /**
   * Update a banner
   * If productId is changed, update denormalized product fields
   */
  async update(id: string, updateBannerDto: UpdateBannerDto): Promise<BannerEntity> {
    try {
      // Check if banner exists
      const existingBanner = await this.findOne(id);
      if (!existingBanner) {
        throw new NotFoundException(`Banner with ID ${id} not found`);
      }

      // Build update data object
      const data: Prisma.BannerUpdateInput = {
        type: updateBannerDto.type,
        status: updateBannerDto.status,
        title: updateBannerDto.title,
        badgeText: updateBannerDto.badgeText,
        mainText: updateBannerDto.mainText,
        ctaButtonText: updateBannerDto.ctaButtonText,
        ctaButtonUrl: updateBannerDto.ctaButtonUrl,
        imageUrl: updateBannerDto.imageUrl,
        mobileImageUrl: updateBannerDto.mobileImageUrl,
        displayOrder: updateBannerDto.displayOrder,
        startDate: updateBannerDto.startDate
          ? new Date(updateBannerDto.startDate)
          : undefined,
        endDate: updateBannerDto.endDate
          ? new Date(updateBannerDto.endDate)
          : undefined,
        productName: updateBannerDto.productName,
        productPrice: updateBannerDto.productPrice,
        productBrand: updateBannerDto.productBrand,
        productExplanation: updateBannerDto.productExplanation,
      };

      // If productId is being changed
      if (
        updateBannerDto.productId !== undefined &&
        updateBannerDto.productId !== existingBanner.productId
      ) {
        // If setting a new productId
        if (updateBannerDto.productId) {
          // Check if new product already has a banner
          const existingProductBanner = await this.findByProductId(
            updateBannerDto.productId,
          );
          if (existingProductBanner && existingProductBanner.id !== id) {
            throw new BadRequestException(
              `Product with ID ${updateBannerDto.productId} already has a banner`,
            );
          }

          // Use transaction to fetch product and update banner
          const banner = await this.prisma.$transaction(async (tx) => {
            // Fetch product fields
            const productFields = await this.populateProductFields(
              updateBannerDto.productId!,
              tx,
            );

            // Merge product fields into data
            data.productName = productFields.productName;
            data.productPrice = productFields.productPrice;
            data.productBrand = productFields.productBrand;
            data.productExplanation = productFields.productExplanation;

            // Connect new product
            data.product = {
              connect: { id: updateBannerDto.productId },
            };

            // Update banner with product relation included
            return tx.banner.update({
              where: { id },
              data,
              include: {
                product: true,
              },
            });
          });
          return BannerMapper.toEntity(banner);
        } else {
          // If removing product (set to null)
          data.product = { disconnect: true };
          data.productName = null;
          data.productPrice = null;
          data.productBrand = null;
          data.productExplanation = null;
        }
      }

      // Update banner
      const banner = await this.prisma.banner.update({
        where: { id },
        data,
        include: {
          product: true,
        },
      });
      return BannerMapper.toEntity(banner);
    } catch (error) {
      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'A banner with this productId already exists',
          );
        }
        if (error.code === 'P2025') {
          throw new NotFoundException(`Banner with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Remove a banner
   */
  async remove(id: string): Promise<BannerEntity> {
    try {
      const banner = await this.prisma.banner.delete({
        where: { id },
      });
      return BannerMapper.toEntity(banner);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Banner with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Find all active banners by type
   * Useful for frontend display
   */
  async findActiveByType(type: EBannerType): Promise<BannerEntity[]> {
    const banners = await this.prisma.banner.findMany({
      where: {
        type,
        status: EBannerStatus.ACTIVE,
      },
      orderBy: {
        displayOrder: 'asc',
      },
      include: {
        product: true,
      },
    });
    
    return banners.map(banner => BannerMapper.toEntity(banner));
  }

  /**
   * Find scheduled banners that should be activated
   * Used by cron job to activate scheduled banners
   */
  async findScheduledBanners(): Promise<BannerEntity[]> {
    const now = new Date();

    const banners = await this.prisma.banner.findMany({
      where: {
        status: EBannerStatus.SCHEDULED,
        startDate: {
          lte: now,
        },
        OR: [
          { endDate: null },
          {
            endDate: {
              gte: now,
            },
          },
        ],
      },
    });
    
    return banners.map(banner => BannerMapper.toEntity(banner));
  }

  /**
   * Bulk update status for multiple banners
   * Returns count of updated records
   */
  async bulkUpdateStatus(
    ids: string[],
    status: EBannerStatus,
  ): Promise<number> {
    const result = await this.prisma.banner.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        status,
      },
    });

    return result.count;
  }

  /**
   * Helper method to populate product fields from product ID
   * Used when creating/updating banner with productId
   */
  private async populateProductFields(
    productId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ProductFields> {
    const prismaClient = tx || this.prisma;

    const product = await prismaClient.product.findUnique({
      where: { id: productId },
      select: {
        productName: true,
        productPrice: true,
        brand: true,
        productSummaryDescription: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return {
      productName: product.productName,
      productPrice: product.productPrice,
      productBrand: product.brand,
      productExplanation: product.productSummaryDescription,
    };
  }
}

