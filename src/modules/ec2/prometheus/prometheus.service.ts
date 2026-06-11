import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrometheusDriver } from 'prometheus-query';
import { config } from "src/libs/config";
import { PrometheusResponse } from "./prometheus.index";



@Injectable()
export class PrometheusService {
    // This service can be expanded to include methods for interacting with the node exporter metrics
    private readonly driver: PrometheusDriver;

    constructor() {
        this.driver = new PrometheusDriver({
            endpoint: String(config.PROMETHEUS_BASE_URL),
        });
    }

    async query(promql: string) : Promise<PrometheusResponse> {
        const result = await this.driver.instantQuery(promql);
        return {
            status: 'success',
            data: {
                resultType: 'vector',
                result: result.result.map(serie => ({
                    metric: serie.metric.labels,       
                    value: [serie.value.time, String(serie.value.value)],
                })),
            },
        };
    }

    async queryRange(promql: string, start: string, end: string, step = '30s') {
        return this.driver.rangeQuery(promql, new Date(start), new Date(end), step);
    }

    async getTargetStatus() {
        return this.driver.targets();
    }


}