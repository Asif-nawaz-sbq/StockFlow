import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  get raw(): Redis {
    return this.client;
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Read-through cache. A Redis outage must not take the API down, so a failed
   * get falls through to the loader and a failed set is swallowed.
   */
  async remember<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    try {
      const hit = await this.client.get(key);
      if (hit !== null) return JSON.parse(hit) as T;
    } catch (err) {
      this.logger.warn({ key, err }, 'cache read failed, falling through to source');
    }

    const value = await loader();

    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn({ key, err }, 'cache write failed');
    }

    return value;
  }

  async forget(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch (err) {
      this.logger.warn({ keys, err }, 'cache invalidation failed');
    }
  }

  /**
   * Deletes by pattern using SCAN. Never KEYS - that blocks the whole server,
   * which on a shared ElastiCache node means blocking every other request too.
   */
  async forgetPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [next, found] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        cursor = next;
        if (found.length > 0) await this.client.del(...found);
      } while (cursor !== '0');
    } catch (err) {
      this.logger.warn({ pattern, err }, 'pattern invalidation failed');
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  }
}
