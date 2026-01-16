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
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleScheduledProductDiscountStatusUpdate() {
    this.logger.log('Starting scheduled product discount status update...');
    await this.updateAllProductDiscountStatuses();
    await this.recalculateProductSalePrices();
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
   * Recalculate sale prices for all products with active discounts
   * This method:
   * 1. Finds all active product discounts (status = true)
   * 2. Calculates new salePrice based on productPrice and discountRate
   * 3. Updates the product's salePrice
   */
  async recalculateProductSalePrices(): Promise<{
    totalProcessed: number;
    totalUpdated: number;
    errors: number;
  }> {
    this.logger.log('Starting product sale price recalculation based on active discounts');

    const startTime = Date.now();
    let totalProcessed = 0;
    let totalUpdated = 0;
    let errors = 0;

    try {
      // Get all active product discounts with their product information
      const activeDiscounts = await this.prisma.productDiscount.findMany({
        where: {
          status: true,
        },
        select: {
          id: true,
          productId: true,
          discountRate: true,
          product: {
            select: {
              id: true,
              productPrice: true,
              salePrice: true,
            },
          },
        },
      });

      this.logger.log(`Processing ${activeDiscounts.length} active product discounts`);

      // Process each active discount
      for (const discount of activeDiscounts) {
        try {
          // Skip if product doesn't exist or productPrice is not set
          if (!discount.product || discount.product.productPrice === null || discount.product.productPrice === undefined) {
            this.logger.warn(
              `Skipping product ${discount.productId}: product not found or productPrice not set`
            );
            totalProcessed++;
            continue;
          }

          // Calculate new sale price: productPrice * (1 - discountRate / 100)
          const productPrice = discount.product.productPrice;
          const discountRate = discount.discountRate;
          const newSalePrice = Math.floor(productPrice * (1 - discountRate / 100));

          // Only update if salePrice has changed
          if (discount.product.salePrice !== newSalePrice) {
            await this.prisma.product.update({
              where: { id: discount.productId },
              data: { salePrice: newSalePrice },
            });

            totalUpdated++;
            this.logger.debug(
              `Updated sale price for product ${discount.productId}: ` +
                `${discount.product.salePrice} -> ${newSalePrice} ` +
                `(productPrice: ${productPrice}, discountRate: ${discountRate}%)`
            );
          }

          totalProcessed++;
        } catch (error) {
          this.logger.error(
            `Error recalculating sale price for product ${discount.productId}: ${error.message}`,
            error.stack
          );
          errors++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Product sale price recalculation completed in ${duration}ms. ` +
          `Processed: ${totalProcessed}, Updated: ${totalUpdated}, Errors: ${errors}`
      );

      return {
        totalProcessed,
        totalUpdated,
        errors,
      };
    } catch (error) {
      this.logger.error(
        'Failed to recalculate product sale prices',
        error.stack
      );
      throw error;
    }
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

  /**
   * Recalculate sale price for a specific product by productId
   * This method:
   * 1. Finds the product discount for the given productId
   * 2. If discount is active, calculates new salePrice based on productPrice and discountRate
   * 3. If discount is not active or doesn't exist, sets salePrice to productPrice
   * 4. Updates the product's salePrice
   */
  async recalculateProductSalePricesById(productId: string): Promise<{
    salePrice: number;
  }> {
    this.logger.log(`Starting product sale price recalculation for product ${productId}`);

    try {
      // Get product with its current price information
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          productPrice: true,
          salePrice: true,
        },
      });

      if (!product) {
        this.logger.warn(`Product ${productId} not found`);
        throw new Error(`Product ${productId} not found`);
      }

      if (product.productPrice === null || product.productPrice === undefined) {
        this.logger.warn(`Product ${productId} does not have productPrice set`);
        throw new Error(`Product ${productId} does not have productPrice set`);
      }

      // Get product discount for this product
      const discount = await this.prisma.productDiscount.findUnique({
        where: { productId },
        select: {
          id: true,
          status: true,
          discountRate: true,
        },
      });

      let newSalePrice: number;

      // If discount exists and is active, calculate discounted price
      if (discount && discount.status === true) {
        // Calculate new sale price: productPrice * (1 - discountRate / 100)
        newSalePrice = Math.floor(product.productPrice * (1 - discount.discountRate / 100));
        this.logger.debug(
          `Calculating discounted price for product ${productId}: ` +
            `${product.productPrice} * (1 - ${discount.discountRate}%) = ${newSalePrice}`
        );
      } else {
        // If no discount or discount is not active, set salePrice to productPrice
        newSalePrice = product.productPrice;
        this.logger.debug(
          `No active discount for product ${productId}, setting salePrice to productPrice: ${newSalePrice}`
        );
      }

      // Update the product's salePrice
      await this.prisma.product.update({
        where: { id: productId },
        data: { salePrice: newSalePrice },
      });

      this.logger.log(
        `Updated sale price for product ${productId}: ${product.salePrice} -> ${newSalePrice}`
      );

      return {
        salePrice: newSalePrice,
      };
    } catch (error) {
      this.logger.error(
        `Failed to recalculate sale price for product ${productId}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}

