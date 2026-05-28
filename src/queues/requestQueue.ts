import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

// The 'as any' bypasses the strict package type mismatches perfectly
export const requestQueue = new Queue('AI_CLASSIFICATION_QUEUE', {
  connection: redisConnection as any
});

export const enqueueClassification = async (requestId: string) => {
  await requestQueue.add('classify_request', { requestId }, { 
    attempts: 3, 
    backoff: { type: 'exponential', delay: 1000 } 
  });
};