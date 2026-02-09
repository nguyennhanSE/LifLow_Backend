import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'src/libs/logger/logger.module';
import { PaymentQueueService } from './payment-queue.service';
import { PaymentQueueProcessor } from './payment-queue.processer';
import { MembershipsModule } from '../../memberships/memberships.module';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { PAYMENT_QUEUE_NAME } from './payment-queue.constants';

@Module({
  imports: [
    LoggerModule,
    MembershipsModule,
    PrismaModule,
    BullModule.registerQueueAsync({
      name: PAYMENT_QUEUE_NAME,
      useFactory: () => ({
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 20,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
          delay: 500, // Small delay for better reliability
        },
      }),
    }),
  ],
  providers: [PaymentQueueService, PaymentQueueProcessor],
  exports: [PaymentQueueService],
})
export class PaymentQueueModule {}
