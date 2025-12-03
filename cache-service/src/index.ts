import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/config';
import { cacheRoutes } from './routes/cacheRoutes';
import { logger, RateLimiter } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(logger);

// Rate limiting
const rateLimiter = new RateLimiter(
  config.rateLimitMaxRequests,
  config.rateLimitWindowMs
);
app.use(rateLimiter.middleware);

// Routes
app.use('/api', cacheRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  console.log('===========================================');
  console.log('  Cache Service Started');
  console.log('===========================================');
  console.log(`  Port: ${config.port}`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Max Cache Size: ${config.maxCacheSize}`);
  console.log(`  Default TTL: ${config.defaultTTL}s`);
  console.log(`  Storage Service: ${config.storageServiceUrl}`);
  console.log('===========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
