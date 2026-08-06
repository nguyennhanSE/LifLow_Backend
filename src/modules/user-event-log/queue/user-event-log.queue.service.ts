import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { UserEventType } from 'src/libs/interceptor/user-event-interceptor/event-log.metadata';
import {
  USER_EVENT_LOG_JOB_NAME,
  USER_EVENT_LOG_QUEUE_NAME,
} from './user-event-log.queue.constant';

export type UserEventLogJobData = {
  eventId: string;
  eventType: UserEventType;
  eventVersion: number;
  userId?: string | null;
  anonymousId?: string | null;
  sessionId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  source?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
};

@Injectable()
export class UserEventLogQueueService {
  constructor(
    @InjectQueue(USER_EVENT_LOG_QUEUE_NAME)
    private readonly userEventLogQueue: Queue<UserEventLogJobData>,
  ) {}

  enqueueUserEventLog(data: UserEventLogJobData) {
    return this.userEventLogQueue.add(USER_EVENT_LOG_JOB_NAME, data, {
      jobId: data.eventId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
