import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AppLogger } from 'src/libs/logger/logger.service';
import { MembershipRecalculationService } from '../cronjob/membership-cronjob.service';
import { MEMBERSHIP_QUEUE_NAME, MEMBERSHIP_RECALCULATE_ALL_JOB } from './membership-queue.constant';

@Processor(MEMBERSHIP_QUEUE_NAME)
export class MembershipQueueProcessor extends WorkerHost {
  constructor(
    private readonly logger: AppLogger,
    private readonly membershipRecalculationService: MembershipRecalculationService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case MEMBERSHIP_RECALCULATE_ALL_JOB: {
        this.logger.log(`[MembershipQueue] Starting recalculate-all job (id=${job.id})`);

        try {
          const result = await this.membershipRecalculationService.recalculateAllUserMemberships();

          this.logger.log(
            `[MembershipQueue] recalculate-all completed: ` +
              `processed=${result.totalUsersProcessed}, ` +
              `created=${result.totalCreated}, ` +
              `updated=${result.totalUpdated}, ` +
              `errors=${result.errors}`,
          );

          return { success: true, ...result };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          const stack = error instanceof Error ? error.stack : undefined;
          this.logger.error(`[MembershipQueue] recalculate-all failed: ${message}`, stack);
          throw error;
        }
      }

      default: {
        this.logger.warn(`[MembershipQueue] Unknown job name: ${job.name}`);
        return;
      }
    }
  }
}
