import { HashMap } from '../src/cache/HashMap';

describe('HashMap', () => {
  let hashMap: HashMap<string>;

  beforeEach(() => {
    hashMap = new HashMap<string>(8);
  });

  describe('Basic Operations', () => {
    test('should set and get a value', () => {
      hashMap.set('key1', 'value1');
      expect(hashMap.get('key1')).toBe('value1');
    });

    test('should return undefined for non-existent key', () => {
      expect(hashMap.get('nonexistent')).toBeUndefined();
    });

    test('should update existing key', () => {
      hashMap.set('key1', 'value1');
      hashMap.set('key1', 'value2');
      expect(hashMap.get('key1')).toBe('value2');
      expect(hashMap.size).toBe(1);
    });

    test('should check if key exists', () => {
      hashMap.set('key1', 'value1');
      expect(hashMap.has('key1')).toBe(true);
      expect(hashMap.has('key2')).toBe(false);
    });

    test('should delete a key', () => {
      hashMap.set('key1', 'value1');
      expect(hashMap.delete('key1')).toBe(true);
      expect(hashMap.has('key1')).toBe(false);
      expect(hashMap.size).toBe(0);
    });

    test('should return false when deleting non-existent key', () => {
      expect(hashMap.delete('nonexistent')).toBe(false);
    });

    test('should clear all entries', () => {
      hashMap.set('key1', 'value1');
      hashMap.set('key2', 'value2');
      hashMap.clear();
      expect(hashMap.size).toBe(0);
      expect(hashMap.has('key1')).toBe(false);
    });
  });

  describe('Size and Capacity', () => {
    test('should track size correctly', () => {
      expect(hashMap.size).toBe(0);
      hashMap.set('key1', 'value1');
      expect(hashMap.size).toBe(1);
      hashMap.set('key2', 'value2');
      expect(hashMap.size).toBe(2);
      hashMap.delete('key1');
      expect(hashMap.size).toBe(1);
    });

    test('should resize when load factor is exceeded', () => {
      // Initial capacity is 8, load factor is 0.75
      // Should resize after 6 entries
      for (let i = 0; i < 10; i++) {
        hashMap.set(`key${i}`, `value${i}`);
      }

      expect(hashMap.size).toBe(10);

      // All values should still be accessible after resize
      for (let i = 0; i < 10; i++) {
        expect(hashMap.get(`key${i}`)).toBe(`value${i}`);
      }
    });
  });

  describe('Collision Handling', () => {
    test('should handle collisions with chaining', () => {
      // Force collisions by using many keys
      for (let i = 0; i < 20; i++) {
        hashMap.set(`collision-key-${i}`, `value-${i}`);
      }

      // All values should be retrievable
      for (let i = 0; i < 20; i++) {
        expect(hashMap.get(`collision-key-${i}`)).toBe(`value-${i}`);
      }
    });
  });

  describe('Iteration Methods', () => {
    beforeEach(() => {
      hashMap.set('key1', 'value1');
      hashMap.set('key2', 'value2');
      hashMap.set('key3', 'value3');
    });

    test('should return all keys', () => {
      const keys = hashMap.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    test('should return all values', () => {
      const values = hashMap.values();
      expect(values).toHaveLength(3);
      expect(values).toContain('value1');
      expect(values).toContain('value2');
      expect(values).toContain('value3');
    });

    test('should return all entries', () => {
      const entries = hashMap.entries();
      expect(entries).toHaveLength(3);
      expect(entries).toContainEqual(['key1', 'value1']);
      expect(entries).toContainEqual(['key2', 'value2']);
      expect(entries).toContainEqual(['key3', 'value3']);
    });

    test('should iterate with forEach', () => {
      const collected: { key: string; value: string }[] = [];
      hashMap.forEach((value, key) => {
        collected.push({ key, value });
      });

      expect(collected).toHaveLength(3);
      expect(collected.map(c => c.key)).toContain('key1');
    });
  });

  describe('Statistics', () => {
    test('should provide accurate statistics', () => {
      hashMap.set('key1', 'value1');
      hashMap.set('key2', 'value2');

      const stats = hashMap.getStats();
      expect(stats.size).toBe(2);
      expect(stats.capacity).toBeGreaterThanOrEqual(2);
      expect(stats.loadFactor).toBeGreaterThan(0);
      expect(stats.usedBuckets).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string keys', () => {
      hashMap.set('', 'empty-key-value');
      expect(hashMap.get('')).toBe('empty-key-value');
    });

    test('should handle special characters in keys', () => {
      const specialKey = 'key-with-!@#$%^&*()';
      hashMap.set(specialKey, 'special-value');
      expect(hashMap.get(specialKey)).toBe('special-value');
    });

    test('should handle different value types', () => {
      const map = new HashMap<any>();
      map.set('string', 'value');
      map.set('number', 123);
      map.set('boolean', true);
      map.set('object', { nested: 'value' });
      map.set('array', [1, 2, 3]);

      expect(map.get('string')).toBe('value');
      expect(map.get('number')).toBe(123);
      expect(map.get('boolean')).toBe(true);
      expect(map.get('object')).toEqual({ nested: 'value' });
      expect(map.get('array')).toEqual([1, 2, 3]);
    });
  });
});
