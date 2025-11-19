import { Router } from 'express';
import * as cacheController from '../controllers/cache.controller.js';
import { validateCreateKey, validateUpdateKey } from '../middlewares/validation.js';

const router = Router();

// Lister toutes les clés
router.get('/keys', cacheController.listKeys);

// Créer une paire clé-valeur
router.post('/keys', validateCreateKey, cacheController.createKey);

// Lire une valeur
router.get('/keys/:key', cacheController.getKey);

// Modifier une valeur existante
router.put('/keys/:key', validateUpdateKey, cacheController.updateKey);

// Supprimer une clé
router.delete('/keys/:key', cacheController.deleteKey);

export default router;

