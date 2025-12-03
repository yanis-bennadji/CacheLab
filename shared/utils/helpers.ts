/**
 * Utility functions shared across services
 */

/**
 * DJB2 hash function for string keys
 * @param key - The string to hash
 * @returns A positive integer hash value
 */
export function djb2Hash(key: string): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) + key.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Check if a value has expired based on timestamp
 * @param expiresAt - Expiration timestamp
 * @returns true if expired, false otherwise
 */
export function isExpired(expiresAt?: number): boolean {
  if (!expiresAt) return false;
  return Date.now() > expiresAt;
}

/**
 * Validate key format and length
 * @param key - The key to validate
 * @param maxLength - Maximum allowed length
 * @returns true if valid, false otherwise
 */
export function isValidKey(key: string, maxLength: number = 256): boolean {
  return typeof key === 'string' && key.length > 0 && key.length <= maxLength;
}

/**
 * Validate value size
 * @param value - The value to validate
 * @param maxSize - Maximum allowed size in bytes
 * @returns true if valid, false otherwise
 */
export function isValidValueSize(value: any, maxSize: number = 1048576): boolean {
  const size = JSON.stringify(value).length;
  return size <= maxSize;
}

/**
 * Calculate TTL expiration timestamp
 * @param ttl - Time to live in seconds
 * @returns Expiration timestamp or undefined if no TTL
 */
export function calculateExpiration(ttl?: number): number | undefined {
  if (!ttl || ttl <= 0) return undefined;
  return Date.now() + (ttl * 1000);
}

/**
 * Deep clone an object
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Format bytes to human readable string
 * @param bytes - Number of bytes
 * @returns Formatted string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
