import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is missing from environment variables');
}

// Create a robust ioredis instance for BullMQ
export const redisConnection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // CRITICAL: BullMQ requires this to be null
  tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined
});