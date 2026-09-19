import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import Redis from 'ioredis';
import { resolveRedisUrl } from 'src/database/connection';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => {
        const client = new Redis(resolveRedisUrl(), {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          // ElastiCache failover can take a few seconds; back off instead of
          // hammering the endpoint and tripping the connection limit.
          retryStrategy: (attempt) => Math.min(attempt * 200, 3_000),
          lazyConnect: false,
        });

        client.on('error', (err) => {
          // Logged, not thrown: Redis is a cache and a session store here, and
          // the app degrades to Postgres reads rather than falling over.
          console.error(
            JSON.stringify({
              level: 'error',
              msg: 'redis error',
              err: err.message,
            }),
          );
        });

        return client;
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(): Promise<void> {
    const client = this.moduleRef.get<Redis>(REDIS_CLIENT, { strict: false });
    await client?.quit().catch(() => undefined);
  }
}
