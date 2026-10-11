import {
  getSessionCookieName,
  parseCookies,
  verifySessionToken,
} from '../services/auth.js';

export function requireAuth(req, res, next) {
  const cookies = parseCookies(req);

  const token = cookies[getSessionCookieName()];

  if (!verifySessionToken(token)) {
    return res.status(401).json({
      ok: false,
      error: 'Autenticación requerida.',
    });
  }

  next();
}
