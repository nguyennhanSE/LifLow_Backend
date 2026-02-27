import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'src/libs/logger/logger.module';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { MembershipQueueService } from './membership-queue.service';
import { MembershipQueueProcessor } from './membership-queue.processor';
import { MembershipRecalculationService } from '../cronjob/membership-cronjob.service';
import { MEMBERSHIP_QUEUE_NAME } from './membership-queue.constant';

@Module({
  imports: [
    LoggerModule,
    PrismaModule,
    BullModule.registerQueueAsync({
      name: MEMBERSHIP_QUEUE_NAME,
      useFactory: () => ({
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 20,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        },
      }),
    }),
  ],
  providers: [MembershipQueueService, MembershipQueueProcessor, MembershipRecalculationService],
  exports: [MembershipQueueService],
})
export class MembershipQueueModule {}
