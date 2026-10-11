import {
  createSessionToken,
  getSessionCookieName,
  getSessionDurationMs,
  parseCookies,
  verifyPassword,
  verifySessionToken,
} from '../services/auth.js';

export function login(req, res) {
  const { password } = req.body;

  if (!verifyPassword(password)) {
    return res.status(401).json({
      ok: false,
      error: 'Contraseña incorrecta.',
    });
  }

  const token = createSessionToken();

  res.cookie(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: getSessionDurationMs(),

    // Estamos usando HTTP dentro
    // de la LAN por ahora.
    secure: false,
  });

  return res.json({
    ok: true,
    authenticated: true,
  });
}

export function logout(_req, res) {
  res.clearCookie(getSessionCookieName(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: false,
  });

  return res.json({
    ok: true,
  });
}

export function getAuthStatus(req, res) {
  const cookies = parseCookies(req);

  const authenticated = verifySessionToken(cookies[getSessionCookieName()]);

  return res.json({
    ok: true,
    authenticated,
  });
}
