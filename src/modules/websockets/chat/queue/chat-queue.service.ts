import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CHAT_QUEUE_JOB_NAME, CHAT_QUEUE_NAME } from './chat-queue.constant';

export type CreateChatRoomsForUsersJobData = {
  id: string;
};

@Injectable()
export class ChatQueueService {
  constructor(
    @InjectQueue(CHAT_QUEUE_NAME) private readonly chatQueue: Queue,
  ) {}

  async enqueueCreateChatRoomsForUsers(id: string) {
    const safeJobId = `${CHAT_QUEUE_JOB_NAME}-${id.replace(/:/g, '-')}`;

    return this.chatQueue.add(
      CHAT_QUEUE_JOB_NAME,
      { id },
      {
        jobId: safeJobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}
