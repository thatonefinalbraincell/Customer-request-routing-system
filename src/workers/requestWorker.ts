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
      // 1. Invoke Gemini 2.5 Flash Telemetry Compilation
      const aiResult = await analyzeMessage(request.originalMessage);

      // 2. Format outcomes explicitly to ensure alignment with dashboard filters
      const finalCategory = (aiResult.category || 'OTHER').toUpperCase();
      const finalPriority = (aiResult.priority || 'MEDIUM').toUpperCase();

      await prisma.$transaction([
        // FIX: Use upsert instead of create to allow safe task retries without unique key violations
        prisma.aIClassification.upsert({
          where: { requestId },
          update: {
            category: finalCategory.toLowerCase(), // matches internal database tags
            priority: finalPriority.toLowerCase(),
            summary: aiResult.summary,
            confidence: aiResult.confidence ?? 1.0,
            reason: aiResult.reason || 'Re-classified successfully',
            errorState: null,
          },
          create: {
            requestId,
            category: finalCategory.toLowerCase(),
            priority: finalPriority.toLowerCase(),
            summary: aiResult.summary,
            confidence: aiResult.confidence ?? 1.0,
            reason: aiResult.reason || 'Initial extraction complete',
          },
        }),
        
        // Synchronize parent snapshots so ledger states update immediately via WebSockets
        prisma.customerRequest.update({
          where: { id: requestId },
          data: {
            status: 'CLASSIFIED',
            categorySnapshot: finalCategory, // Normalized to Uppercase (e.g., "SALES", "SPAM")
            prioritySnapshot: finalPriority,
          },
        }),

        prisma.requestEvent.create({
          data: { 
            requestId, 
            eventType: 'AI_PROCESSED', 
            newValue: `CLASSIFIED - ${finalCategory}` 
          },
        }),
      ]);

      // Broadcast success out across open administrative sockets
      broadcastEvent('WORKER_SUCCESS', { requestId, status: 'CLASSIFIED' });
    } catch (error: any) {
      console.error(`❌ Worker Execution Exception on Job ${job.id}:`, error);

      await prisma.customerRequest.update({ 
        where: { id: requestId }, 
        data: { status: 'FAILED' } 
      });
      
      // FIX: Use upsert here as well to safely update failed retry attempts
      await prisma.aIClassification.upsert({
        where: { requestId },
        update: {
          category: 'UNKNOWN',
          priority: 'LOW',
          summary: 'Failed computation profile',
          confidence: 0,
          reason: error.message || 'Unknown processing error',
          errorState: 'FAILED'
        },
        create: {
          requestId,
          category: 'UNKNOWN',
          priority: 'LOW',
          summary: 'Failed computation profile',
          confidence: 0,
          reason: error.message || 'Unknown processing error',
          errorState: 'FAILED'
        }
      });
      
      broadcastEvent('WORKER_FAILURE', { requestId, status: 'FAILED' });
    }
  }, { connection: redisConnection as any });

  console.log('👷 Background Worker Engine Online and Listening for Tasks.');
};