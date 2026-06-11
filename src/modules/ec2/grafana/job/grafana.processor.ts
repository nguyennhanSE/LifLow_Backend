import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { GrafanaCronJobService } from './grafana.job.service';
import { GRAFANA_QUEUE_NAME } from './grafana.job.index';

@Processor(GRAFANA_QUEUE_NAME)
export class GrafanaProcessor extends WorkerHost {
    private readonly logger = new Logger('GrafanaProcessor');

    constructor(private readonly grafanaService: GrafanaCronJobService) {
        super();
    }

    async process(job: Job<any>): Promise<unknown> {
        switch (job.name) {
            case 'setup-grafana':
                return this.handleSetupGrafana(job);
        }
    }
    async handleSetupGrafana(job: Job<any>) {
        this.logger.log(`Processing job ${job.id}: setup-grafana`);
        try {
            await this.grafanaService.setupGrafana();
            this.logger.log(`✓ Job ${job.id} completed successfully`);
            return { success: true };
        } catch (error) {
            this.logger.error(`✗ Job ${job.id} failed:`, error);
            throw error;
        }
    }
}
