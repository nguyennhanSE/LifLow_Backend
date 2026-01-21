import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class CouponCronjobService {
  private readonly logger = new Logger(CouponCronjobService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scheduled cron job that runs every hour to check and deactivate expired coupons
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'deactivate-expired-coupons',
    timeZone: 'Asia/Seoul',
  })
  async handleScheduledCouponExpirationCheck() {
    this.logger.log('Starting scheduled coupon expiration check...');
    await this.deactivateExpiredCoupons();
    this.logger.log('Completed scheduled coupon expiration check');
  }

  /**
   * Main method to deactivate all expired coupons
   * Checks coupons where endDate < current date and isActive = true
   * Sets isActive to false for expired coupons
   */
  async deactivateExpiredCoupons(): Promise<{
    totalProcessed: number;
    totalDeactivated: number;
    errors: number;
  }> {
    this.logger.log('Starting expired coupon deactivation for all records');

    const startTime = Date.now();
    let totalProcessed = 0;
    let totalDeactivated = 0;
    let errors = 0;

    try {
      const now = new Date();

      // Find all active coupons that have expired (endDate < now)
      const expiredCoupons = await this.prisma.coupon.findMany({
        where: {
          isActive: true,
          endDate: {
            lt: now,
          },
        },
        select: {
          id: true,
          code: true,
          name: true,
          endDate: true,
        },
      });

      this.logger.log(`Found ${expiredCoupons.length} expired coupon(s) to deactivate`);

      // Process each expired coupon
      for (const coupon of expiredCoupons) {
        try {
          await this.prisma.coupon.update({
            where: { id: coupon.id },
            data: { isActive: false },
          });

          totalDeactivated++;
          this.logger.debug(
            `Deactivated expired coupon: ${coupon.code} (${coupon.name}) - expired on ${coupon.endDate.toISOString()}`,
          );

          totalProcessed++;
        } catch (error) {
          this.logger.error(
            `Error deactivating coupon ${coupon.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error instanceof Error ? error.stack : undefined,
          );
          errors++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Expired coupon deactivation completed in ${duration}ms. ` +
          `Processed: ${totalProcessed}, Deactivated: ${totalDeactivated}, Errors: ${errors}`,
      );

      return {
        totalProcessed,
        totalDeactivated,
        errors,
      };
    } catch (error) {
      this.logger.error(
        'Failed to deactivate expired coupons',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Manually check and deactivate a specific coupon by ID
   * Useful when creating or updating a coupon manually
   */
  async checkAndDeactivateCoupon(couponId: string): Promise<{
    deactivated: boolean;
    reason?: string;
  }> {
    try {
      const coupon = await this.prisma.coupon.findUnique({
        where: { id: couponId },
        select: {
          id: true,
          code: true,
          name: true,
          endDate: true,
          isActive: true,
        },
      });

      if (!coupon) {
        this.logger.warn(`Coupon ${couponId} not found`);
        return { deactivated: false, reason: 'Coupon not found' };
      }

      const now = new Date();

      // Check if coupon has expired
      if (coupon.isActive && coupon.endDate < now) {
        await this.prisma.coupon.update({
          where: { id: couponId },
          data: { isActive: false },
        });

        this.logger.debug(
          `Deactivated expired coupon: ${coupon.code} (${coupon.name}) - expired on ${coupon.endDate.toISOString()}`,
        );

        return { deactivated: true, reason: 'Coupon expired' };
      }

      return { deactivated: false, reason: 'Coupon is still valid or already inactive' };
    } catch (error) {
      this.logger.error(
        `Error checking coupon ${couponId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
