import cache from '../cache.js';

/**
 * Liste toutes les clés du cache
 */
export function listKeys(req, res) {
    const keys = cache.keys();
    res.json({ keys });
}

/**
 * Crée une nouvelle paire clé-valeur dans le cache
 */
export function createKey(req, res) {
    const { key, value } = req.body;
    
    cache.set(key, value);
    res.status(201).json({ message: "Sauvegardé", key });
}

/**
 * Récupère la valeur associée à une clé
 */
export function getKey(req, res) {
    const key = req.params.key;
    const value = cache.get(key);

    if (value === null) {
        res.status(404).json({ error: "Clé introuvable" });
        return;
    }
    
    res.json({ key, value });
}

/**
 * Met à jour la valeur d'une clé existante
 */
export function updateKey(req, res) {
    const key = req.params.key;
    const { value } = req.body;

    if (cache.get(key) === null) {
        res.status(404).json({ error: "Clé introuvable pour modification" });
        return;
    }

    cache.set(key, value);
    res.json({ message: "Mis à jour", key, value });
}

/**
 * Supprime une clé du cache
 */
export function deleteKey(req, res) {
    const key = req.params.key;
    const deleted = cache.delete(key);

    if (deleted) {
        res.json({ message: "Supprimé" });
    } else {
        res.status(404).json({ error: "Clé introuvable" });
    }
}

