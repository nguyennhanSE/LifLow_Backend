import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { COUPON_ISSUE_BY_GRADES_JOB, COUPON_QUEUE_NAME } from './coupon-queue.module';

export type IssueCouponToUsersByTargetGradesJobData = {
  couponId: string;
  targetGrades?: string[] | null;
  startDate?: string | null;
  endDate?: string | null;
};

@Injectable()
export class CouponQueueService {
  constructor(@InjectQueue(COUPON_QUEUE_NAME) private readonly couponQueue: Queue) {}

  enqueueIssueCouponToUsersByTargetGrades(data: IssueCouponToUsersByTargetGradesJobData) {
    return this.couponQueue.add(COUPON_ISSUE_BY_GRADES_JOB, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
