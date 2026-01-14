import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma, Announcement, AnnouncementType } from '@prisma/client';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { UpdateAnnouncementDto } from '../dto/update-announcement.dto';
import { QueryAnnouncementDto } from '../dto/query-announcement.dto';
import { AnnouncementEntity } from '../entities/announcement.entity';
import { AnnouncementMapper } from '../mapper/announcement.mapper';
import { EAnnouncementStatus } from '../enums/announcement.enum';

type AnnouncementWithRelations = Prisma.AnnouncementGetPayload<{
  include: {
    author: true;
  };
}>;

@Injectable()
export class AnnouncementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new announcement
   */
  async create(
    data: CreateAnnouncementDto,
    authorId: string,
  ): Promise<AnnouncementEntity> {
    try {
      const announcement = await this.prisma.announcement.create({
        data: {
          title: data.title,
          type: data.type,
          isFixed: data.isFixed ?? false,
          imageUrl: data.imageUrl,
          content: data.content,
          authorId: authorId,
          authorName: data.authorName,
          status: data.status || EAnnouncementStatus.ACTIVE,
          views: 0,
        },
        include: {
          author: true,
        },
      });

      return AnnouncementMapper.toEntityWithAuthor(announcement);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'An announcement with this configuration already exists',
          );
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Author not found');
        }
      }
      throw error;
    }
  }

  /**
   * Find all announcements with pagination, filtering, and search
   */
  async findAll(
    query: QueryAnnouncementDto,
  ): Promise<{ data: AnnouncementEntity[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, type, status, search } = query;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
    const where: Prisma.AnnouncementWhereInput = {};

    // Filter by type
    if (type) {
      where.type = type;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Search in title and content
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Execute queries in parallel
    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take,
        orderBy: [
          { isFixed: 'desc' }, // Pinned announcements first
          { createdAt: 'desc' }, // Then by creation date
        ],
        include: {
          author: true,
        },
      }),
      this.prisma.announcement.count({ where }),
    ]);

    const data = announcements.map((announcement) =>
      AnnouncementMapper.toEntityWithAuthor(announcement),
    );

    return { data, total, page, limit };
  }

  /**
   * Find a single announcement by ID
   */
  async findOne(id: string): Promise<AnnouncementEntity | null> {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        author: true,
      },
    });

    return announcement
      ? AnnouncementMapper.toEntityWithAuthor(announcement)
      : null;
  }

  /**
   * Update an announcement
   */
  async update(
    id: string,
    data: UpdateAnnouncementDto,
  ): Promise<AnnouncementEntity> {
    try {
      // Check if announcement exists
      const existingAnnouncement = await this.findOne(id);
      if (!existingAnnouncement) {
        throw new NotFoundException(`Announcement with ID ${id} not found`);
      }

      // Build update data object
      const updateData: Prisma.AnnouncementUpdateInput = {};

      if (data.title !== undefined) {
        updateData.title = data.title;
      }
      if (data.type !== undefined) {
        updateData.type = data.type;
      }
      if (data.isFixed !== undefined) {
        updateData.isFixed = data.isFixed;
      }
      if (data.imageUrl !== undefined) {
        updateData.imageUrl = data.imageUrl;
      }
      if (data.content !== undefined) {
        updateData.content = data.content;
      }
      if (data.status !== undefined) {
        updateData.status = data.status;
      }
      if (data.authorName !== undefined) {
        updateData.authorName = data.authorName;
      }
      // Update announcement
      const announcement = await this.prisma.announcement.update({
        where: { id },
        data: updateData,
        include: {
          author: true,
        },
      });

      return AnnouncementMapper.toEntityWithAuthor(announcement);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Announcement with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Remove an announcement (soft delete by updating status to inactive)
   */
  async remove(id: string): Promise<AnnouncementEntity> {
    try {
      // Check if announcement exists
      const existingAnnouncement = await this.findOne(id);
      if (!existingAnnouncement) {
        throw new NotFoundException(`Announcement with ID ${id} not found`);
      }

      const announcement = await this.prisma.announcement.update({
        where: { id },
        data: {
          status: EAnnouncementStatus.INACTIVE,
        },
        include: {
          author: true,
        },
      });

      return AnnouncementMapper.toEntityWithAuthor(announcement);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Announcement with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Increment views count for an announcement
   */
  async incrementViews(id: string): Promise<AnnouncementEntity> {
    try {
      const announcement = await this.prisma.announcement.update({
        where: { id },
        data: {
          views: {
            increment: 1,
          },
        },
        include: {
          author: true,
        },
      });

      return AnnouncementMapper.toEntityWithAuthor(announcement);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Announcement with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Find all announcements by a specific author
   */
  async findByAuthor(authorId: string): Promise<AnnouncementEntity[]> {
    const announcements = await this.prisma.announcement.findMany({
      where: {
        authorId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: true,
      },
    });

    return announcements.map((announcement) =>
      AnnouncementMapper.toEntityWithAuthor(announcement),
    );
  }

  /**
   * Count announcements by type
   */
  async countByType(type: AnnouncementType): Promise<number> {
    return await this.prisma.announcement.count({
      where: {
        type,
      },
    });
  }

  /**
   * Find all active announcements by type
   * Useful for frontend display
   */
  async findActiveByType(type: AnnouncementType): Promise<AnnouncementEntity[]> {
    const announcements = await this.prisma.announcement.findMany({
      where: {
        type,
        status: EAnnouncementStatus.ACTIVE,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: true,
      },
    });

    return announcements.map((announcement) =>
      AnnouncementMapper.toEntityWithAuthor(announcement),
    );
  }

  /**
   * Find all fixed/pinned announcements
   */
  async findFixedAnnouncements(): Promise<AnnouncementEntity[]> {
    const announcements = await this.prisma.announcement.findMany({
      where: {
        isFixed: true,
        status: EAnnouncementStatus.ACTIVE,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: true,
      },
    });

    return announcements.map((announcement) =>
      AnnouncementMapper.toEntityWithAuthor(announcement),
    );
  }

  /**
   * Toggle fixed status for an announcement
   */
  async toggleFixed(id: string): Promise<AnnouncementEntity> {
    try {
      // Get current announcement
      const current = await this.prisma.announcement.findUnique({
        where: { id },
      });

      if (!current) {
        throw new NotFoundException(`Announcement with ID ${id} not found`);
      }

      // Toggle the isFixed status
      const announcement = await this.prisma.announcement.update({
        where: { id },
        data: {
          isFixed: !current.isFixed,
        },
        include: {
          author: true,
        },
      });

      return AnnouncementMapper.toEntityWithAuthor(announcement);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Announcement with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Hard delete an announcement (permanent deletion)
   * Use this with caution - prefer soft delete with remove() method
   */
  async hardDelete(id: string): Promise<void> {
    try {
      await this.prisma.announcement.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Announcement with ID ${id} not found`);
        }
      }
      throw error;
    }
  }
}

