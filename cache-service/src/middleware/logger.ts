import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 */
export function logger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log when response is finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();

    console.log(
      `[${timestamp}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
}

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
export class RateLimiter {
  private requests: Map<string, number[]>;
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.requests = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    if (!this.requests.has(ip)) {
      this.requests.set(ip, []);
    }

    const timestamps = this.requests.get(ip)!;

    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (validTimestamps.length >= this.maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later'
      });
      return;
    }

    validTimestamps.push(now);
    this.requests.set(ip, validTimestamps);

    next();
  };

  private cleanup(): void {
    const now = Date.now();
    for (const [ip, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(
        timestamp => now - timestamp < this.windowMs
      );
      if (validTimestamps.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, validTimestamps);
      }
    }
  }
}
