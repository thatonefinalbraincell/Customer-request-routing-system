import { Redis } from 'ioredis';
import dotenv from 'dotenv';

// Only load local .env if REDIS_URL isn't already supplied by the production platform
if (!process.env.REDIS_URL) {
  dotenv.config();
}

const finalRedisUrl = process.env.REDIS_URL;

if (!finalRedisUrl || finalRedisUrl === 'redis://:') {
  throw new Error('❌ CRITICAL: REDIS_URL is missing or resolving to empty!');
}

// Create a robust ioredis instance for BullMQ
export const redisConnection = new Redis(finalRedisUrl, {
  maxRetriesPerRequest: null, // CRITICAL: BullMQ requires this to be null
  tls: finalRedisUrl.startsWith('rediss://') ? {} : undefined
});