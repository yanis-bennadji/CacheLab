import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageEntry } from '../../../shared/types';
import { djb2Hash } from '../../../shared/utils/helpers';

/**
 * FileStorage handles persistent storage of key-value pairs on disk
 * Uses partitioning for better performance with many keys
 */
export class FileStorage {
  private dataPath: string;
  private partitionCount: number;

  constructor(dataPath: string = './data', partitionCount: number = 16) {
    this.dataPath = dataPath;
    this.partitionCount = partitionCount;
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    try {
      // Create main data directory
      await fs.mkdir(this.dataPath, { recursive: true });

      // Create partition directories
      for (let i = 0; i < this.partitionCount; i++) {
        const partitionPath = this.getPartitionPath(i);
        await fs.mkdir(partitionPath, { recursive: true });
      }

      console.log(`[FileStorage] Initialized with ${this.partitionCount} partitions at ${this.dataPath}`);
    } catch (error) {
      console.error('[FileStorage] Initialization error:', error);
      throw new Error('Failed to initialize storage');
    }
  }

  /**
   * Get partition number for a key
   */
  private getPartitionNumber(key: string): number {
    return djb2Hash(key) % this.partitionCount;
  }

  /**
   * Get partition directory path
   */
  private getPartitionPath(partitionNumber: number): string {
    return path.join(this.dataPath, `partition_${partitionNumber}`);
  }

  /**
   * Get file path for a key
   */
  private getFilePath(key: string): string {
    const partitionNumber = this.getPartitionNumber(key);
    const partitionPath = this.getPartitionPath(partitionNumber);
    const safeKey = this.sanitizeKey(key);
    return path.join(partitionPath, `${safeKey}.json`);
  }

  /**
   * Sanitize key to make it safe for filesystem
   */
  private sanitizeKey(key: string): string {
    return Buffer.from(key).toString('base64').replace(/[/+=]/g, '_');
  }

  /**
   * Save a key-value pair to disk
   * @param key - Storage key
   * @param value - Value to store
   * @returns The created storage entry
   */
  async save(key: string, value: any): Promise<StorageEntry> {
    try {
      const filePath = this.getFilePath(key);
      let version = 1;
      let createdAt = Date.now();

      // Check if file exists to increment version
      if (await this.exists(key)) {
        const existing = await this.load(key);
        if (existing) {
          version = existing.metadata.version + 1;
          createdAt = existing.metadata.createdAt;
        }
      }

      const now = Date.now();
      const entry: StorageEntry = {
        key,
        value,
        metadata: {
          createdAt,
          updatedAt: now,
          version
        }
      };

      await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
      return entry;
    } catch (error) {
      console.error(`[FileStorage] Error saving key "${key}":`, error);
      throw new Error(`Failed to save key: ${key}`);
    }
  }

  /**
   * Load a value from disk
   * @param key - Storage key
   * @returns The storage entry or undefined if not found
   */
  async load(key: string): Promise<StorageEntry | undefined> {
    try {
      const filePath = this.getFilePath(key);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as StorageEntry;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return undefined; // File doesn't exist
      }
      console.error(`[FileStorage] Error loading key "${key}":`, error);
      throw new Error(`Failed to load key: ${key}`);
    }
  }

  /**
   * Delete a key from disk
   * @param key - Storage key
   * @returns true if deleted, false if not found
   */
  async delete(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false; // File doesn't exist
      }
      console.error(`[FileStorage] Error deleting key "${key}":`, error);
      throw new Error(`Failed to delete key: ${key}`);
    }
  }

  /**
   * Check if a key exists
   * @param key - Storage key
   * @returns true if exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all keys in storage
   * @returns Array of all keys
   */
  async list(): Promise<string[]> {
    try {
      const keys: string[] = [];

      for (let i = 0; i < this.partitionCount; i++) {
        const partitionPath = this.getPartitionPath(i);

        try {
          const files = await fs.readdir(partitionPath);

          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = path.join(partitionPath, file);
              const data = await fs.readFile(filePath, 'utf-8');
              const entry = JSON.parse(data) as StorageEntry;
              keys.push(entry.key);
            }
          }
        } catch (error: any) {
          if (error.code !== 'ENOENT') {
            console.error(`[FileStorage] Error reading partition ${i}:`, error);
          }
        }
      }

      return keys;
    } catch (error) {
      console.error('[FileStorage] Error listing keys:', error);
      throw new Error('Failed to list keys');
    }
  }

  /**
   * Get all entries (for backup purposes)
   * @returns Array of all storage entries
   */
  async getAllEntries(): Promise<StorageEntry[]> {
    try {
      const entries: StorageEntry[] = [];

      for (let i = 0; i < this.partitionCount; i++) {
        const partitionPath = this.getPartitionPath(i);

        try {
          const files = await fs.readdir(partitionPath);

          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = path.join(partitionPath, file);
              const data = await fs.readFile(filePath, 'utf-8');
              const entry = JSON.parse(data) as StorageEntry;
              entries.push(entry);
            }
          }
        } catch (error: any) {
          if (error.code !== 'ENOENT') {
            console.error(`[FileStorage] Error reading partition ${i}:`, error);
          }
        }
      }

      return entries;
    } catch (error) {
      console.error('[FileStorage] Error getting all entries:', error);
      throw new Error('Failed to get all entries');
    }
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    try {
      for (let i = 0; i < this.partitionCount; i++) {
        const partitionPath = this.getPartitionPath(i);

        try {
          const files = await fs.readdir(partitionPath);

          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = path.join(partitionPath, file);
              await fs.unlink(filePath);
            }
          }
        } catch (error: any) {
          if (error.code !== 'ENOENT') {
            console.error(`[FileStorage] Error clearing partition ${i}:`, error);
          }
        }
      }

      console.log('[FileStorage] All data cleared');
    } catch (error) {
      console.error('[FileStorage] Error clearing data:', error);
      throw new Error('Failed to clear data');
    }
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    try {
      const keys = await this.list();
      const entries = await this.getAllEntries();

      let totalSize = 0;
      for (const entry of entries) {
        totalSize += JSON.stringify(entry).length;
      }

      return {
        totalKeys: keys.length,
        totalSize,
        partitions: this.partitionCount,
        dataPath: this.dataPath
      };
    } catch (error) {
      console.error('[FileStorage] Error getting stats:', error);
      throw new Error('Failed to get stats');
    }
  }
}
