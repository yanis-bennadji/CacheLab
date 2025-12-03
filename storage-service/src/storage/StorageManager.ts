import { FileStorage } from './FileStorage';
import { StorageEntry } from '../../../shared/types';
import * as fs from 'fs/promises';
import * as path from 'path';

interface WriteOperation {
  key: string;
  value: any;
  resolve: (entry: StorageEntry) => void;
  reject: (error: Error) => void;
}

/**
 * StorageManager manages persistent storage with async operations and caching
 */
export class StorageManager {
  private fileStorage: FileStorage;
  private writeQueue: WriteOperation[];
  private isProcessingQueue: boolean;
  private readCache: Map<string, StorageEntry>;
  private maxCacheSize: number;
  private backupInterval: number;
  private backupTimer?: NodeJS.Timeout;

  constructor(
    dataPath: string = './data',
    backupInterval: number = 300000,
    maxCacheSize: number = 100
  ) {
    this.fileStorage = new FileStorage(dataPath);
    this.writeQueue = [];
    this.isProcessingQueue = false;
    this.readCache = new Map();
    this.maxCacheSize = maxCacheSize;
    this.backupInterval = backupInterval;
  }

  /**
   * Initialize the storage manager
   */
  async initialize(): Promise<void> {
    await this.fileStorage.initialize();

    // Start periodic backup
    if (this.backupInterval > 0) {
      this.startBackupInterval();
    }

    console.log('[StorageManager] Initialized successfully');
  }

  /**
   * Save a key-value pair (async with queue)
   * @param key - Storage key
   * @param value - Value to store
   * @returns Promise that resolves with the storage entry
   */
  async save(key: string, value: any): Promise<StorageEntry> {
    return new Promise((resolve, reject) => {
      this.writeQueue.push({ key, value, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process the write queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.writeQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.writeQueue.length > 0) {
      const operation = this.writeQueue.shift();
      if (!operation) break;

      try {
        const entry = await this.fileStorage.save(operation.key, operation.value);

        // Update read cache
        this.updateReadCache(operation.key, entry);

        operation.resolve(entry);
      } catch (error) {
        operation.reject(error as Error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Load a value from storage
   * @param key - Storage key
   * @returns The storage entry or undefined if not found
   */
  async load(key: string): Promise<StorageEntry | undefined> {
    // Check read cache first
    const cached = this.readCache.get(key);
    if (cached) {
      return cached;
    }

    // Load from disk
    const entry = await this.fileStorage.load(key);

    if (entry) {
      this.updateReadCache(key, entry);
    }

    return entry;
  }

  /**
   * Update the read cache with LRU eviction
   */
  private updateReadCache(key: string, entry: StorageEntry): void {
    // Remove if exists (to move to end)
    if (this.readCache.has(key)) {
      this.readCache.delete(key);
    }

    // Add to cache
    this.readCache.set(key, entry);

    // Evict oldest if cache is full
    if (this.readCache.size > this.maxCacheSize) {
      const firstKey = this.readCache.keys().next().value;
      if (firstKey) {
        this.readCache.delete(firstKey);
      }
    }
  }

  /**
   * Delete a key from storage
   * @param key - Storage key
   * @returns true if deleted, false if not found
   */
  async delete(key: string): Promise<boolean> {
    // Remove from read cache
    this.readCache.delete(key);

    // Delete from disk
    return await this.fileStorage.delete(key);
  }

  /**
   * Check if a key exists
   * @param key - Storage key
   * @returns true if exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    // Check cache first
    if (this.readCache.has(key)) {
      return true;
    }

    return await this.fileStorage.exists(key);
  }

  /**
   * List all keys in storage
   * @returns Array of all keys
   */
  async list(): Promise<string[]> {
    return await this.fileStorage.list();
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.readCache.clear();
    this.writeQueue = [];
    await this.fileStorage.clear();
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const fileStats = await this.fileStorage.getStats();

    return {
      ...fileStats,
      readCacheSize: this.readCache.size,
      maxReadCacheSize: this.maxCacheSize,
      writeQueueLength: this.writeQueue.length
    };
  }

  /**
   * Create a backup of all data
   */
  async createBackup(): Promise<string> {
    try {
      const entries = await this.fileStorage.getAllEntries();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(
        this.fileStorage['dataPath'],
        `backup_${timestamp}.json`
      );

      await fs.writeFile(backupPath, JSON.stringify(entries, null, 2), 'utf-8');

      console.log(`[StorageManager] Backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('[StorageManager] Error creating backup:', error);
      throw new Error('Failed to create backup');
    }
  }

  /**
   * Restore data from a backup file
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      const data = await fs.readFile(backupPath, 'utf-8');
      const entries: StorageEntry[] = JSON.parse(data);

      console.log(`[StorageManager] Restoring ${entries.length} entries from backup...`);

      for (const entry of entries) {
        await this.save(entry.key, entry.value);
      }

      console.log('[StorageManager] Backup restored successfully');
    } catch (error) {
      console.error('[StorageManager] Error restoring backup:', error);
      throw new Error('Failed to restore backup');
    }
  }

  /**
   * Start periodic backup interval
   */
  private startBackupInterval(): void {
    this.backupTimer = setInterval(async () => {
      try {
        await this.createBackup();
      } catch (error) {
        console.error('[StorageManager] Periodic backup failed:', error);
      }
    }, this.backupInterval);

    console.log(`[StorageManager] Periodic backup started (interval: ${this.backupInterval}ms)`);
  }

  /**
   * Stop periodic backup interval
   */
  stopBackupInterval(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = undefined;
      console.log('[StorageManager] Periodic backup stopped');
    }
  }

  /**
   * Compact data by removing old versions and optimizing storage
   */
  async compact(): Promise<void> {
    try {
      console.log('[StorageManager] Starting data compaction...');

      const entries = await this.fileStorage.getAllEntries();
      const keyMap = new Map<string, StorageEntry>();

      // Keep only the latest version of each key
      for (const entry of entries) {
        const existing = keyMap.get(entry.key);
        if (!existing || entry.metadata.version > existing.metadata.version) {
          keyMap.set(entry.key, entry);
        }
      }

      // Clear and re-save
      await this.fileStorage.clear();
      this.readCache.clear();

      for (const entry of keyMap.values()) {
        await this.fileStorage.save(entry.key, entry.value);
      }

      console.log(`[StorageManager] Compaction complete. Kept ${keyMap.size} entries.`);
    } catch (error) {
      console.error('[StorageManager] Error during compaction:', error);
      throw new Error('Failed to compact data');
    }
  }

  /**
   * Get detailed information about a storage entry
   */
  async getEntryInfo(key: string): Promise<StorageEntry | undefined> {
    return await this.load(key);
  }

  /**
   * Flush write queue (wait for all pending writes to complete)
   */
  async flush(): Promise<void> {
    while (this.writeQueue.length > 0 || this.isProcessingQueue) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Shutdown the storage manager gracefully
   */
  async shutdown(): Promise<void> {
    console.log('[StorageManager] Shutting down...');

    // Stop backup interval
    this.stopBackupInterval();

    // Flush pending writes
    await this.flush();

    // Create final backup
    try {
      await this.createBackup();
    } catch (error) {
      console.error('[StorageManager] Error creating final backup:', error);
    }

    console.log('[StorageManager] Shutdown complete');
  }
}
