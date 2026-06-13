import { Module } from "@nestjs/common";
import { GrafanaService } from "./grafana.service";
import { PrometheusModule } from "../prometheus/prometheus.module";
import { HttpModule } from "@nestjs/axios/dist/http.module";
import { GrafanaCronJobService } from "./job/grafana.job.service";
import { GrafanaProcessor } from "./job/grafana.processor";
import { BullModule } from "@nestjs/bullmq/dist/bull.module";
import { GRAFANA_QUEUE_NAME } from "./job/grafana.job.index";

@Module({
    imports: [PrometheusModule, HttpModule,
        BullModule.registerQueueAsync({
            name: GRAFANA_QUEUE_NAME,
            useFactory: () => ({
                defaultJobOptions: {
                    removeOnComplete: true,
                    removeOnFail: false,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                },
            }),
        }),
    ],
    providers: [GrafanaService],
    exports: [GrafanaService],
})
export class GrafanaModule {}