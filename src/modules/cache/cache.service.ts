import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager'; // ← thêm "type"
import { MembershipsService } from '../memberships/memberships.service';

@Injectable()
export class CacheService implements OnModuleInit {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache, 
            private readonly membershipsService: MembershipsService) {}

  async onModuleInit() {
    try {
        // get all membership tiers and cache them on startup
        const tiers = await this.membershipsService.getMembershipTiers();
        // cache until app down
        await this.cacheManager.set('membership_tiers', tiers);
        console.log('CacheService initialized: membership tiers cached');
    }catch (err) {
      console.error('CacheService initialization failed:', err);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    return (await this.cacheManager.get<T>(key)) ?? null;
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async reset(): Promise<void> {
    await this.cacheManager.clear(); 
  }
}