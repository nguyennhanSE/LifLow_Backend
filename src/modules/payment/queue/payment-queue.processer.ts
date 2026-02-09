import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AppLogger } from 'src/libs/logger/logger.service';
import { MembershipRecalculationService } from '../../memberships/cronjob/membership-cronjob.service';
import { CouponHistoryService } from '../../coupon-history/coupon-history.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  PAYMENT_MEMBERSHIP_RECALCULATION_JOB,
  PAYMENT_QUEUE_NAME,
} from './payment-queue.constants';
import { RecalculateMembershipAndIssueCouponsJobData } from './payment-queue.service';

@Processor(PAYMENT_QUEUE_NAME)
export class PaymentQueueProcessor extends WorkerHost {
  constructor(
    private readonly logger: AppLogger,
    private readonly membershipRecalculationService: MembershipRecalculationService,
    private readonly couponHistoryService: CouponHistoryService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<RecalculateMembershipAndIssueCouponsJobData>): Promise<unknown> {
    switch (job.name) {
      case PAYMENT_MEMBERSHIP_RECALCULATION_JOB: {
        const data = job.data as unknown as RecalculateMembershipAndIssueCouponsJobData;
        const { userId, membershipLevelBeforePayment, paymentAmount, orderGroupNumber, paymentId } = data;

        this.logger.log(
          `Processing membership recalculation job for user ${userId}, ` +
            `orderGroup ${orderGroupNumber}, ` +
            `membershipLevelBefore: ${membershipLevelBeforePayment || 'none'}, ` +
            `paymentAmount: ${paymentAmount}, ` +
            `paymentId: ${paymentId}`,
        );

        try {
          // Step 1: Get user's current total purchase amount
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
              totalPurchaseAmount: true,
              membershipLevel: true,
            },
          });

          if (!user) {
            this.logger.error(`User ${userId} not found, skipping membership recalculation`);
            return {
              success: false,
              error: 'User not found',
            };
          }

          const totalPurchaseAmount = user.totalPurchaseAmount || 0;

          this.logger.log(
            `User ${userId} current totalPurchaseAmount: ${totalPurchaseAmount}`,
          );

          // Step 2: Recalculate membership level based on new total purchase amount
          const recalculationResult = await this.membershipRecalculationService.recalculateUserMembership(
            userId,
            totalPurchaseAmount,
          );

          this.logger.log(
            `Membership recalculation result for user ${userId}: ${JSON.stringify(recalculationResult)}`,
          );

          // Step 3: Get updated user to check if membership level changed
          const updatedUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
              membershipLevel: true,
            },
          });

          const membershipLevelAfterPayment = updatedUser?.membershipLevel || null;

          // Step 4: Check if membership level changed
          const membershipChanged = membershipLevelBeforePayment !== membershipLevelAfterPayment;

          this.logger.log(
            `User ${userId} membership level: before=${membershipLevelBeforePayment || 'none'}, ` +
              `after=${membershipLevelAfterPayment || 'none'}, ` +
              `changed=${membershipChanged}`,
          );

          // Step 5: If membership level changed (upgraded), issue coupons
          let couponResult: {
            message: string;
            totalCount: number;
            freeShipping: {
              message: string;
              count: number;
              coupon: { id: string; name: string; code: string; type: string } | null;
              histories: unknown[];
            };
            shoppingSupport: {
              message: string;
              count: number;
              coupon: { id: string; name: string; code: string; type: string } | null;
              histories: unknown[];
            };
            allHistories: unknown[];
          } | null = null;

          if (membershipChanged && membershipLevelAfterPayment) {
            this.logger.log(
              `Membership level changed for user ${userId}, issuing coupons for new level: ${membershipLevelAfterPayment}`,
            );

            try {
              couponResult = await this.couponHistoryService.issueAfterUpdate(userId, paymentId);

              this.logger.log(
                `Coupon issuance completed for user ${userId}: ${JSON.stringify({
                  totalCount: couponResult.totalCount,
                  freeShippingCount: couponResult.freeShipping.count,
                  shoppingSupportCount: couponResult.shoppingSupport.count,
                })}`,
              );
            } catch (couponError: unknown) {
              const errorMessage = couponError instanceof Error ? couponError.message : String(couponError);
              this.logger.error(
                `Failed to issue coupons for user ${userId}: ${errorMessage}`,
                couponError instanceof Error ? couponError.stack : undefined,
              );
              // Don't throw - we don't want to fail the job if coupon issuance fails
              // Membership recalculation already succeeded
            }
          } else {
            this.logger.log(
              `Membership level unchanged for user ${userId}, skipping coupon issuance`,
            );
          }

          return {
            success: true,
            userId,
            orderGroupNumber,
            membershipLevelBefore: membershipLevelBeforePayment,
            membershipLevelAfter: membershipLevelAfterPayment,
            membershipChanged,
            recalculationAction: recalculationResult.action,
            couponsIssued: couponResult?.totalCount || 0,
            couponDetails: couponResult
              ? {
                  freeShippingCount: couponResult.freeShipping.count,
                  shoppingSupportCount: couponResult.shoppingSupport.count,
                }
              : null,
          };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Error processing membership recalculation job for user ${userId}: ${errorMessage}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw error; // Rethrow to let BullMQ retry mechanism handle it
        }
      }
      default: {
        this.logger.warn(`Unknown job name: ${job.name}`);
        return;
      }
    }
  }
}
