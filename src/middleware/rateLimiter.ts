import { Request, Response, NextFunction } from 'express';

const ipCache = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (limit: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const record = ipCache.get(ip);

    if (!record || now > record.resetTime) {
      ipCache.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count++;
    if (record.count > limit) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return;
    }
    next();
  };
};