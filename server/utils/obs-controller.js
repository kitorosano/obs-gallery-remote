import { isObsConnected } from '../obs/connection.js';

export function requireObs(res) {
  if (isObsConnected()) return true;

  res.status(503).json({
    error: 'OBS no está conectado. Usa primero /api/obs/connect.',
  });
  return false;
}

export function sendObsError(res, error, fallback) {
  return res.status(error?.status || 502).json({
    error: error?.message || fallback,
  });
}

export async function respondWithObsAction(res, action, fallback) {
  if (!requireObs(res)) return;

  try {
    return res.json({ ok: true, ...(await action()) });
  } catch (error) {
    return sendObsError(res, error, fallback);
  }
}
