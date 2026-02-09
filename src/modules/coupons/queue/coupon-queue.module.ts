import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'src/libs/logger/logger.module';
import { CouponQueueService } from './coupon-queue.service';

export const COUPON_QUEUE_NAME = 'coupon-queue';
export const COUPON_ISSUE_BY_GRADES_JOB = 'issue-coupon-to-users-by-target-grades';

@Module({
  imports: [
    LoggerModule,
    BullModule.registerQueueAsync({
      name: COUPON_QUEUE_NAME,
      useFactory: () => ({
        defaultJobOptions: {
          removeOnComplete: 5,
          removeOnFail: 4,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          // Ubuntu/EC2 specific settings
          delay: 1000, // Small delay for better reliability on EC2
        },
      }),
    }),
  ],
  providers: [CouponQueueService],
  exports: [CouponQueueService, BullModule],
})
export class CouponQueueModule {}