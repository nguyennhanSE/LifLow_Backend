import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { config } from 'src/libs/config';

@Injectable()
export class NodeExporterService {
  constructor(private readonly httpService: HttpService) {}
  
  getNodeExporterBaseUrl() {
    return `http://${config.NODE_EXPORTER_HOST}:${config.NODE_EXPORTER_PORT}`;
  }

    async getNodeExporterMetrics() {
        const url = `${this.getNodeExporterBaseUrl()}/metrics`;
        try {
            const response = await this.httpService.axiosRef.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching node exporter metrics:', error);
            throw new Error('Failed to fetch node exporter metrics');
        }
    }
}