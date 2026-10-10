import OBSWebSocket from 'obs-websocket-js';
import { config } from '../constants/config.js';
import { resolveImageId } from '../utils/gallery.js';

const obs = new OBSWebSocket();
let obsConnected = false;
let obsVersion = null;
let lastObsError = null;

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

export function getObsStatus(_req, res) {
  res.json({
    connected: obsConnected,
    version: obsVersion,
    host: config.obsHost,
    port: config.obsPort,
    lastError: lastObsError
  });
}

export async function connectToObs(_req, res) {
  if (obsConnected) return res.json({ ok: true, connected: true, version: obsVersion });

  try {
    const result = await obs.connect(
      `ws://${config.obsHost}:${config.obsPort}`,
      config.obsPassword || undefined,
      { rpcVersion: 1 }
    );
    obsConnected = true;
    obsVersion = result.obsVersion || null;
    lastObsError = null;
    res.json({
      ok: true,
      connected: true,
      version: obsVersion,
      obsWebSocketVersion: result.obsWebSocketVersion || null
    });
  } catch (error) {
    obsConnected = false;
    lastObsError = error?.message || 'No se pudo conectar con OBS.';
    res.status(502).json({ ok: false, connected: false, error: lastObsError });
  }
}

export async function showImage(req, res) {
  const { imageId } = req.body || {};
  if (typeof imageId !== 'string' || !imageId) {
    return res.status(400).json({ error: 'Debes enviar imageId.' });
  }
  if (!obsConnected) {
    return res.status(503).json({ error: 'OBS no está conectado. Usa primero /api/obs/connect.' });
  }

  const imagePath = await resolveImageId(config.galleryRoot, imageId);
  if (!imagePath) {
    return res.status(404).json({ error: 'La imagen seleccionada no existe en la galería autorizada.' });
  }

  try {
    await obs.call('SetInputSettings', {
      inputName: config.obsImageInput,
      inputSettings: { file: imagePath },
      overlay: false
    });
    res.json({ ok: true, message: 'Se envió la imagen a OBS.', inputName: config.obsImageInput });
  } catch (error) {
    const message = error?.message || 'No se pudo cambiar la imagen en OBS.';
    res.status(502).json({
      error: message,
      hint: `Verifica que exista una fuente de tipo Image llamada "${config.obsImageInput}" en OBS.`
    });
  }
}
