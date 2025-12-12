import express from 'express';
import cacheRoutes from './routes/cache.routes.js';
import debugRoutes from './routes/debug.routes.js';

const app = express();

app.use(express.json());

app.use('/', cacheRoutes);
app.use('/', debugRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`CacheLab server running on port ${PORT}`);
});
