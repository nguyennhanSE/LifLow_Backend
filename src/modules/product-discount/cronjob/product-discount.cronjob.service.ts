import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ProductDiscountCronjobService {
  private readonly logger = new Logger(ProductDiscountCronjobService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scheduled cron job that runs every hour to check and update product discount status
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleScheduledProductDiscountStatusUpdate() {
    this.logger.log('Starting scheduled product discount status update...');
    await this.updateAllProductDiscountStatuses();
    this.logger.log('Completed scheduled product discount status update');
  }

  /**
   * Main method to update all product discount statuses based on their date ranges
   * This should be called when:
   * 1. Scheduled cron job runs
   * 2. Admin creates/updates a product discount
   */
  async updateAllProductDiscountStatuses(): Promise<{
    totalProcessed: number;
    totalActivated: number;
    totalDeactivated: number;
    errors: number;
  }> {
    this.logger.log('Starting product discount status update for all records');

    const startTime = Date.now();
    let totalProcessed = 0;
    let totalActivated = 0;
    let totalDeactivated = 0;
    let errors = 0;

    try {
      // Get all product discounts
      const productDiscounts = await this.prisma.productDiscount.findMany({
        select: {
          id: true,
          productId: true,
          discountStartDate: true,
          discountEndDate: true,
          status: true,
        },
      });

      this.logger.log(`Processing ${productDiscounts.length} product discounts`);

      const now = new Date();

      // Process each product discount
      for (const discount of productDiscounts) {
        try {
          const shouldBeActive = this.shouldDiscountBeActive(
            discount.discountStartDate,
            discount.discountEndDate,
            now
          );

          // Only update if status needs to change
          if (discount.status !== shouldBeActive) {
            await this.prisma.productDiscount.update({
              where: { id: discount.id },
              data: { status: shouldBeActive },
            });

            if (shouldBeActive) {
              totalActivated++;
              this.logger.debug(
                `Activated product discount for product ${discount.productId}`
              );
            } else {
              totalDeactivated++;
              this.logger.debug(
                `Deactivated product discount for product ${discount.productId}`
              );
            }
          }

          totalProcessed++;
        } catch (error) {
          this.logger.error(
            `Error processing product discount ${discount.id}: ${error.message}`,
            error.stack
          );
          errors++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Product discount status update completed in ${duration}ms. ` +
          `Processed: ${totalProcessed}, Activated: ${totalActivated}, ` +
          `Deactivated: ${totalDeactivated}, Errors: ${errors}`
      );

      return {
        totalProcessed,
        totalActivated,
        totalDeactivated,
        errors,
      };
    } catch (error) {
      this.logger.error(
        'Failed to update product discount statuses',
        error.stack
      );
      throw error;
    }
  }

  /**
   * Update status for a specific product discount
   * Useful when creating or updating a discount manually
   */
  async updateProductDiscountStatus(
    productDiscountId: string
  ): Promise<{ status: boolean; action: 'activated' | 'deactivated' | 'unchanged' }> {
    const discount = await this.prisma.productDiscount.findUnique({
      where: { id: productDiscountId },
      select: {
        id: true,
        discountStartDate: true,
        discountEndDate: true,
        status: true,
      },
    });

    if (!discount) {
      this.logger.warn(`Product discount ${productDiscountId} not found`);
      throw new Error(`Product discount ${productDiscountId} not found`);
    }

    const now = new Date();
    const shouldBeActive = this.shouldDiscountBeActive(
      discount.discountStartDate,
      discount.discountEndDate,
      now
    );

    // Only update if status needs to change
    if (discount.status !== shouldBeActive) {
      await this.prisma.productDiscount.update({
        where: { id: productDiscountId },
        data: { status: shouldBeActive },
      });

      const action = shouldBeActive ? 'activated' : 'deactivated';
      this.logger.debug(
        `${action.charAt(0).toUpperCase() + action.slice(1)} product discount ${productDiscountId}`
      );
      return { status: shouldBeActive, action };
    }

    return { status: discount.status, action: 'unchanged' };
  }

  /**
   * Determine if a discount should be active based on date range
   * Returns true if:
   * - Both dates are set and current date is within range
   * - Only startDate is set and current date >= startDate
   * - Only endDate is set and current date <= endDate
   * Returns false if:
   * - Both dates are null
   * - Current date is outside the date range
   */
  private shouldDiscountBeActive(
    startDate: Date | null,
    endDate: Date | null,
    currentDate: Date
  ): boolean {
    // If both dates are null, discount should not be active
    if (!startDate && !endDate) {
      return false;
    }

    // Check start date
    if (startDate && currentDate < startDate) {
      return false;
    }

    // Check end date
    if (endDate && currentDate > endDate) {
      return false;
    }

    // If we get here, discount should be active
    return true;
  }
}

