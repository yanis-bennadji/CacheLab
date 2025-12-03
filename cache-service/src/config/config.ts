import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  storageServiceUrl: process.env.STORAGE_SERVICE_URL || 'http://localhost:3002',
  maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE || '1000', 10),
  defaultTTL: parseInt(process.env.DEFAULT_TTL || '3600', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Rate limiting
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
};
