import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from 'prisma/prisma.service';
import { config } from 'libs/config';

export type HealthStatus = 'ok' | 'error';

export interface DependencyHealth {
  status: HealthStatus;
  message?: string;
}

export interface LivenessResult {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

export interface ReadinessResult {
  status: HealthStatus;
  timestamp: string;
  checks: {
    database: DependencyHealth;
    redis: DependencyHealth;
  };
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getLiveness(): LivenessResult {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<ReadinessResult> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const status =
      database.status === 'ok' && redis.status === 'ok' ? 'ok' : 'error';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: { database, redis },
    };
  }

  private async checkDatabase(): Promise<DependencyHealth> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Database unavailable',
      };
    }
  }

  private async checkRedis(): Promise<DependencyHealth> {
    const redis = new Redis({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
    });

    try {
      await redis.connect();
      const pong = await redis.ping();
      if (pong !== 'PONG') {
        return { status: 'error', message: 'Unexpected Redis response' };
      }
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Redis unavailable',
      };
    } finally {
      redis.disconnect();
    }
  }
}
