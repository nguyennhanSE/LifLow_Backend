import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  PAYMENT_MEMBERSHIP_RECALCULATION_JOB,
  PAYMENT_QUEUE_NAME,
} from './payment-queue.constants';

export type RecalculateMembershipAndIssueCouponsJobData = {
  userId: string;
  membershipLevelBeforePayment: string | null;
  paymentAmount: number;
  orderGroupNumber: string;
  paymentId: string;
};

@Injectable()
export class PaymentQueueService {
  constructor(@InjectQueue(PAYMENT_QUEUE_NAME) private readonly paymentQueue: Queue) {}

  /**
   * Enqueue job to recalculate membership level and issue coupons after payment confirmation.
   * This job will:
   * 1. Recalculate user's membership level based on new totalPurchaseAmount
   * 2. If membership level changed, issue appropriate coupons
   */
  async enqueueRecalculateMembershipAndIssueCoupons(
    data: RecalculateMembershipAndIssueCouponsJobData,
  ) {
    return this.paymentQueue.add(PAYMENT_MEMBERSHIP_RECALCULATION_JOB, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
