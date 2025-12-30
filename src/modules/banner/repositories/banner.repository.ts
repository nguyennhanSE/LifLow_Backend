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
import { ECategoryType } from '../../categories/enums/category.enum';
import { BannerEntity } from '../entities/banner.entity';
import { BannerMapper } from '../mappers/banner.mapper';

type BannerWithRelations = Prisma.BannerGetPayload<{
  include: {
    product: true;
  };
}>;

@Injectable()
export class BannerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new banner
   * If productId is provided, it will be linked directly to the banner
   */
  async create(createBannerDto: CreateBannerDto): Promise<BannerEntity> {
    try {
      // If productId is provided, check if product already has a banner
      if (createBannerDto.productId) {
        const existingBanner = await this.prisma.banner.findFirst({
          where: {
            productId: createBannerDto.productId,
          },
        });
        if (existingBanner) {
          throw new BadRequestException(
            `Product with ID ${createBannerDto.productId} already has a banner`,
          );
        }
      }

      // Build base data object
      const data: Prisma.BannerCreateInput = {
        type: createBannerDto.type,
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
        product: createBannerDto.productId ? {
          connect: { id: createBannerDto.productId }
        } : undefined,
        productCategoryNumber: createBannerDto.productCategoryNumber || null,
      };

      // Create banner with relations included
      const banner = await this.prisma.banner.create({
        data,
        include: {
          product: true,
        },
      });
      return BannerMapper.toEntityWithProduct(banner);
    } catch (error) {
      // Handle Prisma unique constraint violations
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'A banner with this configuration already exists',
          );
        }
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `Product or Category not found`,
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
      productCategoryNumber,
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

    // Filter by productId (direct relation)
    if (productId) {
      where.productId = productId;
    }

    // Filter by productCategoryNumber (direct field)
    if (productCategoryNumber) {
      where.productCategoryNumber = productCategoryNumber;
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

    const data = banners.map(banner => BannerMapper.toEntityWithProduct(banner));
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
    
    return banner ? BannerMapper.toEntityWithProduct(banner) : null;
  }

  /**
   * Find banner by productId (direct relation)
   * Returns the banner for this product
   */
  async findByProductId(productId: string): Promise<BannerEntity | null> {
    const banner = await this.prisma.banner.findFirst({
      where: { productId: productId },
      include: {
        product: true,
      },
    });
    
    return banner ? BannerMapper.toEntityWithProduct(banner) : null;
  }

  /**
   * Find banner by productId and productCategoryNumber (direct fields)
   */
  async findByProductIdAndCategory(
    productId: string,
    productCategoryNumber: string,
  ): Promise<BannerEntity | null> {
    const banner = await this.prisma.banner.findFirst({
      where: {
        productId: productId,
        productCategoryNumber: productCategoryNumber,
      },
      include: {
        product: true,
      },
    });
    
    return banner ? BannerMapper.toEntityWithProduct(banner) : null;
  }

  /**
   * Update a banner
   * productId and productCategoryNumber are updated directly on the banner
   */
  async update(id: string, updateBannerDto: UpdateBannerDto): Promise<BannerEntity> {
    try {
      // Check if banner exists
      const existingBanner = await this.findOne(id);
      if (!existingBanner) {
        throw new NotFoundException(`Banner with ID ${id} not found`);
      }

      // If productId is being set, check if another banner already has this product
      if (updateBannerDto.productId) {
        const existingBannerWithProduct = await this.prisma.banner.findFirst({
          where: {
            productId: updateBannerDto.productId,
            id: { not: id }, // Exclude current banner
          },
        });
        if (existingBannerWithProduct) {
          throw new BadRequestException(
            `Product ${updateBannerDto.productId} already has a banner`,
          );
        }
      }

      // Build update data object
      const data: Prisma.BannerUpdateInput = {
        ...(updateBannerDto.type !== undefined && { type: updateBannerDto.type }),
        ...(updateBannerDto.status !== undefined && { status: updateBannerDto.status || EBannerStatus.ACTIVE }),
        ...(updateBannerDto.title !== undefined && { title: updateBannerDto.title }),
        ...(updateBannerDto.badgeText !== undefined && { badgeText: updateBannerDto.badgeText }),
        ...(updateBannerDto.mainText !== undefined && { mainText: updateBannerDto.mainText }),
        ...(updateBannerDto.ctaButtonText !== undefined && { ctaButtonText: updateBannerDto.ctaButtonText }),
        ...(updateBannerDto.ctaButtonUrl !== undefined && { ctaButtonUrl: updateBannerDto.ctaButtonUrl }),
        ...(updateBannerDto.imageUrl !== undefined && { imageUrl: updateBannerDto.imageUrl }),
        ...(updateBannerDto.mobileImageUrl !== undefined && { mobileImageUrl: updateBannerDto.mobileImageUrl }),
        ...(updateBannerDto.displayOrder !== undefined && { displayOrder: updateBannerDto.displayOrder }),
        ...(updateBannerDto.startDate !== undefined && {
          startDate: updateBannerDto.startDate ? new Date(updateBannerDto.startDate) : null,
        }),
        ...(updateBannerDto.endDate !== undefined && {
          endDate: updateBannerDto.endDate ? new Date(updateBannerDto.endDate) : null,
        }),
        ...(updateBannerDto.productId !== undefined && {
          product: updateBannerDto.productId ? { connect: { id: updateBannerDto.productId } } : { disconnect: true },
        }),
        ...(updateBannerDto.productCategoryNumber !== undefined && { productCategoryNumber: updateBannerDto.productCategoryNumber || null }),
      };

      // Update banner
      const banner = await this.prisma.banner.update({
        where: { id },
        data,
        include: {
          product: true,
        },
      });
      return BannerMapper.toEntityWithProduct(banner);
    } catch (error) {
      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'A banner with this configuration already exists',
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
    
    return banners.map(banner => BannerMapper.toEntityWithProduct(banner));
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

  async getBannersByCategory(category: ECategoryType | 'ALL'): Promise<BannerEntity[]> {
    // When category is 'ALL', get banners with productCategoryNumber is null
    if (category === 'ALL') {
      const banners = await this.prisma.banner.findMany({
        where: {
          productCategoryNumber: null,
        },
        include: {
          product: true,
        },
      });
      return banners.map(banner => BannerMapper.toEntityWithProduct(banner));
    }

    // Find banners by productCategoryNumber through category relation
    const categoryNumbers = await this.prisma.category.findMany({
      where: { name: category },
      select: { productCategoryNumber: true },
    }).then(cats => cats.map(c => c.productCategoryNumber));

    const banners = await this.prisma.banner.findMany({
      where: {
        productCategoryNumber: {
          in: categoryNumbers,
        },
      },
      include: {
        product: true,
      },
    });
    return banners.map(banner => BannerMapper.toEntityWithProduct(banner));
  }

  async updateWithImageUrl(id: string, imageUrl: string): Promise<BannerEntity> {
    const transaction = await this.prisma.$transaction(async (tx) => {
      const banner = await tx.banner.findUnique({
        where: { id },
      });
      if (!banner) {
        throw new NotFoundException(`Banner with ID ${id} not found`);
      }
      const updatedBanner = await tx.banner.update({
        where: { id },
        data: { imageUrl, status: EBannerStatus.ACTIVE, updatedAt: new Date() },
      });
      return BannerMapper.toEntity(updatedBanner);
    });
    return transaction;
  }
  async deleteFieldById(id: string, field: string): Promise<void> {
    await this.prisma.banner.update({
      where: { id },
      data: { [field]: null },
    });
  }
}

