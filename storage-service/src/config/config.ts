import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  dataPath: process.env.DATA_PATH || './data',
  backupInterval: parseInt(process.env.BACKUP_INTERVAL || '300000', 10),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Rate limiting
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
};
