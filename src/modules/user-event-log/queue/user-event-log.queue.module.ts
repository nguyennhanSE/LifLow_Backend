import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'src/libs/logger/logger.module';
import { PrismaModule } from 'prisma/prisma.module';
import { UserEventLogService } from '../user-event-log.service';
import { UserEventLogQueueProcessor } from './user-event-log.queue.processor';
import { UserEventLogQueueService } from './user-event-log.queue.service';
import { USER_EVENT_LOG_QUEUE_NAME } from './user-event-log.queue.constant';

@Module({
  imports: [
    LoggerModule,
    PrismaModule,
    BullModule.registerQueueAsync({
      name: USER_EVENT_LOG_QUEUE_NAME,
      useFactory: () => ({
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 20,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),
  ],
  providers: [
    UserEventLogService,
    UserEventLogQueueService,
    UserEventLogQueueProcessor,
  ],
  exports: [UserEventLogQueueService],
})
export class UserEventLogQueueModule {}
