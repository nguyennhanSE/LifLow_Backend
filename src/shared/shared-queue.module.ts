import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'src/libs/logger/logger.module';
import { CouponQueueService } from '../modules/coupons/queue/coupon-queue.service';
import { COUPON_QUEUE_NAME } from '../modules/coupons/queue/coupon-queue.module';

@Module({
  imports: [
    LoggerModule,
    BullModule.registerQueue({ name: COUPON_QUEUE_NAME }),
  ],
  providers: [CouponQueueService],
  exports: [CouponQueueService],
})
export class SharedQueueModule {}
