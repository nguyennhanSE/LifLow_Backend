import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'src/libs/logger/logger.module';
import { EventLogInterceptor } from 'src/libs/interceptor/user-event-interceptor/event-log.interceptor';
import { UserEventLogController } from './user-event-log.controller';
import { UserEventLogQueueModule } from './queue/user-event-log.queue.module';

@Module({
  imports: [LoggerModule, UserEventLogQueueModule],
  controllers: [UserEventLogController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: EventLogInterceptor,
    },
  ],
})
export class UserEventLogModule {}
