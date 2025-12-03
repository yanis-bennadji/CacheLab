import { Router, Request, Response } from 'express';
import { CacheManager } from '../cache/CacheManager';
import { validateKey, validateCacheEntry, validateUpdate } from '../middleware/validation';
import { ApiResponse } from '../../../shared/types';
import { storageService } from '../services/storageService';

const router = Router();
const cacheManager = new CacheManager();

/**
 * POST /keys - Create or update a cache entry
 */
router.post('/keys', validateCacheEntry, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, value, ttl, persist } = req.body;
    cacheManager.set(key, value, ttl);

    // Optionally persist to storage service
    if (persist === true) {
      await storageService.save(key, value);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Key set successfully',
      data: { key, persisted: persist === true }
    };

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set key'
    });
  }
});

/**
 * GET /keys/:key - Get a value by key (with fallback to storage)
 */
router.get('/keys/:key', validateKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { fallback } = req.query;
    let value = cacheManager.get(key);

    // If not in cache and fallback is enabled, try loading from storage
    if (value === undefined && fallback === 'true') {
      const storageValue = await storageService.load(key);
      if (storageValue !== undefined) {
        // Load into cache for future requests
        cacheManager.set(key, storageValue);
        value = storageValue;
      }
    }

    if (value === undefined) {
      res.status(404).json({
        success: false,
        error: 'Key not found or expired'
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: { key, value }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get key'
    });
  }
});

/**
 * PUT /keys/:key - Update a cache entry
 */
router.put('/keys/:key', validateKey, validateUpdate, (req: Request, res: Response): void => {
  try {
    const { key } = req.params;
    const { value, ttl } = req.body;

    // Check if key exists
    if (!cacheManager.has(key)) {
      res.status(404).json({
        success: false,
        error: 'Key not found'
      });
      return;
    }

    // Update value if provided
    if (value !== undefined) {
      const currentEntry = cacheManager.getEntry(key);
      const currentTTL = ttl !== undefined ? ttl : currentEntry?.ttl;
      cacheManager.set(key, value, currentTTL);
    }

    // Update TTL if provided (and value wasn't)
    if (ttl !== undefined && value === undefined) {
      cacheManager.updateTTL(key, ttl);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Key updated successfully',
      data: { key }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update key'
    });
  }
});

/**
 * DELETE /keys/:key - Delete a cache entry
 */
router.delete('/keys/:key', validateKey, (req: Request, res: Response): void => {
  try {
    const { key } = req.params;
    const deleted = cacheManager.delete(key);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Key not found'
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Key deleted successfully',
      data: { key }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete key'
    });
  }
});

/**
 * GET /keys - List all keys
 */
router.get('/keys', (req: Request, res: Response): void => {
  try {
    const keys = cacheManager.keys();

    const response: ApiResponse = {
      success: true,
      data: {
        keys,
        count: keys.length
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list keys'
    });
  }
});

/**
 * GET /stats - Get cache statistics
 */
router.get('/stats', (req: Request, res: Response): void => {
  try {
    const stats = cacheManager.getStats();

    const response: ApiResponse = {
      success: true,
      data: stats
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats'
    });
  }
});

/**
 * DELETE /cache - Clear all cache entries
 */
router.delete('/cache', (req: Request, res: Response): void => {
  try {
    cacheManager.clear();

    const response: ApiResponse = {
      success: true,
      message: 'Cache cleared successfully'
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear cache'
    });
  }
});

/**
 * GET /health - Health check endpoint
 */
router.get('/health', (req: Request, res: Response): void => {
  const stats = cacheManager.getStats();

  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      cache: {
        size: stats.size,
        maxSize: stats.maxSize
      }
    }
  });
});

/**
 * GET /debug/hashmap - Get detailed HashMap statistics
 */
router.get('/debug/hashmap', (req: Request, res: Response): void => {
  try {
    // Access the internal cache HashMap through the CacheManager
    const cache = (cacheManager as any).cache;
    const hashMapStats = cache.getStats();

    const response: ApiResponse = {
      success: true,
      data: {
        hashmap: {
          size: hashMapStats.size,
          capacity: hashMapStats.capacity,
          loadFactor: hashMapStats.loadFactor,
          loadFactorThreshold: 0.75,
          usedBuckets: hashMapStats.usedBuckets,
          emptyBuckets: hashMapStats.capacity - hashMapStats.usedBuckets,
          maxChainLength: hashMapStats.maxChainLength,
          avgChainLength: hashMapStats.avgChainLength,
          collisionRate: ((hashMapStats.size - hashMapStats.usedBuckets) / hashMapStats.size * 100).toFixed(2) + '%'
        },
        interpretation: {
          loadFactor: hashMapStats.loadFactor < 0.75
            ? 'Healthy - below resize threshold'
            : 'Will resize on next insertion',
          collisions: hashMapStats.maxChainLength > 3
            ? 'High collision rate detected'
            : 'Low collision rate - good hash distribution',
          efficiency: hashMapStats.avgChainLength < 2
            ? 'Excellent O(1) performance'
            : 'Some performance degradation due to collisions'
        }
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get HashMap stats'
    });
  }
});

/**
 * GET /debug/cache - Get detailed cache information with all entries
 */
router.get('/debug/cache', (req: Request, res: Response): void => {
  try {
    const entries = cacheManager.getAllEntries();
    const stats = cacheManager.getStats();

    // Group entries by their hash bucket
    const cache = (cacheManager as any).cache;
    const bucketDistribution: { [key: number]: string[] } = {};

    entries.forEach(entry => {
      // Calculate which bucket this key would go to
      const hashValue = require('../../../shared/utils/helpers').djb2Hash(entry.key);
      const bucketIndex = hashValue % cache.capacity;

      if (!bucketDistribution[bucketIndex]) {
        bucketDistribution[bucketIndex] = [];
      }
      bucketDistribution[bucketIndex].push(entry.key);
    });

    const response: ApiResponse = {
      success: true,
      data: {
        summary: {
          totalEntries: entries.length,
          totalBuckets: cache.capacity,
          usedBuckets: Object.keys(bucketDistribution).length,
          emptyBuckets: cache.capacity - Object.keys(bucketDistribution).length
        },
        statistics: stats,
        bucketDistribution,
        entries: entries.map(entry => ({
          key: entry.key,
          value: entry.value,
          ttl: entry.ttl,
          createdAt: new Date(entry.createdAt).toISOString(),
          expiresAt: entry.expiresAt ? new Date(entry.expiresAt).toISOString() : 'never',
          lastAccessed: entry.lastAccessed ? new Date(entry.lastAccessed).toISOString() : 'never',
          timeUntilExpiry: entry.expiresAt
            ? Math.max(0, Math.round((entry.expiresAt - Date.now()) / 1000)) + 's'
            : 'never'
        }))
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cache debug info'
    });
  }
});

/**
 * GET /debug/lru - Get LRU order information
 */
router.get('/debug/lru', (req: Request, res: Response): void => {
  try {
    // Get all entries and their access times
    const entries = cacheManager.getAllEntries();

    // Sort by lastAccessed to show LRU order
    const sortedByLRU = entries
      .sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0))
      .map((entry, index) => ({
        position: index + 1,
        key: entry.key,
        lastAccessed: entry.lastAccessed ? new Date(entry.lastAccessed).toISOString() : 'never',
        timeSinceAccess: entry.lastAccessed
          ? Math.round((Date.now() - entry.lastAccessed) / 1000) + 's ago'
          : 'never accessed',
        willBeEvictedNext: index === 0 ? 'YES - Least Recently Used' : 'No'
      }));

    const response: ApiResponse = {
      success: true,
      data: {
        lruOrder: sortedByLRU,
        interpretation: {
          leastRecentlyUsed: sortedByLRU[0]?.key || 'N/A',
          mostRecentlyUsed: sortedByLRU[sortedByLRU.length - 1]?.key || 'N/A',
          nextToEvict: sortedByLRU[0]?.key || 'N/A'
        }
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get LRU info'
    });
  }
});

export { router as cacheRoutes, cacheManager };
