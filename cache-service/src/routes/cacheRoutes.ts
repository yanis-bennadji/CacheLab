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

export { router as cacheRoutes, cacheManager };
