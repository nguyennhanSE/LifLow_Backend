import { forwardRef, Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { CacheService } from './cache.service';
import {config} from 'libs/config';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (config) => ({
        store: await redisStore({
          socket: {
            host: config.REDIS_HOST,
            port: config.REDIS_PORT,
          },
          ttl: 60 * 1000, // milliseconds, default 60s
        }),
      }),
    }),
    forwardRef(() => MembershipsModule)
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}