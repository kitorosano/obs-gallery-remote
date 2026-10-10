import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import OBSWebSocket from 'obs-websocket-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const galleryRoot = path.resolve(projectRoot, process.env.GALLERY_ROOT || './gallery');
const host = process.env.HOST || '0.0.0.0';
const port = Number.parseInt(process.env.PORT || '3000', 10);
const obsHost = process.env.OBS_HOST || '127.0.0.1';
const obsPort = Number.parseInt(process.env.OBS_PORT || '4455', 10);
const obsPassword = process.env.OBS_PASSWORD || '';
const obsImageInput = process.env.OBS_IMAGE_INPUT || 'OBS_GALLERY_REMOTE';
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']);

const app = express();
const obs = new OBSWebSocket();
let obsConnected = false;
let obsVersion = null;
let lastObsError = null;

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(projectRoot, 'public')));

obs.on('ConnectionOpened', () => {
  obsConnected = true;
  lastObsError = null;
  console.log('Conectado a OBS WebSocket.');
});
obs.on('ConnectionClosed', () => {
  obsConnected = false;
  obsVersion = null;
  console.log('Conexión con OBS cerrada.');
});
obs.on('ConnectionError', (error) => {
  lastObsError = error?.message || 'Error de conexión con OBS.';
  console.error('Error de OBS WebSocket:', lastObsError);
});

function isInsideGallery(candidate) {
  const relative = path.relative(galleryRoot, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function encodeId(relativePath) {
  return Buffer.from(relativePath.split(path.sep).join('/'), 'utf8').toString('base64url');
}

function decodeId(id) {
  try {
    return Buffer.from(id, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

async function walkImages(dir = galleryRoot) {
  const results = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return results;
    throw error;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const absolutePath = path.resolve(dir, entry.name);
    if (!isInsideGallery(absolutePath)) continue;
    if (entry.isDirectory()) {
      results.push(...await walkImages(absolutePath));
    } else if (entry.isFile() && allowedExtensions.has(path.extname(entry.name).toLowerCase())) {
      const relativePath = path.relative(galleryRoot, absolutePath);
      const stat = await fs.stat(absolutePath);
      const category = path.dirname(relativePath) === '.' ? 'Sin categoría' : path.dirname(relativePath).split(path.sep).join(' / ');
      results.push({
        id: encodeId(relativePath),
        name: path.basename(entry.name, path.extname(entry.name)),
        filename: entry.name,
        category,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        previewUrl: `/api/gallery/${encodeId(relativePath)}/file`
      });
    }
  }
  return results;
}

async function resolveImageId(id) {
  const relative = decodeId(id);
  if (!relative || path.isAbsolute(relative)) return null;
  const absolutePath = path.resolve(galleryRoot, relative);
  if (!isInsideGallery(absolutePath)) return null;
  if (!allowedExtensions.has(path.extname(absolutePath).toLowerCase())) return null;
  try {
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) return null;
    return absolutePath;
  } catch {
    return null;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'obs-gallery-remote', version: '0.1.0' });
});

app.get('/api/obs/status', (_req, res) => {
  res.json({
    connected: obsConnected,
    version: obsVersion,
    host: obsHost,
    port: obsPort,
    lastError: lastObsError
  });
});

app.post('/api/obs/connect', async (_req, res) => {
  if (obsConnected) return res.json({ ok: true, connected: true, version: obsVersion });
  try {
    const result = await obs.connect(`ws://${obsHost}:${obsPort}`, obsPassword || undefined, {
      rpcVersion: 1
    });
    obsConnected = true;
    obsVersion = result.obsVersion || null;
    lastObsError = null;
    res.json({ ok: true, connected: true, version: obsVersion, obsWebSocketVersion: result.obsWebSocketVersion || null });
  } catch (error) {
    obsConnected = false;
    lastObsError = error?.message || 'No se pudo conectar con OBS.';
    res.status(502).json({ ok: false, connected: false, error: lastObsError });
  }
});

app.get('/api/gallery', async (_req, res, next) => {
  try {
    const images = await walkImages();
    res.json({ count: images.length, images });
  } catch (error) {
    next(error);
  }
});

app.get('/api/gallery/:id/file', async (req, res) => {
  const imagePath = await resolveImageId(req.params.id);
  if (!imagePath) return res.status(404).json({ error: 'No se encontró esa imagen en la galería autorizada.' });
  res.sendFile(imagePath, { dotfiles: 'deny' });
});

app.post('/api/obs/show', async (req, res) => {
  const { imageId } = req.body || {};
  if (typeof imageId !== 'string' || !imageId) {
    return res.status(400).json({ error: 'Debes enviar imageId.' });
  }
  if (!obsConnected) return res.status(503).json({ error: 'OBS no está conectado. Usa primero /api/obs/connect.' });
  const imagePath = await resolveImageId(imageId);
  if (!imagePath) return res.status(404).json({ error: 'La imagen seleccionada no existe en la galería autorizada.' });
  try {
    await obs.call('SetInputSettings', {
      inputName: obsImageInput,
      inputSettings: { file: imagePath },
      overlay: false
    });
    res.json({ ok: true, message: 'Se envió la imagen a OBS.', inputName: obsImageInput });
  } catch (error) {
    const message = error?.message || 'No se pudo cambiar la imagen en OBS.';
    res.status(502).json({ error: message, hint: `Verifica que exista una fuente de tipo Image llamada "${obsImageInput}" en OBS.` });
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

await fs.mkdir(galleryRoot, { recursive: true });
app.listen(port, host, () => {
  console.log(`OBS Gallery Remote disponible en http://localhost:${port}`);
  console.log(`Carpeta de galería: ${galleryRoot}`);
  console.log(`OBS WebSocket configurado en ws://${obsHost}:${obsPort}`);
  console.log('Conexión OBS: ejecuta POST /api/obs/connect desde la interfaz o una herramienta HTTP.');
});
