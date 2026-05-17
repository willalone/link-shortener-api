import { Redis } from 'ioredis';
import { loadEnv } from '../../config/env.js';

const env = loadEnv();

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: process.env.NODE_ENV === 'test',
});

export const linkCacheKey = (shortCode: string) => `link:${shortCode}`;
export const ipCreateKey = (ip: string) => `ratelimit:create:${ip}`;
