import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AnnouncementType } from '@prisma/client';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { QueryAnnouncementDto } from './dto/query-announcement.dto';
import { AnnouncementsRepository } from './repositories/announcements.repository';
import { AnnouncementEntity } from './entities/announcement.entity';
import { EAnnouncementStatus } from './enums/announcement.enum';
import { AwsService } from '../../libs/integration/aws/aws.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  extractBase64Images,
  replaceBase64WithUrls,
} from './helpers/html-image.helper';

export interface AnnouncementStatistics {
  totalCount: number;
  byType: {
    [key in AnnouncementType]: number;
  };
  byStatus: {
    active: number;
    inactive: number;
  };
  totalViews: number;
}

export interface PaginatedAnnouncementResponse {
  data: AnnouncementEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly announcementsRepository: AnnouncementsRepository,
    private readonly awsService: AwsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new announcement with optional image upload (as a transaction)
   */
  async create(
    createDto: CreateAnnouncementDto,
    authorId: string,
    file?: Express.Multer.File,
  ): Promise<AnnouncementEntity> {
    let uploadedImageUrl: string | undefined;
    let imageKey: string | undefined;
    const uploadedBase64ImageKeys: string[] = [];

    try {
      // Validate authorId is provided
      if (!authorId) {
        throw new BadRequestException('Author ID is required');
      }

      // Step 1: Get author name from User if not provided
      if (!createDto.authorName) {
        const user = await this.prisma.user.findUnique({
          where: { id: authorId },
          select: { name: true },
        });
        
        if (user && user.name) {
          createDto.authorName = user.name;
        }
      }

      // Step 2: Process base64 images in content and replace with S3 URLs
      if (createDto.content) {
        const base64Images = extractBase64Images(createDto.content);
        
        if (base64Images.length > 0) {
          const replacements = new Map<string, string>();
          
          // Upload each base64 image to S3
          for (const image of base64Images) {
            try {
              const s3Url = await this.awsService.uploadBase64Image(
                'announcements/content',
                authorId,
                image.base64Data,
                image.mimeType,
              );
              
              replacements.set(image.dataUrl, s3Url);
              
              // Store key for potential rollback
              const urlParts = s3Url.split('.amazonaws.com/');
              const key = urlParts && urlParts.length > 1 ? urlParts[1] : undefined;
              if (key) {
                uploadedBase64ImageKeys.push(key);
              }
            } catch (uploadError) {
              console.error('Failed to upload base64 image:', uploadError);
              // Continue with other images, but log the error
            }
          }
          
          // Replace base64 URLs with S3 URLs in content
          if (replacements.size > 0) {
            createDto.content = replaceBase64WithUrls(
              createDto.content,
              replacements,
            );
          }
        }
      }

      // Step 3: Upload image to AWS if file is provided
      if (file) {
        uploadedImageUrl = await this.awsService.uploadFile(
          'announcements',
          authorId,
          file,
        );
        createDto.imageUrl = uploadedImageUrl;

        // Extract the key from URL for potential rollback
        // URL format: https://bucket.s3.region.amazonaws.com/key
        const urlParts = uploadedImageUrl?.split('.amazonaws.com/');
        imageKey = urlParts && urlParts.length > 1 ? urlParts[1] : undefined;
      }

      // Step 4: Create announcement through repository
      const announcement = await this.announcementsRepository.create(
        createDto,
        authorId,
      );

      return announcement;
    } catch (error) {
      // Rollback: Delete uploaded images if announcement creation fails
      if (uploadedImageUrl && imageKey) {
        try {
          await this.awsService.deleteObject(imageKey);
        } catch (deleteError) {
          // Log delete error but don't throw to preserve original error
          console.error('Failed to delete uploaded image during rollback:', deleteError);
        }
      }

      // Rollback: Delete all uploaded base64 images
      for (const key of uploadedBase64ImageKeys) {
        try {
          await this.awsService.deleteObject(key);
        } catch (deleteError) {
          console.error(`Failed to delete base64 image ${key} during rollback:`, deleteError);
        }
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create announcement: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Find all announcements with pagination and filters
   */
  async findAll(
    query: QueryAnnouncementDto,
  ): Promise<PaginatedAnnouncementResponse> {
    try {
      // Set defaults
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;

      const queryWithDefaults: QueryAnnouncementDto = {
        ...query,
        page,
        limit,
      };

      // Get announcements from repository
      const result =
        await this.announcementsRepository.findAll(queryWithDefaults);

      // Calculate total pages
      const totalPages = Math.ceil(result.total / result.limit);

      return {
        ...result,
        totalPages,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch announcements: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Find a single announcement by ID
   * Automatically increments view count
   */
  async findOne(id: string): Promise<AnnouncementEntity> {
    try {
      // Find the announcement
      const announcement = await this.announcementsRepository.findOne(id);

      if (!announcement) {
        throw new NotFoundException(`Announcement with ID ${id} not found`);
      }

      // Increment views asynchronously (don't wait for it)
      // This way we return the announcement quickly without waiting for the view increment
      this.announcementsRepository
        .incrementViews(id)
        .catch((error) => {
          // Log error but don't throw - view increment failure shouldn't block the request
          console.error(`Failed to increment views for announcement ${id}:`, error);
        });

      return announcement;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch announcement: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update an announcement with optional image upload (as a transaction)
   * Verifies that the user is the author of the announcement
   */
  async update(
    id: string,
    updateDto: UpdateAnnouncementDto,
    authorId: string,
    file?: Express.Multer.File,
  ): Promise<AnnouncementEntity> {
    let uploadedImageUrl: string | undefined;
    let imageKey: string | undefined;
    let oldImageUrl: string | undefined;
    const uploadedBase64ImageKeys: string[] = [];

    try {
      // Find the announcement first
      const announcement = await this.announcementsRepository.findOne(id);

      if (!announcement) {
        throw new NotFoundException(`Announcement with ID ${id} not found`);
      }

      // Verify author ownership
      if (announcement.authorId !== authorId) {
        throw new ForbiddenException(
          'You do not have permission to update this announcement',
        );
      }

      // Store old image URL for potential deletion
      oldImageUrl = announcement.imageUrl || undefined;

      // Step 2: Process base64 images in content and replace with S3 URLs
      if (updateDto.content) {
        const base64Images = extractBase64Images(updateDto.content);
        
        if (base64Images.length > 0) {
          const replacements = new Map<string, string>();
          
          // Upload each base64 image to S3
          for (const image of base64Images) {
            try {
              const s3Url = await this.awsService.uploadBase64Image(
                'announcements/content',
                authorId,
                image.base64Data,
                image.mimeType,
              );
              
              replacements.set(image.dataUrl, s3Url);
              
              // Store key for potential rollback
              const urlParts = s3Url.split('.amazonaws.com/');
              const key = urlParts && urlParts.length > 1 ? urlParts[1] : undefined;
              if (key) {
                uploadedBase64ImageKeys.push(key);
              }
            } catch (uploadError) {
              console.error('Failed to upload base64 image:', uploadError);
              // Continue with other images, but log the error
            }
          }
          
          // Replace base64 URLs with S3 URLs in content
          if (replacements.size > 0) {
            updateDto.content = replaceBase64WithUrls(
              updateDto.content,
              replacements,
            );
          }
        }
      }

      // Step 3: Upload new image to AWS if file is provided
      if (file) {
        uploadedImageUrl = await this.awsService.uploadFile(
          'announcements',
          authorId,
          file,
        );
        updateDto.imageUrl = uploadedImageUrl;

        // Extract the key from URL for potential rollback
        const urlParts = uploadedImageUrl?.split('.amazonaws.com/');
        imageKey = urlParts && urlParts.length > 1 ? urlParts[1] : undefined;
      }

      // Step 4: Update the announcement
      const updatedAnnouncement = await this.announcementsRepository.update(
        id,
        updateDto,
      );

      // Step 5: Delete old image if new image was uploaded successfully
      if (file && oldImageUrl) {
        try {
          const oldUrlParts = oldImageUrl.split('.amazonaws.com/');
          const oldImageKey = oldUrlParts && oldUrlParts.length > 1 ? oldUrlParts[1] : undefined;
          if (oldImageKey) {
            await this.awsService.deleteObject(oldImageKey);
          }
        } catch (deleteError) {
          // Log but don't throw - update was successful
          console.error('Failed to delete old image:', deleteError);
        }
      }

      return updatedAnnouncement;
    } catch (error) {
      // Rollback: Delete newly uploaded image if update fails
      if (uploadedImageUrl && imageKey) {
        try {
          await this.awsService.deleteObject(imageKey);
        } catch (deleteError) {
          console.error('Failed to delete uploaded image during rollback:', deleteError);
        }
      }

      // Rollback: Delete all uploaded base64 images
      for (const key of uploadedBase64ImageKeys) {
        try {
          await this.awsService.deleteObject(key);
        } catch (deleteError) {
          console.error(`Failed to delete base64 image ${key} during rollback:`, deleteError);
        }
      }

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update announcement: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Remove an announcement (soft delete)
   * Verifies that the user is the author of the announcement
   */
  async remove(id: string, authorId: string): Promise<AnnouncementEntity> {
    try {
      // Find the announcement first
      const announcement = await this.announcementsRepository.findOne(id);

      if (!announcement) {
        throw new NotFoundException(`Announcement with ID ${id} not found`);
      }

      // Verify author ownership
      if (announcement.authorId !== authorId) {
        throw new ForbiddenException(
          'You do not have permission to delete this announcement',
        );
      }

      // Soft delete the announcement (set status to inactive)
      const removedAnnouncement = await this.announcementsRepository.remove(id);

      return removedAnnouncement;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to remove announcement: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get statistics about announcements
   * Returns counts by type, status, and total views
   */
  async getStatistics(): Promise<AnnouncementStatistics> {
    try {
      // Count by each type
      const [generalCount, recipeCount, userCount] = await Promise.all([
        this.announcementsRepository.countByType(AnnouncementType.GENERAL),
        this.announcementsRepository.countByType(AnnouncementType.RECIPE),
        this.announcementsRepository.countByType(AnnouncementType.USER),
      ]);

      // Get all announcements to calculate status counts and total views
      const allAnnouncements = await this.announcementsRepository.findAll({
        page: 1,
        limit: 999999, // Get all for statistics
      });

      // Calculate status counts
      const activeCount = allAnnouncements.data.filter(
        (a) => a.status === EAnnouncementStatus.ACTIVE,
      ).length;
      const inactiveCount = allAnnouncements.data.filter(
        (a) => a.status === EAnnouncementStatus.INACTIVE,
      ).length;

      // Calculate total views
      const totalViews = allAnnouncements.data.reduce(
        (sum, announcement) => sum + announcement.views,
        0,
      );

      return {
        totalCount: allAnnouncements.total,
        byType: {
          [AnnouncementType.GENERAL]: generalCount,
          [AnnouncementType.RECIPE]: recipeCount,
          [AnnouncementType.USER]: userCount,
        },
        byStatus: {
          active: activeCount,
          inactive: inactiveCount,
        },
        totalViews,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Find announcements by author
   */
  async findByAuthor(authorId: string): Promise<AnnouncementEntity[]> {
    try {
      return await this.announcementsRepository.findByAuthor(authorId);
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch announcements by author: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Find active announcements by type
   * Useful for public-facing pages
   */
  async findActiveByType(type: AnnouncementType): Promise<AnnouncementEntity[]> {
    try {
      return await this.announcementsRepository.findActiveByType(type);
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch active announcements: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get all fixed/pinned announcements
   */
  async findFixedAnnouncements(): Promise<AnnouncementEntity[]> {
    try {
      return await this.announcementsRepository.findFixedAnnouncements();
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch fixed announcements: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Toggle fixed status for an announcement (admin only)
   */
  async toggleFixed(id: string): Promise<AnnouncementEntity> {
    try {
      return await this.announcementsRepository.toggleFixed(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to toggle fixed status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Admin method to hard delete an announcement
   * Use with caution - this is permanent
   */
  async hardDelete(id: string): Promise<void> {
    try {
      const announcement = await this.announcementsRepository.findOne(id);

      if (!announcement) {
        throw new NotFoundException(`Announcement with ID ${id} not found`);
      }

      await this.announcementsRepository.hardDelete(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to hard delete announcement: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
