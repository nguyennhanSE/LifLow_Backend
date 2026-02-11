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
  // @Cron(CronExpression.EVERY_DAY_AT_2AM)
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
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
    const now = new Date();
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
              discountEndDate: true,
            },
          },
          productSpecialOffer: {
            select: {
              id: true,
              status: true,
              discountAmount: true,
              specialPriceApplied: true,
              endDate: true,
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

          const hasActiveDiscount = product.productDiscount?.status === true;
          const hasActiveSpecialOffer = product.productSpecialOffer?.status === true;

          const isSpecialOfferExpired =
            !!product.productSpecialOffer?.endDate && product.productSpecialOffer.endDate < now;
          const isProductDiscountExpired =
            !!product.productDiscount?.discountEndDate && product.productDiscount.discountEndDate < now;

          // If either specialOffer or productDiscount is expired: restore salePrice and delete expired record(s)
          if (isSpecialOfferExpired || isProductDiscountExpired) {
            const effectiveHasActiveDiscount = hasActiveDiscount && !isProductDiscountExpired;
            const effectiveHasActiveSpecialOffer = hasActiveSpecialOffer && !isSpecialOfferExpired;

            // Recalculate salePrice using only effective (non-expired) promotions
            let restoredSalePrice = consumerPrice;

            if (
              effectiveHasActiveDiscount &&
              effectiveHasActiveSpecialOffer &&
              product.productDiscount &&
              product.productSpecialOffer
            ) {
              const specialPriceApplied = product.productSpecialOffer.specialPriceApplied ?? consumerPrice;
              const discountRate = product.productDiscount.discountRate;

              // Apply productDiscount on specialPriceApplied
              restoredSalePrice = Math.floor(specialPriceApplied * (1 - discountRate / 100));
              restoredSalePrice = Math.max(0, restoredSalePrice);
            } else if (effectiveHasActiveDiscount && product.productDiscount) {
              const discountRate = product.productDiscount.discountRate;
              restoredSalePrice = Math.floor(consumerPrice * (1 - discountRate / 100));
              restoredSalePrice = Math.max(0, restoredSalePrice);
            } else if (effectiveHasActiveSpecialOffer && product.productSpecialOffer) {
              const specialPriceApplied = product.productSpecialOffer.specialPriceApplied ?? consumerPrice;
              // If specialOffer is still active, use specialPriceApplied
              restoredSalePrice = Math.max(0, specialPriceApplied);
            } else {
              restoredSalePrice = consumerPrice;
            }

            await this.prisma.$transaction(async (tx) => {
              if (product.salePrice !== restoredSalePrice) {
                await tx.product.update({
                  where: { id: product.id },
                  data: { salePrice: restoredSalePrice },
                });
              }

              if (isSpecialOfferExpired && product.productSpecialOffer) {
                await tx.productSpecialOffer.update({
                  where: { id: product.productSpecialOffer.id },
                  data: { isOutDated: true },
                });
              }

              if (isProductDiscountExpired && product.productDiscount) {
                await tx.productDiscount.delete({
                  where: { id: product.productDiscount.id },
                });
              }
            });

            if (product.salePrice !== restoredSalePrice) {
              totalUpdated++;
            }

            if (isSpecialOfferExpired && product.productSpecialOffer) {
              this.logger.debug(
                `Deleted expired specialOffer ${product.productSpecialOffer.id} for product ${product.id} (endDate ${product.productSpecialOffer.endDate?.toISOString()})`,
              );
            }
            if (isProductDiscountExpired && product.productDiscount) {
              this.logger.debug(
                `Deleted expired productDiscount ${product.productDiscount.id} for product ${product.id} (discountEndDate ${product.productDiscount.discountEndDate?.toISOString()})`,
              );
            }

            totalProcessed++;
            continue;
          }

          // If both productDiscount and productSpecialOffer are active
          if (hasActiveDiscount && hasActiveSpecialOffer && product.productSpecialOffer && product.productDiscount) {
            const specialPriceApplied = product.productSpecialOffer.specialPriceApplied ?? consumerPrice;
            const discountRate = product.productDiscount.discountRate;

            // Apply productDiscount on top of specialPriceApplied
            // newSalePrice = specialPriceApplied * (1 - discountRate/100)
            newSalePrice = Math.floor(specialPriceApplied * (1 - discountRate / 100));
            newSalePrice = Math.max(0, newSalePrice); // Ensure price doesn't go below 0

            this.logger.debug(
              `Applied both productDiscount and specialOffer for product ${product.id}: ` +
                `specialPriceApplied: ${specialPriceApplied}, ` +
                `discountRate: ${discountRate}%, ` +
                `result: ${newSalePrice}`
            );
          }
          // If only productDiscount is active
          else if (hasActiveDiscount && product.productDiscount) {
            const discountRate = product.productDiscount.discountRate;
            newSalePrice = Math.floor(consumerPrice * (1 - discountRate / 100));
            this.logger.debug(
              `Applied productDiscount for product ${product.id}: ` +
                `${consumerPrice} -> ${newSalePrice} (discountRate: ${discountRate}%)`
            );
          }
          // If only productSpecialOffer is active
          else if (hasActiveSpecialOffer && product.productSpecialOffer) {
            const specialOffer = product.productSpecialOffer;
            const specialPriceApplied = specialOffer.specialPriceApplied ?? consumerPrice;
            // When active, salePrice = specialPriceApplied (already discounted price)
            newSalePrice = Math.max(0, specialPriceApplied);
            this.logger.debug(
              `Applied specialOffer for product ${product.id}: ` +
                `specialPriceApplied: ${specialPriceApplied}, ` +
                `result: ${newSalePrice}`
            );
          }
          // If both discounts are inactive, reset to consumerPrice
          else {
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
   * Determine if a discount should be active based on date range.
   * Returns true only when both startDate and endDate are set and current date is within [startDate, endDate].
   * If now() is not in [startDate, endDate], returns false (status will be set to false).
   */
  private shouldDiscountBeActive(
    startDate: Date | null,
    endDate: Date | null,
    currentDate: Date
  ): boolean {
    if (!startDate || !endDate) {
      return false;
    }
    if (currentDate < startDate) {
      return false;
    }
    if (currentDate > endDate) {
      return false;
    }
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
              specialPriceApplied: true,
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

      const hasActiveDiscount = product.productDiscount?.status === true;
      const hasActiveSpecialOffer = product.productSpecialOffer?.status === true;

      // If both productDiscount and productSpecialOffer are active
      if (hasActiveDiscount && hasActiveSpecialOffer && product.productDiscount && product.productSpecialOffer) {
        const specialPriceApplied = product.productSpecialOffer.specialPriceApplied ?? consumerPrice;
        const discountRate = product.productDiscount.discountRate;
        
        // Apply productDiscount on specialPriceApplied
        newSalePrice = Math.floor(specialPriceApplied * (1 - discountRate / 100));
        newSalePrice = Math.max(0, newSalePrice);
        
        this.logger.debug(
          `Applied both for product ${productId}: ` +
            `specialPriceApplied: ${specialPriceApplied}, discountRate: ${discountRate}%, result: ${newSalePrice}`
        );
      }
      // If only productDiscount is active
      else if (hasActiveDiscount && product.productDiscount) {
        const discountRate = product.productDiscount.discountRate;
        newSalePrice = Math.floor(consumerPrice * (1 - discountRate / 100));
        this.logger.debug(
          `Applied productDiscount for product ${productId}: ` +
            `${consumerPrice} * (1 - ${discountRate}%) = ${newSalePrice}`
        );
      }
      // If only productSpecialOffer is active
      else if (hasActiveSpecialOffer && product.productSpecialOffer) {
        const specialPriceApplied = product.productSpecialOffer.specialPriceApplied ?? consumerPrice;
        newSalePrice = Math.max(0, specialPriceApplied);
        this.logger.debug(
          `Applied specialOffer for product ${productId}: ` +
            `specialPriceApplied: ${specialPriceApplied}, result: ${newSalePrice}`
        );
      }
      // If both discounts are inactive, reset to consumerPrice
      else {
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
   * Determine if a special offer should be active based on date range.
   * Returns true only when both startDate and endDate are set and current date is within [startDate, endDate].
   * If now() is not in [startDate, endDate], returns false (status will be set to false).
   */
  private shouldSpecialOfferBeActive(
    startDate: Date | null,
    endDate: Date | null,
    currentDate: Date
  ): boolean {
    if (!startDate || !endDate) {
      return false;
    }
    if (currentDate < startDate) {
      return false;
    }
    if (currentDate > endDate) {
      return false;
    }
    return true;
  }
}

