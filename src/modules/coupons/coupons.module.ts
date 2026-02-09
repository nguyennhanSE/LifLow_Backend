import { Module, forwardRef } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { CouponRepository } from './repositories/coupon.repository';
import { PrismaModule } from '../../../prisma/prisma.module';
import { LoggerModule } from 'src/libs/logger/logger.module';
import { CouponHistoryModule } from '../coupon-history/coupon-history.module';
import { SharedQueueModule } from 'src/shared/shared-queue.module';
// import { CouponCronjobService } from './cronjob/coupon.cronjob.service';
@Module({
  imports: [PrismaModule, LoggerModule, forwardRef(() => CouponHistoryModule), SharedQueueModule],
  controllers: [CouponsController],
  providers: [CouponsService, CouponRepository],
  exports: [CouponsService],
})
export class CouponsModule {}
