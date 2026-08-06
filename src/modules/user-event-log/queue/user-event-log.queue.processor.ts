import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AppLogger } from 'src/libs/logger/logger.service';
import { UserEventLogService } from '../user-event-log.service';
import {
  USER_EVENT_LOG_JOB_NAME,
  USER_EVENT_LOG_QUEUE_NAME,
} from './user-event-log.queue.constant';
import { UserEventLogJobData } from './user-event-log.queue.service';

@Processor(USER_EVENT_LOG_QUEUE_NAME)
export class UserEventLogQueueProcessor extends WorkerHost {
  constructor(
    private readonly logger: AppLogger,
    private readonly userEventLogService: UserEventLogService,
  ) {
    super();
  }

  async process(job: Job<UserEventLogJobData>): Promise<unknown> {
    switch (job.name) {
      case USER_EVENT_LOG_JOB_NAME: {
        this.logger.log(
          JSON.stringify({
            logType: 'user_event',
            ...job.data,
          }),
        );

        return this.userEventLogService.recordEvent(job.data);
      }

      default: {
        this.logger.warn(`[UserEventLogQueue] Unknown job name: ${job.name}`);
        return;
      }
    }
  }
}
