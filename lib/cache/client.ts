import 'server-only';
import { Redis } from '@upstash/redis';

const globalForRedis = globalThis as unknown as {
  __upstashRedis?: Redis;
};

export function getRedisClient(): Redis | null {
  const url = process.env.CACHE_KV_REST_API_URL;
  const token = process.env.CACHE_KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  if (!globalForRedis.__upstashRedis) {
    globalForRedis.__upstashRedis = new Redis({ url, token });
  }

  return globalForRedis.__upstashRedis;
}

export function isRedisAvailable(): boolean {
  return getRedisClient() !== null;
}
