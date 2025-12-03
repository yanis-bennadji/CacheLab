import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for storage operations
 */
export class StorageError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'StorageError';
    this.statusCode = statusCode;
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (err instanceof StorageError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
    return;
  }

  // Handle other types of errors
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`
  });
}
