import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/config';
import { storageRoutes, initializeStorage } from './routes/storageRoutes';
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
app.use('/api', storageRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize storage and start server
async function startServer() {
  try {
    // Initialize storage manager
    await initializeStorage();

    // Start server
    const server = app.listen(config.port, () => {
      console.log('===========================================');
      console.log('  Storage Service Started');
      console.log('===========================================');
      console.log(`  Port: ${config.port}`);
      console.log(`  Environment: ${config.nodeEnv}`);
      console.log(`  Data Path: ${config.dataPath}`);
      console.log(`  Backup Interval: ${config.backupInterval}ms`);
      console.log(`  Max File Size: ${config.maxFileSize} bytes`);
      console.log('===========================================');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        const { storageManager } = await import('./routes/storageRoutes');
        if (storageManager) {
          await storageManager.shutdown();
        }
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        const { storageManager } = await import('./routes/storageRoutes');
        if (storageManager) {
          await storageManager.shutdown();
        }
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
