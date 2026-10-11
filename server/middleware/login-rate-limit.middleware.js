import { MAX_ATTEMPTS, WINDOW_MS } from '../constants/auth.js';

const attempts = new Map();

function getClientKey(req) {
  return req.ip;
}

function getEntry(req) {
  const key = getClientKey(req);
  const now = Date.now();

  let entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 0,
      resetAt: now + WINDOW_MS,
    };

    attempts.set(key, entry);
  }

  return {
    key,
    entry,
  };
}

export function loginRateLimit(req, res, next) {
  const { entry } = getEntry(req);

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.resetAt - Date.now()) / 1000);

    res.set('Retry-After', String(retryAfter));

    return res.status(429).json({
      ok: false,
      error: 'Demasiados intentos. Intenta nuevamente en unos minutos.',
      retryAfter,
    });
  }

  next();
}

export function registerFailedLogin(req) {
  const { entry } = getEntry(req);

  entry.count += 1;
}

export function clearLoginAttempts(req) {
  attempts.delete(getClientKey(req));
}
