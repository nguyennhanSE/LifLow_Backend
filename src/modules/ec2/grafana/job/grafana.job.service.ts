import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrometheusService } from "../../prometheus/prometheus.service";
import { GrafanaService } from "../grafana.service";
import { GRAFANA_QUEUE_NAME } from "./grafana.job.index";

@Injectable()
export class GrafanaCronJobService implements OnApplicationBootstrap {
    private readonly logger = new Logger('GrafanaCronJobService');

    constructor(
        private readonly grafanaService: GrafanaService,
        private readonly prometheusService: PrometheusService,
        @InjectQueue(GRAFANA_QUEUE_NAME) private readonly grafanaQueue: Queue
    ) {}

    onApplicationBootstrap() {
        this.logger.log('=== GRAFANA BOOTSTRAP START ===');
        // try {
        //     this.logger.log('Adding Grafana initialization job to queue...');
        //     await this.grafanaQueue.add('setup-grafana', {}, {
        //         priority: 1,
        //         attempts: 3,
        //         backoff: {
        //             type: 'exponential',
        //             delay: 2000,
        //         },
        //     });
        //     this.logger.log('✓ Grafana job added to queue');
        //     this.logger.log('=== GRAFANA BOOTSTRAP SUCCESS ===');
        // } catch (error) {
        //     this.logger.error('=== GRAFANA BOOTSTRAP FAILED ===', error);
        // }
    }

    // Hàm này sẽ được gọi bởi Processor
    async setupGrafana() {
        this.logger.log('Step 1: Creating Prometheus datasource...');
        await this.grafanaService.createPrometheusDatasource();
        this.logger.log('✓ Prometheus datasource ready');
        
        this.logger.log('Step 2: Querying Prometheus data...');
        const promql = 'up{job="node-exporter"}';
        const prometheusData = await this.prometheusService.query(promql);
        this.logger.log('✓ Prometheus data fetched:', JSON.stringify(prometheusData).slice(0, 200));
        
        this.logger.log('Step 3: Creating Grafana dashboard...');
        const dashboardJson = {
            id: null,
            uid: null,
            title: 'Node Exporter Metrics',
            panels: [
                {
                    id: 1,
                    title: 'Node Exporter Up Status',
                    type: 'timeseries',
                    gridPos: { h: 8, w: 24, x: 0, y: 0 },
                    targets: [
                        {
                            expr: promql,
                            format: 'time_series',
                            refId: 'A',
                            datasource: {
                                type: 'prometheus',
                                uid: 'prometheus',
                            },
                        },
                    ],
                    datasource: {
                        type: 'prometheus',
                        uid: 'prometheus',
                    },
                },
            ],
            timezone: 'browser',
            schemaVersion: 38,
            version: 0,
            refresh: '1h',
            time: {
                from: 'now-1h',
                to: 'now',
            },
        };
        await this.grafanaService.createDashboard(dashboardJson);
        this.logger.log('✓ Grafana dashboard created or updated successfully');
    }
}