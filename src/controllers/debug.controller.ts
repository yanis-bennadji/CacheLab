import type { Request, Response } from 'express';
import cache from '../cache.js';
import type {
    BucketSizeResponse,
    LoadFactorResponse,
    CountResponse,
    ResetResponse,
    MemoryUsageResponse
} from '../types/api.types.js';

/**
 * Retourne la taille actuelle du tableau de buckets
 */
export function getBucketSize(req: Request, res: Response<BucketSizeResponse>): void {
    res.json({ bucketSize: cache.getBucketSize() });
}

/**
 * Retourne le facteur de charge actuel du cache
 */
export function getLoadFactor(req: Request, res: Response<LoadFactorResponse>): void {
    res.json({ loadFactor: cache.getLoadFactor() });
}

/**
 * Retourne le nombre total d'éléments dans le cache
 */
export function getCount(req: Request, res: Response<CountResponse>): void {
    res.json({ count: cache.count() });
}

/**
 * Réinitialise complètement le cache
 */
export function resetCache(req: Request, res: Response<ResetResponse>): void {
    cache.reset();
    res.json({ message: "Cache réinitialisé" });
}

/**
 * Retourne l'utilisation mémoire actuelle du cache
 */
export function getMemoryUsage(req: Request, res: Response<MemoryUsageResponse>): void {
    const currentMemoryBytes = cache.getMemoryUsage();
    const maxMemoryBytes = cache.getMaxMemory();
    const usagePercentage = (currentMemoryBytes / maxMemoryBytes) * 100;
    
    res.json({
        currentMemoryBytes,
        maxMemoryBytes,
        usagePercentage: Math.round(usagePercentage * 100) / 100
    });
}

