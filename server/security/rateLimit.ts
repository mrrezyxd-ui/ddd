import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipMap = new Map<string, RateLimitRecord>();

/**
 * Basic in-memory rate limiter middleware to protect sensitive checkout & auth routes.
 */
export function rateLimiter(limit = 60, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    const record = ipMap.get(ip);
    if (!record || now > record.resetTime) {
      ipMap.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (record.count >= limit) {
      return res.status(429).json({
        error: 'Too many requests. Please slow down and try again shortly.',
      });
    }

    record.count++;
    next();
  };
}
