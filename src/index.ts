import express from 'express';
import cache from './cache.js';

const app = express();
app.use(express.json());

// Lister toutes les clés
app.get('/keys', (req, res) => {
    const keys = cache.keys();
    res.json({ keys: keys });
});

// Créer une paire clé-valeur
app.post('/keys', (req, res) => {
    const key = req.body.key;
    const value = req.body.value;
    
    if (key === undefined || value === undefined) {
        return res.status(400).json({ error: "Clé et valeur requises" });
    }

    cache.set(key, value);
    res.status(201).json({ message: "Sauvegardé", key: key });
});

// Lire une valeur
app.get('/keys/:key', (req, res) => {
    const key = req.params.key;
    const value = cache.get(key);

    if (value === null) {
        return res.status(404).json({ error: "Clé introuvable" });
    }
    res.json({ key: key, value: value });
});

// Modifier une valeur existante
app.put('/keys/:key', (req, res) => {
    const key = req.params.key;
    const value = req.body.value;

    if (value === undefined) {
        return res.status(400).json({ error: "Valeur requise" });
    }

    if (cache.get(key) === null) {
         return res.status(404).json({ error: "Clé introuvable pour modification" });
    }

    cache.set(key, value);
    res.json({ message: "Mis à jour", key: key, value: value });
});

// Supprimer une clé
app.delete('/keys/:key', (req, res) => {
    const key = req.params.key;
    const deleted = cache.delete(key);

    if (deleted) {
        res.json({ message: "Supprimé" });
    } else {
        res.status(404).json({ error: "Clé introuvable" });
    }
});

// Endpoints de debug pour les tests
app.get('/debug/bucket-size', (req, res) => {
    res.json({ bucketSize: cache.getBucketSize() });
});

app.get('/debug/load-factor', (req, res) => {
    res.json({ loadFactor: cache.getLoadFactor() });
});

app.get('/debug/count', (req, res) => {
    res.json({ count: cache.count() });
});

app.post('/debug/reset', (req, res) => {
    cache.reset();
    res.json({ message: "Cache réinitialisé" });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`CacheLab server running on port ${PORT}`);
});
