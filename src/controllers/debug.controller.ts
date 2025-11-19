import cache from '../cache.js';

/**
 * Retourne la taille actuelle du tableau de buckets
 */
export function getBucketSize(req, res) {
    res.json({ bucketSize: cache.getBucketSize() });
}

/**
 * Retourne le facteur de charge actuel du cache
 */
export function getLoadFactor(req, res) {
    res.json({ loadFactor: cache.getLoadFactor() });
}

/**
 * Retourne le nombre total d'éléments dans le cache
 */
export function getCount(req, res) {
    res.json({ count: cache.count() });
}

/**
 * Réinitialise complètement le cache
 */
export function resetCache(req, res) {
    cache.reset();
    res.json({ message: "Cache réinitialisé" });
}

