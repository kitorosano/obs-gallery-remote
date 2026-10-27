import {
  connectObs,
  disconnectObs,
  getObsConnectionState,
} from '../obs/connection.js';

export function getObsStatus(_req, res) {
  const state = getObsConnectionState();

  res.json({
    status: state.status,
    connected: state.connected,
    version: state.version,
    host: state.endpoint?.host ?? null,
    port: state.endpoint?.port ?? null,
    lastError: state.lastError,
  });
}

export async function connectToObs(req, res) {
  const host = String(req.body?.host || '').trim();
  const port = Number(req.body?.port);
  const password = String(req.body?.password || '');

  if (!host) {
    return res.status(400).json({
      ok: false,
      error: 'El host de OBS es obligatorio.',
    });
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return res.status(400).json({
      ok: false,
      error: 'El puerto de OBS no es válido.',
    });
  }

  try {
    const result = await connectObs({
      host,
      port,
      password,
    });

    return res.json({
      ok: true,
      connected: true,
      version: result.obsVersion || null,
      obsWebSocketVersion: result.obsWebSocketVersion || null,
    });
  } catch {
    return res.status(502).json({
      ok: false,
      connected: false,
      error:
        getObsConnectionState().lastError || 'No se pudo conectar con OBS.',
    });
  }
}

export async function disconnectFromObs(_req, res) {
  await disconnectObs();

  return res.json({
    ok: true,
    connected: false,
  });
}
