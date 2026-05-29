import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
  lastMessage: string;
  duplicateCount: number;
}

const ipCache = new Map<string, RateLimitRecord>();

export const rateLimiter = (limit: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || 'unknown';
    const currentMessage = (req.body?.message || '').trim(); 
    const now = Date.now();
    const record = ipCache.get(ip);

    if (!record || now > record.resetTime) {
      ipCache.set(ip, { 
        count: 1, 
        resetTime: now + windowMs, 
        lastMessage: currentMessage, 
        duplicateCount: 1 
      });
      return next();
    }

    // Consecutive spam checker
    if (currentMessage && record.lastMessage === currentMessage) {
      record.duplicateCount++;
      if (record.duplicateCount >= 5) {
        res.status(429).json({ 
          error: 'Rate limit exceeded. System flagged consecutive duplicate spamming.' 
        });
        return;
      }
    } else {
      record.lastMessage = currentMessage;
      record.duplicateCount = 1;
    }

    record.count++;
    if (record.count > limit) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return;
    }

    next();
  };
};