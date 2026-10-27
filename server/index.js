import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import { config, validateConfig } from './config/config.js';
import galleryRoutes from './routes/gallery.routes.js';
import healthRoutes from './routes/health.routes.js';
import obsRoutes from './routes/obs.routes.js';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.static(`${config.projectRoot}/public`));

app.use('/api/health', healthRoutes);
app.use('/api/obs', obsRoutes);
app.use('/api/gallery', galleryRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

validateConfig();
await fs.mkdir(config.galleryRoot, { recursive: true });

app.listen(config.port, config.host, () => {
  console.log(
    `OBS Gallery Remote disponible en http://localhost:${config.port}`,
  );
  console.log(`Carpeta de galería: ${config.galleryRoot}`);
  console.log(
    `OBS WebSocket configurado en ws://${config.obsHost}:${config.obsPort}`,
  );
  console.log(
    'Conexión OBS: ejecuta POST /api/obs/connect desde la interfaz o una herramienta HTTP.',
  );
});
