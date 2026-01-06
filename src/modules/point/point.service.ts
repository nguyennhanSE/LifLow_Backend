import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, Point } from '@prisma/client';
import {
  CreatePointDto,
  PointFilterDto,
  PointListResponse,
  PointResponseDto,
  UpdatePointDto,
} from './dto/point.dto';
import { PointRepository } from './repositories/point.repository';
import { toPointResponseDto, toPointEntity, toPointEntityWithRelations } from './mapper/point.mapper';
import { PointNotFoundException } from './exceptions/point-not-found.exception';
import { PointValidationException } from './exceptions/point-validation.exception';
import { PointEntity } from './entities/point.entity';

@Injectable()
export class PointService {
  constructor(private readonly pointRepository: PointRepository) {}

  /**
   * Create a new point
   * - Validates the user exists if userId is present
   * - Validates the order exists if orderNumber is present
   */
  async create(createPointDto: CreatePointDto): Promise<PointResponseDto> {
    try {
      // Validate user existence when userId is provided
      if (createPointDto.userId) {
        const userExists = await this.pointRepository.userExists(createPointDto.userId);
        if (!userExists) {
          throw new PointValidationException('User not found');
        }
      }

      // Validate order existence when orderNumber is provided
      if (createPointDto.orderNumber) {
        const orderExists = await this.pointRepository.orderExists(createPointDto.orderNumber);
        if (!orderExists) {
          throw new PointValidationException('Order not found');
        }
      }

      const created = await this.pointRepository.create({
        ...createPointDto,
      });

      const pointEntity = toPointEntity(created);
      return toPointResponseDto(pointEntity);
    } catch (error) {
      this.handlePrismaError(error, 'Failed to create point');
    }
  }

  /**
   * Get all points with filtering, pagination, search, and sorting
   */
  async findAll(filterDto: PointFilterDto): Promise<PointListResponse> {
    try {
      const page = filterDto.page || 1;
      const limit = filterDto.limit || 10;
      const sortBy = filterDto.sortBy || 'createdAt';
      const sortOrder = filterDto.sortOrder || 'desc';

      const where = this.buildWhereClause(filterDto);
      const orderBy = this.buildOrderByClause(sortBy, sortOrder);
      const skip = (page - 1) * limit;

      const [points, total] = await Promise.all([
        this.pointRepository.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          includeRelations: true,
        }),
        this.pointRepository.count(where),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;

      return {
        points: points.map((point) => {
          const pointEntity = toPointEntityWithRelations(point);
          return toPointResponseDto(pointEntity);
        }),
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.handlePrismaError(error, 'Failed to fetch points');
    }
  }

  /**
   * Get a single point by ID (includes relations)
   */
  async findOne(id: string): Promise<PointResponseDto> {
    try {
      const point = await this.pointRepository.findById(id, true);

      if (!point) {
        throw new PointNotFoundException(`Point with id ${id} not found`);
      }

      const pointEntity = toPointEntityWithRelations(point);
      return toPointResponseDto(pointEntity);
    } catch (error) {
      this.handlePrismaError(error, `Failed to fetch point ${id}`);
    }
  }

  /**
   * Get point by user ID
   */
  async findByUserId(userId: string): Promise<PointResponseDto | null> {
    try {
      const point = await this.pointRepository.findByUserId(userId, true);

      if (!point) {
        return null;
      }

      const pointEntity = toPointEntityWithRelations(point);
      return toPointResponseDto(pointEntity);
    } catch (error) {
      this.handlePrismaError(error, `Failed to fetch point for user ${userId}`);
    }
  }

  /**
   * Get point by order number
   */
  async findByOrderNumber(orderNumber: string): Promise<PointResponseDto | null> {
    try {
      const point = await this.pointRepository.findByOrderNumber(orderNumber, true);

      if (!point) {
        return null;
      }

      const pointEntity = toPointEntityWithRelations(point);
      return toPointResponseDto(pointEntity);
    } catch (error) {
      this.handlePrismaError(error, `Failed to fetch point for order ${orderNumber}`);
    }
  }

  /**
   * Update an existing point (partial updates supported)
   */
  async update(id: string, updatePointDto: UpdatePointDto): Promise<PointEntity> {
    try {
      // Ensure point exists
      const existing = await this.pointRepository.findById(id, false);
      if (!existing) {
        throw new PointNotFoundException(`Point with id ${id} not found`);
      }

      // Validate user if changing userId
      if (updatePointDto.userId) {
        const userExists = await this.pointRepository.userExists(updatePointDto.userId);
        if (!userExists) {
          throw new PointValidationException('User not found');
        }
      }

      // Validate order if changing orderNumber
      if (updatePointDto.orderNumber) {
        const orderExists = await this.pointRepository.orderExists(updatePointDto.orderNumber);
        if (!orderExists) {
          throw new PointValidationException('Order not found');
        }
      }

      const updated = await this.pointRepository.update(
        id,
        {
          ...updatePointDto,
        },
        true,
      );

      return updated;
    } catch (error) {
      this.handlePrismaError(error, `Failed to update point ${id}`);
    }
  }

  /**
   * Delete a point (hard delete)
   */
  async remove(id: string): Promise<{ message: string }> {
    try {
      const existing = await this.pointRepository.findById(id, false);
      if (!existing) {
        throw new PointNotFoundException(`Point with id ${id} not found`);
      }

      await this.pointRepository.delete(id);

      return { message: `Point ${id} deleted successfully` };
    } catch (error) {
      this.handlePrismaError(error, `Failed to delete point ${id}`);
    }
  }

  /**
   * Build dynamic where clause for filtering and search
   */
  private buildWhereClause(filterDto: PointFilterDto): Prisma.PointWhereInput {
    const where: Prisma.PointWhereInput = {};

    const searchTerms: Prisma.PointWhereInput[] = [];

    // General search across multiple fields
    if (filterDto.q) {
      searchTerms.push({
        OR: [
          { userId: { contains: filterDto.q, mode: 'insensitive' } },
          { orderNumber: { contains: filterDto.q, mode: 'insensitive' } },
          { content: { contains: filterDto.q, mode: 'insensitive' } },
        ],
      });
    }

    if (searchTerms.length > 0) {
      where.AND = searchTerms;
    }

    // User filter
    if (filterDto.userId) {
      where.userId = filterDto.userId;
    }

    // Order number filter
    if (filterDto.orderNumber) {
      where.orderNumber = filterDto.orderNumber;
    }

    // Points type filter
    if (filterDto.pointsType) {
      where.pointsType = filterDto.pointsType;
    }

    // Date range filter
    if (filterDto.dateFrom || filterDto.dateTo) {
      where.date = {};
      if (filterDto.dateFrom) {
        (where.date as Prisma.StringFilter).gte = filterDto.dateFrom;
      }
      if (filterDto.dateTo) {
        // Add one day to include the entire end date
        const [y, m, d] = filterDto.dateTo.split('-').map((v) => parseInt(v, 10));
        const endDate = new Date(y, (m ?? 1) - 1, d ?? 1);
        endDate.setDate(endDate.getDate() + 1);
        const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
        (where.date as Prisma.StringFilter).lt = endDateStr;
      }
    }

    return where;
  }

  /**
   * Build orderBy clause with whitelisted fields
   */
  private buildOrderByClause(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Prisma.PointOrderByWithRelationInput {
    const allowedFields: Array<keyof Point> = [
      'createdAt',
      'updatedAt',
      'date',
      'availablePointsBalance',
      'availablePointsIncrease',
      'availablePointsDeduction',
    ];

    const field: keyof Point = allowedFields.includes(sortBy as keyof Point)
      ? (sortBy as keyof Point)
      : 'createdAt';

    return { [field]: sortOrder };
  }

  /**
   * Normalize Prisma errors into meaningful HTTP exceptions
   */
  private handlePrismaError(error: any, defaultMessage: string): never {
    if (error instanceof PointNotFoundException) {
      throw error;
    }

    if (error instanceof PointValidationException) {
      throw error;
    }

    if (error?.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      throw new PointValidationException(`Point with this ${field} already exists`);
    }

    if (error?.code === 'P2003') {
      throw new PointValidationException('Invalid point data');
    }

    if (error?.code === 'P2025') {
      throw new PointNotFoundException('Point not found');
    }

    if (error?.code === 'P1001') {
      throw new InternalServerErrorException('Database connection error');
    }

    throw new InternalServerErrorException(defaultMessage);
  }
}
