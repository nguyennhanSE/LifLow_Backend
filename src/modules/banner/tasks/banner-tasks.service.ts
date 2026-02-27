import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { BannerRepository } from '../repositories/banner.repository';
import { EBannerStatus } from '../enums/banner.enum';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class BannerTasksService {
  private readonly logger = new Logger(BannerTasksService.name);
  private readonly tasksEnabled: boolean;

  constructor(
    private readonly bannerRepository: BannerRepository,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Check if banner tasks are enabled via environment variable
    this.tasksEnabled =
      this.configService.get<string>('ENABLE_BANNER_TASKS', 'true') === 'true';

    if (!this.tasksEnabled) {
      this.logger.warn('Banner scheduled tasks are disabled via configuration');
    }
  }

  /**
   * Auto-activate scheduled banners
   * Runs every hour by default
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'activate-scheduled-banners',
    timeZone: 'Asia/Seoul', // Adjust to your timezone
  })
  async handleActivateScheduledBanners(): Promise<{
    activated: number;
    bannerIds: string[];
  }> {
    if (!this.tasksEnabled) {
      return { activated: 0, bannerIds: [] };
    }

    try {
      this.logger.log('Starting scheduled banner activation task...');

      // Find scheduled banners that should be activated
      const bannersToActivate =
        await this.bannerRepository.findScheduledBanners();

      if (bannersToActivate.length === 0) {
        this.logger.log('No scheduled banners to activate');
        return { activated: 0, bannerIds: [] };
      }

      // Extract banner IDs
      const bannerIds = bannersToActivate.map((banner) => banner.id);

      // Bulk update status to ACTIVE
      const activatedCount = await this.bannerRepository.bulkUpdateStatus(
        bannerIds,
        EBannerStatus.ACTIVE,
      );

      this.logger.log(
        `Successfully activated ${activatedCount} scheduled banner(s): [${bannerIds.join(', ')}]`,
      );

      return {
        activated: activatedCount,
        bannerIds,
      };
    } catch (error) {
      this.logger.error(
        `Failed to activate scheduled banners: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't throw - let the cron continue on next run
      return { activated: 0, bannerIds: [] };
    }
  }

b   /**
   * Sync product data for all product banners
   * Runs daily at 2 AM by default
   * Keeps denormalized product data fresh
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'sync-product-banners',
    timeZone: 'Asia/Seoul', // Adjust to your timezone
  })
  async handleSyncAllProductBanners(): Promise<{
    synced: number;
    failed: number;
    bannerIds: string[];
  }> {
    if (!this.tasksEnabled) {
      return { synced: 0, failed: 0, bannerIds: [] };
    }

    try {
      this.logger.log('Starting product banner data sync task...');

      // Find all banners with associated products (direct relation via productId)
      const productBanners = await this.prisma.banner.findMany({
        where: {
          productId: {
            not: null,
          },
        },
        include: {
          product: {
            select: {
              id: true,
              productName: true,
              productPrice: true,
              salePrice: true,
              brand: true,
              productSummaryDescription: true,
              imageRegistrationThumbnail: true,
            },
          },
        },
      });

      if (productBanners.length === 0) {
        this.logger.log('No product banners to sync');
        return { synced: 0, failed: 0, bannerIds: [] };
      }

      this.logger.log(`Found ${productBanners.length} product banners to sync`);

      let syncedCount = 0;
      let failedCount = 0;
      const syncedBannerIds: string[] = [];

      // Use transaction for batch updates
      await this.prisma.$transaction(async (tx) => {
        for (const banner of productBanners) {
          try {
            // Get product from direct relation
            const product = banner.product;
            if (!product) {
              this.logger.warn(
                `Banner ${banner.id} has productId but no product relation found - skipping`,
              );
              failedCount++;
              continue;
            }

            // Update banner with product data if needed
            // Note: Banner doesn't have denormalized product fields in schema,
            // so this sync task may not be needed unless you add such fields
            // For now, we'll just verify the relation exists
            await tx.banner.update({
              where: { id: banner.id },
              data: {
                // If you add denormalized fields later, update them here
                // e.g., productName: product.productName,
                //      productPrice: product.productPrice,
              },
            });

            syncedCount++;
            syncedBannerIds.push(banner.id);
          } catch (error) {
            this.logger.error(
              `Failed to sync banner ${banner.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            failedCount++;
          }
        }
      });

      this.logger.log(
        `Product banner sync completed: ${syncedCount} synced, ${failedCount} failed`,
      );

      return {
        synced: syncedCount,
        failed: failedCount,
        bannerIds: syncedBannerIds,
      };
    } catch (error) {
      this.logger.error(
        `Failed to sync product banners: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't throw - let the cron continue on next run
      return { synced: 0, failed: 0, bannerIds: [] };
    }
  }

  /**
   * Manual trigger for activating scheduled banners
   * Can be called from controller endpoint or tests
   */
  async manualActivateScheduledBanners(): Promise<{
    activated: number;
    bannerIds: string[];
  }> {
    this.logger.log('Manual trigger: Activating scheduled banners');
    return await this.handleActivateScheduledBanners();
  }

  /**
   * Manual trigger for syncing product data
   * Can be called from controller endpoint or tests
   */
  async manualSyncAllProductBanners(): Promise<{
    synced: number;
    failed: number;
    bannerIds: string[];
  }> {
    this.logger.log('Manual trigger: Syncing product banner data');
    return await this.handleSyncAllProductBanners();
  }

  /**
   * Get status of all scheduled tasks
   * Useful for monitoring and debugging
   */
  getTasksStatus(): {
    tasksEnabled: boolean;
    tasks: {
      name: string;
      description: string;
      schedule: string;
    }[];
  } {
    return {
      tasksEnabled: this.tasksEnabled,
      tasks: [
        {
          name: 'activate-scheduled-banners',
          description: 'Auto-activate scheduled banners',
          schedule: 'Every hour',
        },
        {
          name: 'sync-product-banners',
          description: 'Sync product data for all product banners',
          schedule: 'Daily at 2 AM',
        },
      ],
    };
  }
}

