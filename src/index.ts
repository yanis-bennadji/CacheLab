import express from 'express';
import cache from './cache.js'; // Import de notre classe

const app = express();
app.use(express.json()); // Pour lire le JSON dans le body des requêtes

// 1. GET /keys - Lister toutes les clés
app.get('/keys', (req, res) => {
    const keys = cache.keys();
    res.json({ keys: keys });
});

// 2. POST /keys - Créer
app.post('/keys', (req, res) => {
    const key = req.body.key;
    const value = req.body.value;
    
    if (key === undefined || value === undefined) {
        return res.status(400).json({ error: "Clé et valeur requises" });
    }

    cache.set(key, value);
    res.status(201).json({ message: "Sauvegardé", key: key });
});

// 3. GET /keys/:key - Lire
app.get('/keys/:key', (req, res) => {
    const key = req.params.key;
    const value = cache.get(key);

    if (value === null) {
        return res.status(404).json({ error: "Clé introuvable" });
    }
    res.json({ key: key, value: value });
});

// 4. PUT /keys/:key - Modifier
app.put('/keys/:key', (req, res) => {
    const key = req.params.key;
    const value = req.body.value; // La nouvelle valeur

    if (value === undefined) {
        return res.status(400).json({ error: "Valeur requise" });
    }

    // Vérifier si la clé existe avant de update (selon logique REST stricte)
    // Ou faire un "Upsert" (Update or Insert). Ici on fait simple.
    if (cache.get(key) === null) {
         return res.status(404).json({ error: "Clé introuvable pour modification" });
    }

    cache.set(key, value);
    res.json({ message: "Mis à jour", key: key, value: value });
});

// 5. DELETE /keys/:key - Supprimer
app.delete('/keys/:key', (req, res) => {
    const key = req.params.key;
    const deleted = cache.delete(key);

    if (deleted) {
        res.json({ message: "Supprimé" });
    } else {
        res.status(404).json({ error: "Clé introuvable" });
    }
});

// ENDPOINTS DE DEBUG (uniquement pour les tests)
// Ces endpoints exposent les métriques internes du cache
app.get('/debug/bucket-size', (req, res) => {
    res.json({ bucketSize: cache.getBucketSize() });
});

app.get('/debug/load-factor', (req, res) => {
    res.json({ loadFactor: cache.getLoadFactor() });
});

app.get('/debug/count', (req, res) => {
    res.json({ count: cache.count() });
});

// Lancement du serveur
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`CacheLab server running on port ${PORT}`);
});