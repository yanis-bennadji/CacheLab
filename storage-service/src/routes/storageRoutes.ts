import { Router, Request, Response } from 'express';
import { StorageManager } from '../storage/StorageManager';
import { validateKey, validateStorageEntry } from '../middleware/validation';
import { ApiResponse } from '../../../shared/types';
import { config } from '../config/config';

const router = Router();
let storageManager: StorageManager;

/**
 * Initialize storage manager
 */
export async function initializeStorage(): Promise<void> {
  storageManager = new StorageManager(
    config.dataPath,
    config.backupInterval
  );
  await storageManager.initialize();
}

/**
 * POST /data - Save a key-value pair
 */
router.post('/data', validateStorageEntry, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, value } = req.body;
    const entry = await storageManager.save(key, value);

    const response: ApiResponse = {
      success: true,
      message: 'Data saved successfully',
      data: {
        key,
        version: entry.metadata.version,
        createdAt: entry.metadata.createdAt,
        updatedAt: entry.metadata.updatedAt
      }
    };

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save data'
    });
  }
});

/**
 * GET /data/:key - Get a value by key
 */
router.get('/data/:key', validateKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const entry = await storageManager.load(key);

    if (!entry) {
      res.status(404).json({
        success: false,
        error: 'Key not found'
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        key: entry.key,
        value: entry.value,
        metadata: entry.metadata
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load data'
    });
  }
});

/**
 * PUT /data/:key - Update a value
 */
router.put('/data/:key', validateKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      res.status(400).json({
        success: false,
        error: 'Value is required'
      });
      return;
    }

    // Check if key exists
    const exists = await storageManager.exists(key);
    if (!exists) {
      res.status(404).json({
        success: false,
        error: 'Key not found'
      });
      return;
    }

    const entry = await storageManager.save(key, value);

    const response: ApiResponse = {
      success: true,
      message: 'Data updated successfully',
      data: {
        key,
        version: entry.metadata.version,
        updatedAt: entry.metadata.updatedAt
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update data'
    });
  }
});

/**
 * DELETE /data/:key - Delete a key-value pair
 */
router.delete('/data/:key', validateKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const deleted = await storageManager.delete(key);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Key not found'
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Data deleted successfully',
      data: { key }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete data'
    });
  }
});

/**
 * GET /data - List all keys
 */
router.get('/data', async (req: Request, res: Response): Promise<void> => {
  try {
    const keys = await storageManager.list();

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
 * GET /stats - Get storage statistics
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await storageManager.getStats();

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
 * DELETE /storage - Clear all data
 */
router.delete('/storage', async (req: Request, res: Response): Promise<void> => {
  try {
    await storageManager.clear();

    const response: ApiResponse = {
      success: true,
      message: 'Storage cleared successfully'
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear storage'
    });
  }
});

/**
 * POST /backup - Create a backup
 */
router.post('/backup', async (req: Request, res: Response): Promise<void> => {
  try {
    const backupPath = await storageManager.createBackup();

    const response: ApiResponse = {
      success: true,
      message: 'Backup created successfully',
      data: { backupPath }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create backup'
    });
  }
});

/**
 * POST /compact - Compact data
 */
router.post('/compact', async (req: Request, res: Response): Promise<void> => {
  try {
    await storageManager.compact();

    const response: ApiResponse = {
      success: true,
      message: 'Data compacted successfully'
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compact data'
    });
  }
});

/**
 * GET /health - Health check endpoint
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await storageManager.getStats();

    res.json({
      success: true,
      data: {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        storage: {
          totalKeys: stats.totalKeys,
          totalSize: stats.totalSize
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

export { router as storageRoutes, storageManager };
