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
import { EBannerType, EBannerStatus, ECategoryType } from '../enums/banner.enum';
import { BannerEntity } from '../entities/banner.entity';
import { BannerMapper } from '../mappers/banner.mapper';
import { plainToInstance } from 'class-transformer';

type BannerWithRelations = Prisma.BannerGetPayload<{
  include: {
    productCategoryBannerRelations: {
      include: {
        product: true;
        category: true;
      };
    };
  };
}>;

@Injectable()
export class BannerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new banner
   * If productId and productCategoryNumber are provided, create ProductCategoryBannerRelation
   */
  async create(createBannerDto: CreateBannerDto): Promise<BannerEntity> {
    try {
      // Validate that if productId is provided, productCategoryNumber must also be provided
      if (createBannerDto.productId && !createBannerDto.productCategoryNumber) {
        throw new BadRequestException(
          'productCategoryNumber is required when productId is provided',
        );
      }

      // If productId is provided, check if product already has a banner for this category
      if (createBannerDto.productId && createBannerDto.productCategoryNumber) {
        const existingRelation = await this.prisma.productCategoryBannerRelation.findFirst({
          where: {
            productId: createBannerDto.productId,
            productCategoryNumber: createBannerDto.productCategoryNumber,
          },
          include: {
            banner: true,
          },
        });
        if (existingRelation && existingRelation.banner) {
          throw new BadRequestException(
            `Product with ID ${createBannerDto.productId} already has a banner for category ${createBannerDto.productCategoryNumber}`,
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
        // Create ProductCategoryBannerRelation if productId and productCategoryNumber are provided
        productCategoryBannerRelations: createBannerDto.productId && createBannerDto.productCategoryNumber
          ? {
              create: {
                productId: createBannerDto.productId,
                productCategoryNumber: createBannerDto.productCategoryNumber,
              },
            }
          : undefined,
      };

      // Create banner with relations included
      const banner = await this.prisma.banner.create({
        data,
        include: {
          productCategoryBannerRelations: {
            include: {
              product: true,
              category: true,
            },
          },
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

    // Filter by productId through ProductCategoryBannerRelation
    if (productId) {
      where.productCategoryBannerRelations = {
        some: {
          productId: productId,
        },
      };
    }

    // Filter by productCategoryNumber through ProductCategoryBannerRelation
    if (productCategoryNumber) {
      where.productCategoryBannerRelations = {
        ...where.productCategoryBannerRelations,
        some: {
          ...(where.productCategoryBannerRelations?.some || {}),
          productCategoryNumber: productCategoryNumber,
        },
      };
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
          productCategoryBannerRelations: {
            include: {
              product: true,
              category: true,
            },
          },
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
        productCategoryBannerRelations: {
          include: {
            product: true,
            category: true,
          },
        },
      },
    });
    
    return banner ? BannerMapper.toEntityWithProduct(banner) : null;
  }

  /**
   * Find banner by productId through ProductCategoryBannerRelation
   * Returns the first banner found for this product
   */
  async findByProductId(productId: string): Promise<BannerEntity | null> {
    const relation = await this.prisma.productCategoryBannerRelation.findFirst({
      where: { productId: productId },
      include: {
        banner: {
          include: {
            productCategoryBannerRelations: {
              include: {
                product: true,
                category: true,
              },
            },
          },
        },
        product: true,
        category: true,
      },
    });
    
    if (!relation || !relation.banner) {
      return null;
    }
    
    // Type assertion: banner from relation has the same structure as BannerWithRelations
    const banner = relation.banner as BannerWithRelations;
    return BannerMapper.toEntityWithProduct(banner);
  }

  /**
   * Find banner by productId and productCategoryNumber through ProductCategoryBannerRelation
   */
  async findByProductIdAndCategory(
    productId: string,
    productCategoryNumber: string,
  ): Promise<BannerEntity | null> {
    const relation = await this.prisma.productCategoryBannerRelation.findFirst({
      where: {
        productId: productId,
        productCategoryNumber: productCategoryNumber,
      },
      include: {
        banner: {
          include: {
            productCategoryBannerRelations: {
              include: {
                product: true,
                category: true,
              },
            },
          },
        },
        product: true,
        category: true,
      },
    });
    
    if (!relation || !relation.banner) {
      return null;
    }
    
    // Type assertion: banner from relation has the same structure as BannerWithRelations
    const banner = relation.banner as BannerWithRelations;
    return BannerMapper.toEntityWithProduct(banner);
  }

  /**
   * Update a banner
   * If productId or productCategoryNumber is changed, update ProductCategoryBannerRelation
   */
  async update(id: string, updateBannerDto: UpdateBannerDto): Promise<BannerEntity> {
    try {
      // Check if banner exists
      const existingBanner = await this.findOne(id);
      if (!existingBanner) {
        throw new NotFoundException(`Banner with ID ${id} not found`);
      }

      // Validate that if productId is provided, productCategoryNumber must also be provided
      if (updateBannerDto.productId && !updateBannerDto.productCategoryNumber) {
        throw new BadRequestException(
          'productCategoryNumber is required when productId is provided',
        );
      }

      // Get existing relations
      const existingRelations = await this.prisma.productCategoryBannerRelation.findMany({
        where: { bannerId: id },
      });

      // Build update data object
      const data: Prisma.BannerUpdateInput = {
        type: updateBannerDto.type,
        status: updateBannerDto.status || EBannerStatus.ACTIVE,
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
      };

      // Handle ProductCategoryBannerRelation updates
      if (updateBannerDto.productId !== undefined || updateBannerDto.productCategoryNumber !== undefined) {
        // If both productId and productCategoryNumber are provided, create/update relation
        if (updateBannerDto.productId && updateBannerDto.productCategoryNumber) {
          // Check if another banner already has this product-category combination
          const existingRelation = await this.prisma.productCategoryBannerRelation.findFirst({
            where: {
              productId: updateBannerDto.productId,
              productCategoryNumber: updateBannerDto.productCategoryNumber,
              bannerId: { not: id }, // Exclude current banner
            },
          });
          if (existingRelation) {
            throw new BadRequestException(
              `Product ${updateBannerDto.productId} already has a banner for category ${updateBannerDto.productCategoryNumber}`,
            );
          }

          // Delete all existing relations for this banner
          if (existingRelations.length > 0) {
            await this.prisma.productCategoryBannerRelation.deleteMany({
              where: { bannerId: id },
            });
          }

          // Create new relation
          data.productCategoryBannerRelations = {
            create: {
              productId: updateBannerDto.productId,
              productCategoryNumber: updateBannerDto.productCategoryNumber,
            },
          };
        } else if (updateBannerDto.productId === null || (updateBannerDto.productId === undefined && updateBannerDto.productCategoryNumber === null)) {
          // If removing product (both null or productId is null), delete all relations
          if (existingRelations.length > 0) {
            await this.prisma.productCategoryBannerRelation.deleteMany({
              where: { bannerId: id },
            });
          }
        }
      }

      // Update banner
      const banner = await this.prisma.banner.update({
        where: { id },
        data,
        include: {
          productCategoryBannerRelations: {
            include: {
              product: true,
              category: true,
            },
          },
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
        productCategoryBannerRelations: {
          include: {
            product: true,
            category: true,
          },
        },
      },
    });
    if (banners.some(banner => banner.productCategoryBannerRelations.some(relation => relation.category?.name))) {
      banners.sort((a, b) => {
        const categoryOrder: Record<string, number> = {
          [ECategoryType.ALL]: 0,
          [ECategoryType.LIVESTOCK]: 1,
          [ECategoryType.CONVENIENCE_FOOD]: 2,
          [ECategoryType.FISHERIES]: 3,
          [ECategoryType.SIDE_DISH]: 4,
        };
        
        // Find first relation with category for banner A
        const relationA = a.productCategoryBannerRelations.find(relation => relation.category?.name);
        const categoryNameA = relationA?.category?.name as string;
        const orderA = categoryNameA ? (categoryOrder[categoryNameA] ?? 999) : 999;
        
        // Find first relation with category for banner B
        const relationB = b.productCategoryBannerRelations.find(relation => relation.category?.name);
        const categoryNameB = relationB?.category?.name as string;
        const orderB = categoryNameB ? (categoryOrder[categoryNameB] ?? 999) : 999;
        
        return orderA - orderB;
      });
    }
    
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

  async getBannersByCategory(category: ECategoryType): Promise<BannerEntity[]> {
    const banners = await this.prisma.productCategoryBannerRelation.findMany({
      where: {
        category: {
          name: category,
        },
      },
      include: {
        banner: true,
      },
    });
    const bannersData = banners.map(relation => plainToInstance(BannerEntity, relation.banner));
    return bannersData;
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

