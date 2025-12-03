import { djb2Hash } from '../../../shared/utils/helpers';

/**
 * Node for linked list in hash table (for collision handling via chaining)
 */
class HashNode<T> {
  key: string;
  value: T;
  next: HashNode<T> | null;

  constructor(key: string, value: T) {
    this.key = key;
    this.value = value;
    this.next = null;
  }
}

/**
 * HashMap implementation with O(1) average case operations
 * Uses chaining for collision resolution
 */
export class HashMap<T = any> {
  private buckets: (HashNode<T> | null)[];
  private _size: number;
  private capacity: number;
  private readonly loadFactor: number;
  private readonly initialCapacity: number;

  constructor(initialCapacity: number = 16, loadFactor: number = 0.75) {
    this.initialCapacity = initialCapacity;
    this.capacity = initialCapacity;
    this.loadFactor = loadFactor;
    this.buckets = new Array(this.capacity).fill(null);
    this._size = 0;
  }

  /**
   * Get the hash index for a key
   */
  private hash(key: string): number {
    return djb2Hash(key) % this.capacity;
  }

  /**
   * Check if resize is needed and resize if necessary
   */
  private checkAndResize(): void {
    if (this._size / this.capacity >= this.loadFactor) {
      this.resize();
    }
  }

  /**
   * Resize the hash table when load factor is exceeded
   */
  private resize(): void {
    const oldBuckets = this.buckets;
    this.capacity *= 2;
    this.buckets = new Array(this.capacity).fill(null);
    this._size = 0;

    // Rehash all existing entries
    for (const bucket of oldBuckets) {
      let current = bucket;
      while (current !== null) {
        this.set(current.key, current.value);
        current = current.next;
      }
    }
  }

  /**
   * Set a key-value pair in the hash map
   * @param key - The key
   * @param value - The value
   * @returns true if new entry, false if updated existing
   */
  set(key: string, value: T): boolean {
    const index = this.hash(key);
    let current = this.buckets[index];

    // Check if key already exists
    while (current !== null) {
      if (current.key === key) {
        current.value = value;
        return false; // Updated existing
      }
      current = current.next;
    }

    // Add new node at the beginning of the chain
    const newNode = new HashNode(key, value);
    newNode.next = this.buckets[index];
    this.buckets[index] = newNode;
    this._size++;

    this.checkAndResize();
    return true; // New entry
  }

  /**
   * Get a value by key
   * @param key - The key to look up
   * @returns The value or undefined if not found
   */
  get(key: string): T | undefined {
    const index = this.hash(key);
    let current = this.buckets[index];

    while (current !== null) {
      if (current.key === key) {
        return current.value;
      }
      current = current.next;
    }

    return undefined;
  }

  /**
   * Check if a key exists
   * @param key - The key to check
   * @returns true if exists, false otherwise
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a key-value pair
   * @param key - The key to delete
   * @returns true if deleted, false if not found
   */
  delete(key: string): boolean {
    const index = this.hash(key);
    let current = this.buckets[index];
    let prev: HashNode<T> | null = null;

    while (current !== null) {
      if (current.key === key) {
        if (prev === null) {
          // Remove head of chain
          this.buckets[index] = current.next;
        } else {
          // Remove from middle/end of chain
          prev.next = current.next;
        }
        this._size--;
        return true;
      }
      prev = current;
      current = current.next;
    }

    return false;
  }

  /**
   * Clear all entries from the hash map
   */
  clear(): void {
    this.buckets = new Array(this.initialCapacity).fill(null);
    this.capacity = this.initialCapacity;
    this._size = 0;
  }

  /**
   * Get the number of entries
   */
  get size(): number {
    return this._size;
  }

  /**
   * Get all keys
   * @returns Array of all keys
   */
  keys(): string[] {
    const keys: string[] = [];
    for (const bucket of this.buckets) {
      let current = bucket;
      while (current !== null) {
        keys.push(current.key);
        current = current.next;
      }
    }
    return keys;
  }

  /**
   * Get all values
   * @returns Array of all values
   */
  values(): T[] {
    const values: T[] = [];
    for (const bucket of this.buckets) {
      let current = bucket;
      while (current !== null) {
        values.push(current.value);
        current = current.next;
      }
    }
    return values;
  }

  /**
   * Get all entries as [key, value] pairs
   * @returns Array of [key, value] tuples
   */
  entries(): [string, T][] {
    const entries: [string, T][] = [];
    for (const bucket of this.buckets) {
      let current = bucket;
      while (current !== null) {
        entries.push([current.key, current.value]);
        current = current.next;
      }
    }
    return entries;
  }

  /**
   * Iterate over all entries
   * @param callback - Function to call for each entry
   */
  forEach(callback: (value: T, key: string) => void): void {
    for (const bucket of this.buckets) {
      let current = bucket;
      while (current !== null) {
        callback(current.value, current.key);
        current = current.next;
      }
    }
  }

  /**
   * Get statistics about the hash map
   */
  getStats() {
    let maxChainLength = 0;
    let usedBuckets = 0;
    let totalChainLength = 0;

    for (const bucket of this.buckets) {
      if (bucket !== null) {
        usedBuckets++;
        let chainLength = 0;
        let current: HashNode<T> | null = bucket;
        while (current !== null) {
          chainLength++;
          current = current.next;
        }
        totalChainLength += chainLength;
        maxChainLength = Math.max(maxChainLength, chainLength);
      }
    }

    return {
      size: this._size,
      capacity: this.capacity,
      loadFactor: this._size / this.capacity,
      usedBuckets,
      maxChainLength,
      avgChainLength: usedBuckets > 0 ? totalChainLength / usedBuckets : 0
    };
  }
}
