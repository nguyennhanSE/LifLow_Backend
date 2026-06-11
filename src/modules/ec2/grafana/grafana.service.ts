import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios/dist/http.service";
import { config } from "src/libs/config";

@Injectable()
export class GrafanaService {
    private readonly baseUrl: string;
    private readonly headers: object;
    constructor(
                private readonly httpService: HttpService
    ) {
        this.baseUrl = String(config.GRAFANA_BASE_URL);
        this.headers = {
            Authorization: `Basic ${Buffer.from(
                `${config.GF_SECURITY_ADMIN_USER}:${config.GF_SECURITY_ADMIN_PASSWORD}`
            ).toString('base64')}`,
            'Content-Type': 'application/json',
        };
    }

    async createPrometheusDatasource() {
        try {
            return await this.httpService.axiosRef.post(
                `${this.baseUrl}/api/datasources`,
                {
                    name: 'Prometheus',
                    uid: 'prometheus',      
                    type: 'prometheus',
                    url: config.GRAFANA_DATASOURCE,
                    access: 'proxy',
                    isDefault: true,
                },
                { headers: this.headers }
            );
        } catch (error: any) {
            if (error.response?.status === 409) {
                await this.httpService.axiosRef.put(
                    `${this.baseUrl}/api/datasources/uid/prometheus`,
                    {
                        name: 'Prometheus',
                        uid: 'prometheus',
                        type: 'prometheus',
                        url: config.GRAFANA_DATASOURCE,
                        access: 'proxy',
                        isDefault: true,
                    },
                    { headers: this.headers }
                );
                return;
            }
            throw error;
        }
    }

    async createDashboard(dashboardJson: object) {
        return this.httpService.axiosRef.post(
            `${this.baseUrl}/api/dashboards/db`,
            { dashboard: dashboardJson, overwrite: true },
            { headers: this.headers }
        );
    }

    async getDashboards() {
        return this.httpService.axiosRef.get(
            `${this.baseUrl}/api/search?type=dash-db`,
            { headers: this.headers }
        );
    }
}