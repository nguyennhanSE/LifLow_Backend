import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AppLogger } from 'src/libs/logger/logger.service';
import { CouponHistoryService } from '../../coupon-history/coupon-history.service';
import { COUPON_ISSUE_BY_GRADES_JOB, COUPON_QUEUE_NAME } from './coupon-queue.module';
import { IssueCouponToUsersByTargetGradesJobData } from './coupon-queue.service';

@Processor(COUPON_QUEUE_NAME)
export class CouponQueueProcessor extends WorkerHost {
  constructor(
    private readonly logger: AppLogger,
    private readonly couponHistoryService: CouponHistoryService,
  ) {
    super();
  }

  async process(job: Job<IssueCouponToUsersByTargetGradesJobData>): Promise<unknown> {
    switch (job.name) {
      case COUPON_ISSUE_BY_GRADES_JOB: {
        const data = job.data as unknown as IssueCouponToUsersByTargetGradesJobData;
        const { couponId, targetGrades, startDate, endDate } = data;

        const start = typeof startDate === 'string' ? new Date(startDate) : null;
        const end = typeof endDate === 'string' ? new Date(endDate) : null;

        this.logger.log(
          `Processing coupon issuance job: couponId=${couponId}, targetGrades=${targetGrades?.length ? targetGrades.join(',') : 'ALL'}`,
        );

        return this.couponHistoryService.issueCouponToUsersByTargetGrades(
          couponId,
          targetGrades?.length ? targetGrades : undefined,
          start,
          end,
        );
      }
      default: {
        this.logger.warn(`Unknown job name: ${job.name}`);
        return;
      }
    }
  }
}
