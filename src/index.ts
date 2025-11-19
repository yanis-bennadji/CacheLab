import express from 'express';
import cacheRoutes from './routes/cache.routes.js';
import debugRoutes from './routes/debug.routes.js';

const app = express();

// Middlewares globaux
app.use(express.json());

// Routes
app.use('/', cacheRoutes);
app.use('/', debugRoutes);

// Démarrage du serveur
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`CacheLab server running on port ${PORT}`);
});
