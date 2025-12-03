import { CacheManager } from '../src/cache/CacheManager';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager(10, 1); // Small cache, 1 second TTL
  });

  describe('Basic Operations', () => {
    test('should set and get a value', () => {
      cacheManager.set('key1', 'value1');
      expect(cacheManager.get('key1')).toBe('value1');
    });

    test('should return undefined for non-existent key', () => {
      expect(cacheManager.get('nonexistent')).toBeUndefined();
    });

    test('should check if key exists', () => {
      cacheManager.set('key1', 'value1');
      expect(cacheManager.has('key1')).toBe(true);
      expect(cacheManager.has('key2')).toBe(false);
    });

    test('should delete a key', () => {
      cacheManager.set('key1', 'value1');
      expect(cacheManager.delete('key1')).toBe(true);
      expect(cacheManager.has('key1')).toBe(false);
    });

    test('should clear all entries', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.clear();
      expect(cacheManager.size).toBe(0);
    });
  });

  describe('TTL (Time To Live)', () => {
    test('should expire entry after TTL', async () => {
      cacheManager.set('key1', 'value1', 0.1); // 100ms TTL
      expect(cacheManager.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cacheManager.get('key1')).toBeUndefined();
    });

    test('should use default TTL when not specified', () => {
      cacheManager.set('key1', 'value1');
      const entry = cacheManager.getEntry('key1');
      expect(entry?.ttl).toBe(1); // Default TTL from constructor
    });

    test('should update TTL', () => {
      cacheManager.set('key1', 'value1', 10);
      expect(cacheManager.updateTTL('key1', 20)).toBe(true);

      const entry = cacheManager.getEntry('key1');
      expect(entry?.ttl).toBe(20);
    });

    test('should not update TTL for non-existent key', () => {
      expect(cacheManager.updateTTL('nonexistent', 10)).toBe(false);
    });

    test('should handle zero TTL (no expiration)', () => {
      cacheManager.set('key1', 'value1', 0);
      const entry = cacheManager.getEntry('key1');
      expect(entry?.expiresAt).toBeUndefined();
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used item when cache is full', () => {
      // Fill cache to max capacity (10 items)
      for (let i = 0; i < 10; i++) {
        cacheManager.set(`key${i}`, `value${i}`);
      }

      expect(cacheManager.size).toBe(10);

      // Add one more item, should evict key0 (least recently used)
      cacheManager.set('key10', 'value10');

      expect(cacheManager.size).toBe(10);
      expect(cacheManager.has('key0')).toBe(false);
      expect(cacheManager.has('key10')).toBe(true);
    });

    test('should update LRU order on get', () => {
      // Fill cache
      for (let i = 0; i < 10; i++) {
        cacheManager.set(`key${i}`, `value${i}`);
      }

      // Access key0 to make it recently used
      cacheManager.get('key0');

      // Add new item
      cacheManager.set('key10', 'value10');

      // key0 should still exist (was accessed), key1 should be evicted
      expect(cacheManager.has('key0')).toBe(true);
      expect(cacheManager.has('key1')).toBe(false);
    });

    test('should update LRU order on set', () => {
      // Fill cache
      for (let i = 0; i < 10; i++) {
        cacheManager.set(`key${i}`, `value${i}`);
      }

      // Update key0
      cacheManager.set('key0', 'updated-value0');

      // Add new item
      cacheManager.set('key10', 'value10');

      // key0 should still exist (was updated), key1 should be evicted
      expect(cacheManager.get('key0')).toBe('updated-value0');
      expect(cacheManager.has('key1')).toBe(false);
    });
  });

  describe('Statistics', () => {
    test('should track hits and misses', () => {
      cacheManager.set('key1', 'value1');

      // Hit
      cacheManager.get('key1');

      // Miss
      cacheManager.get('key2');

      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50); // 1 hit / 2 total = 50%
    });

    test('should track evictions', () => {
      // Fill cache beyond capacity
      for (let i = 0; i < 15; i++) {
        cacheManager.set(`key${i}`, `value${i}`);
      }

      const stats = cacheManager.getStats();
      expect(stats.evictions).toBe(5); // 15 - 10 = 5 evictions
    });

    test('should report current size and max size', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');

      const stats = cacheManager.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(10);
    });

    test('should calculate hit rate correctly', () => {
      cacheManager.set('key1', 'value1');

      cacheManager.get('key1'); // Hit
      cacheManager.get('key1'); // Hit
      cacheManager.get('key1'); // Hit
      cacheManager.get('key2'); // Miss

      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(75); // 3/4 = 75%
    });
  });

  describe('Entry Information', () => {
    test('should return entry with metadata', () => {
      const now = Date.now();
      cacheManager.set('key1', 'value1', 10);

      const entry = cacheManager.getEntry('key1');
      expect(entry).toBeDefined();
      expect(entry?.key).toBe('key1');
      expect(entry?.value).toBe('value1');
      expect(entry?.ttl).toBe(10);
      expect(entry?.createdAt).toBeGreaterThanOrEqual(now);
      expect(entry?.lastAccessed).toBeGreaterThanOrEqual(now);
    });

    test('should update lastAccessed on get', async () => {
      cacheManager.set('key1', 'value1');
      const entry1 = cacheManager.getEntry('key1');
      const firstAccess = entry1?.lastAccessed;

      await new Promise(resolve => setTimeout(resolve, 10));

      cacheManager.get('key1');
      const entry2 = cacheManager.getEntry('key1');
      const secondAccess = entry2?.lastAccessed;

      expect(secondAccess).toBeGreaterThan(firstAccess!);
    });
  });

  describe('Keys List', () => {
    test('should return all valid keys', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.set('key3', 'value3');

      const keys = cacheManager.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    test('should exclude expired keys', async () => {
      cacheManager.set('key1', 'value1', 0.1); // Expires in 100ms
      cacheManager.set('key2', 'value2', 10); // Expires in 10 seconds

      await new Promise(resolve => setTimeout(resolve, 150));

      const keys = cacheManager.keys();
      expect(keys).toHaveLength(1);
      expect(keys).toContain('key2');
      expect(keys).not.toContain('key1');
    });
  });

  describe('Edge Cases', () => {
    test('should handle different value types', () => {
      cacheManager.set('string', 'value');
      cacheManager.set('number', 123);
      cacheManager.set('boolean', true);
      cacheManager.set('object', { nested: 'value' });
      cacheManager.set('array', [1, 2, 3]);
      cacheManager.set('null', null);

      expect(cacheManager.get('string')).toBe('value');
      expect(cacheManager.get('number')).toBe(123);
      expect(cacheManager.get('boolean')).toBe(true);
      expect(cacheManager.get('object')).toEqual({ nested: 'value' });
      expect(cacheManager.get('array')).toEqual([1, 2, 3]);
      expect(cacheManager.get('null')).toBeNull();
    });

    test('should handle updating values', () => {
      cacheManager.set('key1', 'value1');
      expect(cacheManager.get('key1')).toBe('value1');

      cacheManager.set('key1', 'value2');
      expect(cacheManager.get('key1')).toBe('value2');
      expect(cacheManager.size).toBe(1);
    });
  });
});
