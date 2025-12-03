/**
 * Common types shared across cache and storage services
 */

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl?: number;
  createdAt: number;
  expiresAt?: number;
  lastAccessed?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictions: number;
}

export interface StorageEntry<T = any> {
  key: string;
  value: T;
  metadata: {
    createdAt: number;
    updatedAt: number;
    version: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
}

export interface StorageConfig {
  dataPath: string;
  backupInterval: number;
  maxFileSize: number;
}
