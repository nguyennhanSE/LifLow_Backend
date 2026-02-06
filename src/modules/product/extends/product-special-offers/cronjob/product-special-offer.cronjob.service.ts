// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { PrismaService } from '../../../../../../prisma/prisma.service';

// @Injectable()
// export class ProductSpecialOfferCronjobService {
//   private readonly logger = new Logger(ProductSpecialOfferCronjobService.name);

//   constructor(private readonly prisma: PrismaService) {}

//   /**
//    * Scheduled cron job that runs every hour to check and update product special offer status
//    */
//   @Cron(CronExpression.EVERY_HOUR)
//   async handleScheduledProductSpecialOfferStatusUpdate() {
//     this.logger.log('Starting scheduled product special offer status update...');
//     await this.updateAllProductSpecialOfferStatuses();
//     this.logger.log('Completed scheduled product special offer status update');
//   }

//   /**
//    * Main method to update all product special offer statuses based on their date ranges
//    * This should be called when:
//    * 1. Scheduled cron job runs
//    * 2. Admin creates/updates a product special offer
//    */
//   async updateAllProductSpecialOfferStatuses(): Promise<{
//     totalProcessed: number;
//     totalActivated: number;
//     totalDeactivated: number;
//     errors: number;
//   }> {
//     this.logger.log('Starting product special offer status update for all records');

//     const startTime = Date.now();
//     let totalProcessed = 0;
//     let totalActivated = 0;
//     let totalDeactivated = 0;
//     let errors = 0;

//     try {
//       // Get all product special offers
//       const productSpecialOffers =
//         await this.prisma.productSpecialOffer.findMany({
//           select: {
//             id: true,
//             productId: true,
//             startDate: true,
//             endDate: true,
//             status: true,
//           },
//         });

//       this.logger.log(
//         `Processing ${productSpecialOffers.length} product special offers`
//       );

//       const now = new Date();

//       // Process each product special offer
//       for (const specialOffer of productSpecialOffers) {
//         try {
//           const shouldBeActive = this.shouldSpecialOfferBeActive(
//             specialOffer.startDate,
//             specialOffer.endDate,
//             now
//           );

//           // Only update if status needs to change
//           if (specialOffer.status !== shouldBeActive) {
//             await this.prisma.productSpecialOffer.update({
//               where: { id: specialOffer.id },
//               data: { status: shouldBeActive },
//             });

//             if (shouldBeActive) {
//               totalActivated++;
//               this.logger.debug(
//                 `Activated product special offer for product ${specialOffer.productId}`
//               );
//             } else {
//               totalDeactivated++;
//               this.logger.debug(
//                 `Deactivated product special offer for product ${specialOffer.productId}`
//               );
//             }
//           }

//           totalProcessed++;
//         } catch (error) {
//           this.logger.error(
//             `Error processing product special offer ${specialOffer.id}: ${error.message}`,
//             error.stack
//           );
//           errors++;
//         }
//       }

//       const duration = Date.now() - startTime;
//       this.logger.log(
//         `Product special offer status update completed in ${duration}ms. ` +
//           `Processed: ${totalProcessed}, Activated: ${totalActivated}, ` +
//           `Deactivated: ${totalDeactivated}, Errors: ${errors}`
//       );

//       return {
//         totalProcessed,
//         totalActivated,
//         totalDeactivated,
//         errors,
//       };
//     } catch (error) {
//       this.logger.error(
//         'Failed to update product special offer statuses',
//         error.stack
//       );
//       throw error;
//     }
//   }

//   /**
//    * Update status for a specific product special offer
//    * Useful when creating or updating a special offer manually
//    */
//   async updateProductSpecialOfferStatus(
//     productSpecialOfferId: string
//   ): Promise<{ status: boolean; action: 'activated' | 'deactivated' | 'unchanged' }> {
//     const specialOffer = await this.prisma.productSpecialOffer.findUnique({
//       where: { id: productSpecialOfferId },
//       select: {
//         id: true,
//         startDate: true,
//         endDate: true,
//         status: true,
//       },
//     });

//     if (!specialOffer) {
//       this.logger.warn(`Product special offer ${productSpecialOfferId} not found`);
//       throw new Error(`Product special offer ${productSpecialOfferId} not found`);
//     }

//     const now = new Date();
//     const shouldBeActive = this.shouldSpecialOfferBeActive(
//       specialOffer.startDate,
//       specialOffer.endDate,
//       now
//     );

//     // Only update if status needs to change
//     if (specialOffer.status !== shouldBeActive) {
//       await this.prisma.productSpecialOffer.update({
//         where: { id: productSpecialOfferId },
//         data: { status: shouldBeActive },
//       });

//       const action = shouldBeActive ? 'activated' : 'deactivated';
//       this.logger.debug(
//         `${action.charAt(0).toUpperCase() + action.slice(1)} product special offer ${productSpecialOfferId}`
//       );
//       return { status: shouldBeActive, action };
//     }

//     return { status: specialOffer.status, action: 'unchanged' };
//   }

//   /**
//    * Determine if a special offer should be active based on date range
//    * Returns true if:
//    * - Both dates are set and current date is within range
//    * - Only startDate is set and current date >= startDate
//    * - Only endDate is set and current date <= endDate
//    * Returns false if:
//    * - Both dates are null
//    * - Current date is outside the date range
//    */
//   private shouldSpecialOfferBeActive(
//     startDate: Date | null,
//     endDate: Date | null,
//     currentDate: Date
//   ): boolean {
//     // If both dates are null, special offer should not be active
//     if (!startDate && !endDate) {
//       return false;
//     }

//     // Check start date
//     if (startDate && currentDate < startDate) {
//       return false;
//     }

//     // Check end date
//     if (endDate && currentDate > endDate) {
//       return false;
//     }

//     // If we get here, special offer should be active
//     return true;
//   }
// }

