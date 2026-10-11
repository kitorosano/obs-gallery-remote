import { config } from '../config/config.js';
import { connectObs, getObsConnectionState } from '../obs/connection.js';

export function getObsStatus(_req, res) {
  const state = getObsConnectionState();
  res.json({
    connected: state.connected,
    version: state.version,
    host: config.obsHost,
    port: config.obsPort,
    lastError: state.lastError,
  });
}

export async function connectToObs(_req, res) {
  const state = getObsConnectionState();
  if (state.connected) {
    return res.json({ ok: true, connected: true, version: state.version });
  }

  try {
    const result = await connectObs();
    return res.json({
      ok: true,
      connected: true,
      version: result.obsVersion || null,
      obsWebSocketVersion: result.obsWebSocketVersion || null,
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      connected: false,
      error: getObsConnectionState().lastError || 'No se pudo conectar con OBS.',
    });
  }
}
