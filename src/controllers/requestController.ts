import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { enqueueClassification } from '../queues/requestQueue.js';
import { broadcastEvent } from '../config/ws.js';
import { z } from 'zod';

const prisma = new PrismaClient();
const requestCreateSchema = z.object({ 
  message: z.string().min(5), 
  channel: z.string().optional() 
});

export const createRequest = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const parsed = requestCreateSchema.parse(req.body);
    const request = await prisma.customerRequest.create({
      data: { originalMessage: parsed.message, sourceChannel: parsed.channel || 'API', status: 'QUEUED' },
    });

    await prisma.requestEvent.create({ data: { requestId: request.id, eventType: 'CREATED', newValue: 'QUEUED' } });
    await enqueueClassification(request.id);

    broadcastEvent('REQUEST_CREATED', request);
    return res.status(202).json({ message: 'Request received and queued for processing', requestId: request.id });
  } catch (err: any) {
    return res.status(400).json({ error: err.errors || 'Invalid payload.' });
  }
};

export const listRequests = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { status, priority, category } = req.query;
    const list = await prisma.customerRequest.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(priority && { prioritySnapshot: priority as string }),
        ...(category && { categorySnapshot: category as string }),
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve requests.' });
  }
};

export const getRequestById = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const requestId = req.params.id;

    const item = await prisma.customerRequest.findUnique({
  where: { id: requestId } as any,
      include: { 
        AIClassification: true, 
        InternalNote: { include: { author: { select: { email: true } } } } 
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Request ticket matching identifier not found' });
    }

    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server lookup error failed processing' });
  }
};

export const updateStatus = async (req: any, res: Response, next: NextFunction): Promise<any> => {
  try {
    const requestId = req.params.id;
    const { status } = req.body;
    const user = req.user;
    
    const oldRequest = await prisma.customerRequest.findUnique({ where: { id: requestId } });
    
    if (!oldRequest) {
      return res.status(404).json({ error: 'Request ticket not found' });
    }

    const updated = await prisma.customerRequest.update({
      where: { id: requestId },
      data: { status },
    });

    await prisma.requestEvent.create({
      data: { requestId: updated.id, eventType: 'STATUS_CHANGE', oldValue: oldRequest?.status, newValue: status, actor: user?.email },
    });

    broadcastEvent('REQUEST_UPDATED', updated);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update status.' });
  }
};

export const addNote = async (req: any, res: Response, next: NextFunction): Promise<any> => {
  try {
    const requestId = req.params.id;
    const { noteBody } = req.body;
    const user = req.user;

    const note = await prisma.internalNote.create({
      data: { requestId: requestId, authorId: user!.id, noteBody },
    });

    await prisma.requestEvent.create({
      data: { requestId: requestId, eventType: 'NOTE_ADDED', newValue: 'Note appended', actor: user?.email },
    });

    broadcastEvent('NOTE_ADDED', { requestId: requestId, note });
    return res.status(201).json(note);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to append internal note.' });
  }
};

export const retryClassification = async (req: any, res: Response, next: NextFunction): Promise<any> => {
  try {
    const requestId = req.params.id;

    await prisma.customerRequest.update({ where: { id: requestId }, data: { status: 'QUEUED' } });
    await enqueueClassification(requestId); 
    return res.json({ message: 'Classification job successfully re-queued' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to re-queue classification job.' });
  }
};