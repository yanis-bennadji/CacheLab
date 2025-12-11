import { Router } from 'express';
import * as debugController from '../controllers/debug.controller.js';

const router = Router();

// Endpoints de debug pour les tests
router.get('/debug/bucket-size', debugController.getBucketSize);

router.get('/debug/load-factor', debugController.getLoadFactor);

router.get('/debug/count', debugController.getCount);

router.get('/debug/memory', debugController.getMemoryUsage);

router.post('/debug/reset', debugController.resetCache);

export default router;

