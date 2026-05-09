import Redis from 'ioredis';
import { env } from '@lib/config.js';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      enableReadyCheck: false,
      lazyConnect: false,
    });
  }
  return redis;
}
