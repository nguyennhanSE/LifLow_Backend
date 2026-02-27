import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MEMBERSHIP_QUEUE_NAME, MEMBERSHIP_RECALCULATE_ALL_JOB } from './membership-queue.constant';

@Injectable()
export class MembershipQueueService {
  constructor(
    @InjectQueue(MEMBERSHIP_QUEUE_NAME) private readonly membershipQueue: Queue,
  ) {}

  /**
   * Enqueue a background job to recalculate memberships for all users.
   * Returns immediately with the job ID so the caller is not blocked.
   */
  async enqueueRecalculateAllMemberships() {
    return this.membershipQueue.add(
      MEMBERSHIP_RECALCULATE_ALL_JOB,
      {},
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}
