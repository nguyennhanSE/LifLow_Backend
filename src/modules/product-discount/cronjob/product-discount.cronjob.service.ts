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
    this.logger.log('Starting scheduled product discount and special offer status update...');
    await this.updateAllProductDiscountStatuses();
    await this.updateAllProductSpecialOfferStatuses();
    await this.recalculateProductSalePrices();
    this.logger.log('Completed scheduled product discount and special offer status update');
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
        productId: true,
        discountStartDate: true,
        discountEndDate: true,
        status: true,
        product: {
          select: {
            id: true,
            consumerPrice: true,
            salePrice: true,
          },
        },
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
      
      // Recalculate sale price considering both productDiscount and specialOffer
      if (discount.product && discount.product.consumerPrice !== null && discount.product.consumerPrice !== undefined) {
        try {
          await this.recalculateProductSalePricesById(discount.productId);
        } catch (error) {
          this.logger.error(
            `Error recalculating salePrice for product ${discount.productId}: ${error.message}`,
            error.stack
          );
        }
      }
      
      return { status: shouldBeActive, action };
    }

    return { status: discount.status, action: 'unchanged' };
  }

  /**
   * Update all product special offer statuses based on their date ranges
   */
  async updateAllProductSpecialOfferStatuses(): Promise<{
    totalProcessed: number;
    totalActivated: number;
    totalDeactivated: number;
    errors: number;
  }> {
    this.logger.log('Starting product special offer status update for all records');

    const startTime = Date.now();
    let totalProcessed = 0;
    let totalActivated = 0;
    let totalDeactivated = 0;
    let errors = 0;

    try {
      // Get all product special offers
      const productSpecialOffers = await this.prisma.productSpecialOffer.findMany({
        select: {
          id: true,
          productId: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      });

      this.logger.log(`Processing ${productSpecialOffers.length} product special offers`);

      const now = new Date();

      // Process each product special offer
      for (const specialOffer of productSpecialOffers) {
        try {
          const shouldBeActive = this.shouldSpecialOfferBeActive(
            specialOffer.startDate,
            specialOffer.endDate,
            now
          );

          // Only update if status needs to change
          if (specialOffer.status !== shouldBeActive) {
            await this.prisma.productSpecialOffer.update({
              where: { id: specialOffer.id },
              data: { status: shouldBeActive },
            });

            if (shouldBeActive) {
              totalActivated++;
              this.logger.debug(
                `Activated product special offer for product ${specialOffer.productId}`
              );
            } else {
              totalDeactivated++;
              this.logger.debug(
                `Deactivated product special offer for product ${specialOffer.productId}`
              );
            }
          }

          totalProcessed++;
        } catch (error) {
          this.logger.error(
            `Error processing product special offer ${specialOffer.id}: ${error.message}`,
            error.stack
          );
          errors++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Product special offer status update completed in ${duration}ms. ` +
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
        'Failed to update product special offer statuses',
        error.stack
      );
      throw error;
    }
  }

  /**
   * Update status for a specific product special offer
   * Useful when creating or updating a special offer manually
   */
  async updateProductSpecialOfferStatus(
    productSpecialOfferId: string
  ): Promise<{ status: boolean; action: 'activated' | 'deactivated' | 'unchanged' }> {
    const specialOffer = await this.prisma.productSpecialOffer.findUnique({
      where: { id: productSpecialOfferId },
      select: {
        id: true,
        productId: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    if (!specialOffer) {
      this.logger.warn(`Product special offer ${productSpecialOfferId} not found`);
      throw new Error(`Product special offer ${productSpecialOfferId} not found`);
    }

    const now = new Date();
    const shouldBeActive = this.shouldSpecialOfferBeActive(
      specialOffer.startDate,
      specialOffer.endDate,
      now
    );

    // Only update if status needs to change
    if (specialOffer.status !== shouldBeActive) {
      await this.prisma.productSpecialOffer.update({
        where: { id: productSpecialOfferId },
        data: { status: shouldBeActive },
      });

      const action = shouldBeActive ? 'activated' : 'deactivated';
      this.logger.debug(
        `${action.charAt(0).toUpperCase() + action.slice(1)} product special offer ${productSpecialOfferId}`
      );
      
      // Recalculate sale price considering both productDiscount and specialOffer
      try {
        const product = await this.prisma.product.findUnique({
          where: { id: specialOffer.productId },
          select: {
            id: true,
            consumerPrice: true,
          },
        });

        if (product && product.consumerPrice !== null && product.consumerPrice !== undefined) {
          await this.recalculateProductSalePricesById(specialOffer.productId);
        }
      } catch (error) {
        this.logger.error(
          `Error recalculating salePrice for product ${specialOffer.productId}: ${error.message}`,
          error.stack
        );
      }
      
      return { status: shouldBeActive, action };
    }

    return { status: specialOffer.status, action: 'unchanged' };
  }

  /**
   * Recalculate sale prices for all products with discounts and special offers
   * This method:
   * 1. Finds all products with discounts or special offers (both active and inactive)
   * 2. For active productDiscount: calculates discounted price based on consumerPrice and discountRate
   * 3. For active specialOffer: subtracts discountAmount from the price (after productDiscount if both are active)
   * 4. Priority: productDiscount is applied first, then specialOffer
   * 5. Updates the product's salePrice
   */
  async recalculateProductSalePrices(): Promise<{
    totalProcessed: number;
    totalUpdated: number;
    errors: number;
  }> {
    this.logger.log('Starting product sale price recalculation based on discount and special offer status');

    const startTime = Date.now();
    let totalProcessed = 0;
    let totalUpdated = 0;
    let errors = 0;

    try {
      // Get all products that have either discount or special offer
      const productsWithDiscounts = await this.prisma.product.findMany({
        where: {
          OR: [
            { productDiscount: { isNot: null } },
            { productSpecialOffer: { isNot: null } },
          ],
        },
        select: {
          id: true,
          consumerPrice: true,
          salePrice: true,
          productDiscount: {
            select: {
              id: true,
              status: true,
              discountRate: true,
            },
          },
          productSpecialOffer: {
            select: {
              id: true,
              status: true,
              discountAmount: true,
            },
          },
        },
      });

      this.logger.log(`Processing ${productsWithDiscounts.length} products with discounts or special offers`);

      // Process each product
      for (const product of productsWithDiscounts) {
        try {
          // Skip if consumerPrice is not set
          if (product.consumerPrice === null || product.consumerPrice === undefined) {
            this.logger.warn(
              `Skipping product ${product.id}: consumerPrice not set`
            );
            totalProcessed++;
            continue;
          }

          const consumerPrice = product.consumerPrice;
          let newSalePrice: number = consumerPrice;

          // Apply productDiscount first if active
          if (product.productDiscount && product.productDiscount.status === true) {
            const discountRate = product.productDiscount.discountRate;
            newSalePrice = Math.floor(consumerPrice * (1 - discountRate / 100));
            this.logger.debug(
              `Applied productDiscount for product ${product.id}: ` +
                `${consumerPrice} -> ${newSalePrice} (discountRate: ${discountRate}%)`
            );
          }

          // Then apply specialOffer if active (subtract discountAmount from already discounted price)
          if (product.productSpecialOffer && product.productSpecialOffer.status === true) {
            const discountAmount = product.productSpecialOffer.discountAmount;
            newSalePrice = Math.max(0, newSalePrice - discountAmount); // Ensure price doesn't go below 0
            this.logger.debug(
              `Applied specialOffer for product ${product.id}: ` +
                `price -> ${newSalePrice} (discountAmount: ${discountAmount})`
            );
          }

          // If both discounts are inactive, reset to consumerPrice
          const hasActiveDiscount = product.productDiscount?.status === true;
          const hasActiveSpecialOffer = product.productSpecialOffer?.status === true;
          if (!hasActiveDiscount && !hasActiveSpecialOffer) {
            newSalePrice = consumerPrice;
          }

          // Only update if salePrice has changed
          if (product.salePrice !== newSalePrice) {
            await this.prisma.product.update({
              where: { id: product.id },
              data: { salePrice: newSalePrice },
            });

            totalUpdated++;
            this.logger.debug(
              `Updated sale price for product ${product.id}: ` +
                `${product.salePrice} -> ${newSalePrice} ` +
                `(consumerPrice: ${consumerPrice}, ` +
                `productDiscount: ${hasActiveDiscount && product.productDiscount ? `${product.productDiscount.discountRate}%` : 'inactive'}, ` +
                `specialOffer: ${hasActiveSpecialOffer && product.productSpecialOffer ? `${product.productSpecialOffer.discountAmount}` : 'inactive'})`
            );
          }

          totalProcessed++;
        } catch (error) {
          this.logger.error(
            `Error recalculating sale price for product ${product.id}: ${error.message}`,
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
   * 1. Finds the product discount and special offer for the given productId
   * 2. If productDiscount is active, calculates discounted price based on consumerPrice and discountRate
   * 3. If specialOffer is active, subtracts discountAmount from the price (after productDiscount if both are active)
   * 4. Priority: productDiscount is applied first, then specialOffer
   * 5. Updates the product's salePrice
   */
  async recalculateProductSalePricesById(productId: string): Promise<{
    salePrice: number;
  }> {
    this.logger.log(`Starting product sale price recalculation for product ${productId}`);

    try {
      // Get product with its current price information, discount, and special offer
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          consumerPrice: true,
          salePrice: true,
          productDiscount: {
            select: {
              id: true,
              status: true,
              discountRate: true,
            },
          },
          productSpecialOffer: {
            select: {
              id: true,
              status: true,
              discountAmount: true,
            },
          },
        },
      });

      if (!product) {
        this.logger.warn(`Product ${productId} not found`);
        throw new Error(`Product ${productId} not found`);
      }

      if (product.consumerPrice === null || product.consumerPrice === undefined) {
        this.logger.warn(`Product ${productId} does not have consumerPrice set`);
        throw new Error(`Product ${productId} does not have consumerPrice set`);
      }

      const consumerPrice = product.consumerPrice;
      let newSalePrice: number = consumerPrice;

      // Apply productDiscount first if active
      if (product.productDiscount && product.productDiscount.status === true) {
        const discountRate = product.productDiscount.discountRate;
        newSalePrice = Math.floor(consumerPrice * (1 - discountRate / 100));
        this.logger.debug(
          `Calculating discounted price for product ${productId}: ` +
            `${consumerPrice} * (1 - ${discountRate}%) = ${newSalePrice}`
        );
      }

      // Then apply specialOffer if active (subtract discountAmount from already discounted price)
      if (product.productSpecialOffer && product.productSpecialOffer.status === true) {
        const discountAmount = product.productSpecialOffer.discountAmount;
        newSalePrice = Math.max(0, newSalePrice - discountAmount); // Ensure price doesn't go below 0
        this.logger.debug(
          `Applied specialOffer for product ${productId}: ` +
            `price -> ${newSalePrice} (discountAmount: ${discountAmount})`
        );
      }

      // If both discounts are inactive, reset to consumerPrice
      const hasActiveDiscount = product.productDiscount?.status === true;
      const hasActiveSpecialOffer = product.productSpecialOffer?.status === true;
      if (!hasActiveDiscount && !hasActiveSpecialOffer) {
        newSalePrice = consumerPrice;
        this.logger.debug(
          `No active discounts for product ${productId}, setting salePrice to consumerPrice: ${newSalePrice}`
        );
      }

      // Update the product's salePrice
      await this.prisma.product.update({
        where: { id: productId },
        data: { salePrice: newSalePrice },
      });

      this.logger.log(
        `Updated sale price for product ${productId}: ${product.salePrice} -> ${newSalePrice} ` +
          `(consumerPrice: ${consumerPrice}, ` +
          `productDiscount: ${hasActiveDiscount && product.productDiscount ? `${product.productDiscount.discountRate}%` : 'inactive'}, ` +
          `specialOffer: ${hasActiveSpecialOffer && product.productSpecialOffer ? `${product.productSpecialOffer.discountAmount}` : 'inactive'})`
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

  /**
   * Determine if a special offer should be active based on date range
   * Returns true if:
   * - Both dates are set and current date is within range
   * - Only startDate is set and current date >= startDate
   * - Only endDate is set and current date <= endDate
   * Returns false if:
   * - Both dates are null
   * - Current date is outside the date range
   */
  private shouldSpecialOfferBeActive(
    startDate: Date | null,
    endDate: Date | null,
    currentDate: Date
  ): boolean {
    // If both dates are null, special offer should not be active
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

    // If we get here, special offer should be active
    return true;
  }
}

