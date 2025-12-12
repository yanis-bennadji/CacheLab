import { Router } from 'express';
import * as cacheController from '../controllers/cache.controller.js';
import { validateCreateKey, validateUpdateKey } from '../middlewares/validation.js';

const router = Router();

router.get('/keys', cacheController.listKeys);

router.post('/keys', validateCreateKey, cacheController.createKey);

router.get('/keys/:key', cacheController.getKey);

router.put('/keys/:key', validateUpdateKey, cacheController.updateKey);

router.delete('/keys/:key', cacheController.deleteKey);

export default router;

