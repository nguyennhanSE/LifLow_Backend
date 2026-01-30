import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentRepository } from './repositories/payment.repository';
import { TossPaymentApiService } from './services/toss-payment-api.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { OrderModule } from '../order/order.module';
import { OrdersService } from '../order/order.service';
import { CouponHistoryModule } from '../coupon-history/coupon-history.module';
import { PointModule } from '../point/point.module';
@Module({
  imports: [ConfigModule, PrismaModule, OrderModule, CouponHistoryModule, PointModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository, TossPaymentApiService],
  exports: [PaymentService, PaymentRepository, TossPaymentApiService],
})
export class PaymentModule {}
