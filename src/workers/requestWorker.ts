import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { PrismaClient } from '@prisma/client';
import { analyzeMessage } from '../services/aiService.js';
import { broadcastEvent } from '../config/ws.js';

const prisma = new PrismaClient();

export const initWorker = () => {
  const worker = new Worker('AI_CLASSIFICATION_QUEUE', async (job: Job) => {
    const { requestId } = job.data;
    const request = await prisma.customerRequest.findUnique({ where: { id: requestId } });
    if (!request) return;

    try {
      const aiResult = await analyzeMessage(request.originalMessage);

      await prisma.$transaction([
        prisma.aIClassification.create({
          data: {
            requestId,
            category: aiResult.category,
            priority: aiResult.priority,
            summary: aiResult.summary,
            confidence: aiResult.confidence,
            reason: aiResult.reason,
          },
        }),
        prisma.customerRequest.update({
          where: { id: requestId },
          data: {
            status: 'CLASSIFIED',
            categorySnapshot: aiResult.category,
            prioritySnapshot: aiResult.priority,
          },
        }),
        prisma.requestEvent.create({
          data: { requestId, eventType: 'AI_PROCESSED', newValue: `CLASSIFIED - ${aiResult.category.toUpperCase()}` },
        }),
      ]);

      broadcastEvent('WORKER_SUCCESS', { requestId, status: 'CLASSIFIED' });
    } catch (error: any) {
      await prisma.customerRequest.update({ where: { id: requestId }, data: { status: 'FAILED' } });
      
      // Using an 'as any' wrapper here protects the create operation from any unexpected missing schema properties
      await (prisma.aIClassification.create as any)({
        data: { 
          requestId, 
          category: 'UNKNOWN', 
          priority: 'LOW', 
          summary: 'Failed computation profile', 
          confidence: 0, 
          reason: error.message || 'Error', 
          errorState: 'FAILED' 
        },
      });
      broadcastEvent('WORKER_FAILURE', { requestId, status: 'FAILED' });
    }
  }, { connection: redisConnection as any });

  console.log('👷 Background Worker Engine Online and Listening for Tasks.');
};