import { HashMap } from './HashMap';
import { CacheEntry, CacheStats } from '../../../shared/types';
import { isExpired, calculateExpiration } from '../../../shared/utils/helpers';

/**
 * Node for LRU doubly linked list
 */
class LRUNode {
  key: string;
  prev: LRUNode | null;
  next: LRUNode | null;

  constructor(key: string) {
    this.key = key;
    this.prev = null;
    this.next = null;
  }
}

/**
 * CacheManager manages cache entries with TTL and LRU eviction policy
 */
export class CacheManager {
  private cache: HashMap<CacheEntry>;
  private lruMap: Map<string, LRUNode>;
  private lruHead: LRUNode | null;
  private lruTail: LRUNode | null;
  private maxSize: number;
  private defaultTTL: number;

  // Statistics
  private hits: number;
  private misses: number;
  private evictions: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 3600) {
    this.cache = new HashMap<CacheEntry>();
    this.lruMap = new Map();
    this.lruHead = null;
    this.lruTail = null;
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;

    // Start cleanup interval for expired entries
    this.startCleanupInterval();
  }

  /**
   * Add node to the head of LRU list (most recently used)
   */
  private addToHead(node: LRUNode): void {
    node.next = this.lruHead;
    node.prev = null;

    if (this.lruHead !== null) {
      this.lruHead.prev = node;
    }

    this.lruHead = node;

    if (this.lruTail === null) {
      this.lruTail = node;
    }
  }

  /**
   * Remove a node from the LRU list
   */
  private removeNode(node: LRUNode): void {
    if (node.prev !== null) {
      node.prev.next = node.next;
    } else {
      this.lruHead = node.next;
    }

    if (node.next !== null) {
      node.next.prev = node.prev;
    } else {
      this.lruTail = node.prev;
    }
  }

  /**
   * Move node to head (mark as most recently used)
   */
  private moveToHead(node: LRUNode): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * Remove tail (least recently used)
   */
  private removeTail(): LRUNode | null {
    if (this.lruTail === null) return null;

    const tail = this.lruTail;
    this.removeNode(tail);
    return tail;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    const tailNode = this.removeTail();
    if (tailNode) {
      this.cache.delete(tailNode.key);
      this.lruMap.delete(tailNode.key);
      this.evictions++;
    }
  }

  /**
   * Set a value in the cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (optional)
   */
  set(key: string, value: any, ttl?: number): void {
    const actualTTL = ttl !== undefined ? ttl : this.defaultTTL;
    const now = Date.now();

    const entry: CacheEntry = {
      key,
      value,
      ttl: actualTTL,
      createdAt: now,
      expiresAt: calculateExpiration(actualTTL),
      lastAccessed: now
    };

    // Check if key already exists
    const existingNode = this.lruMap.get(key);

    if (existingNode) {
      // Update existing entry
      this.cache.set(key, entry);
      this.moveToHead(existingNode);
    } else {
      // Check if we need to evict
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }

      // Add new entry
      this.cache.set(key, entry);
      const newNode = new LRUNode(key);
      this.lruMap.set(key, newNode);
      this.addToHead(newNode);
    }
  }

  /**
   * Get a value from the cache
   * @param key - Cache key
   * @returns The cached value or undefined if not found/expired
   */
  get(key: string): any {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if expired
    if (isExpired(entry.expiresAt)) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    // Update last accessed time
    entry.lastAccessed = Date.now();
    this.cache.set(key, entry);

    // Move to head (most recently used)
    const node = this.lruMap.get(key);
    if (node) {
      this.moveToHead(node);
    }

    this.hits++;
    return entry.value;
  }

  /**
   * Check if a key exists in the cache
   * @param key - Cache key
   * @returns true if exists and not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (isExpired(entry.expiresAt)) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   * @param key - Cache key
   * @returns true if deleted, false if not found
   */
  delete(key: string): boolean {
    const node = this.lruMap.get(key);
    if (!node) return false;

    this.removeNode(node);
    this.lruMap.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.lruMap.clear();
    this.lruHead = null;
    this.lruTail = null;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get all keys in the cache
   * @returns Array of all valid (non-expired) keys
   */
  keys(): string[] {
    const allKeys = this.cache.keys();
    return allKeys.filter(key => {
      const entry = this.cache.get(key);
      if (!entry || isExpired(entry.expiresAt)) {
        this.delete(key);
        return false;
      }
      return true;
    });
  }

  /**
   * Get the number of entries in the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimals
      size: this.cache.size,
      maxSize: this.maxSize,
      evictions: this.evictions
    };
  }

  /**
   * Get detailed information about a cache entry
   * @param key - Cache key
   * @returns Cache entry or undefined
   */
  getEntry(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key);
    if (!entry || isExpired(entry.expiresAt)) {
      this.delete(key);
      return undefined;
    }
    return entry;
  }

  /**
   * Update TTL for a key
   * @param key - Cache key
   * @param ttl - New TTL in seconds
   * @returns true if updated, false if key not found
   */
  updateTTL(key: string, ttl: number): boolean {
    const entry = this.cache.get(key);
    if (!entry || isExpired(entry.expiresAt)) {
      this.delete(key);
      return false;
    }

    entry.ttl = ttl;
    entry.expiresAt = calculateExpiration(ttl);
    this.cache.set(key, entry);
    return true;
  }

  /**
   * Cleanup expired entries
   */
  private cleanupExpired(): void {
    const keys = this.cache.keys();
    let cleanedCount = 0;

    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry && isExpired(entry.expiresAt)) {
        this.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[CacheManager] Cleaned up ${cleanedCount} expired entries`);
    }
  }

  /**
   * Start interval to cleanup expired entries
   */
  private startCleanupInterval(): void {
    // Run cleanup every 60 seconds
    setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  /**
   * Get all entries (for debugging/admin purposes)
   */
  getAllEntries(): CacheEntry[] {
    return this.cache.values().filter(entry => !isExpired(entry.expiresAt));
  }
}
