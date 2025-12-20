import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { CouponRepository } from './repositories/coupon.repository';
import { PrismaModule } from '../../../prisma/prisma.module';
import { LoggerModule } from 'src/libs/logger/logger.module';
@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [CouponsController],
  providers: [CouponsService, CouponRepository],
  exports: [CouponsService],
})
export class CouponsModule {}
