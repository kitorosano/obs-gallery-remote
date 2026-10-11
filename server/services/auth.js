import crypto from 'node:crypto';

import { SESSION_COOKIE, SESSION_DURATION_MS } from '../constants/auth.js';
import { config } from '../config/config.js';

function sign(value) {
  return crypto
    .createHmac('sha256', config.sessionSecret)
    .update(value)
    .digest('base64url');
}

function safeEqual(a, b) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);

  if (first.length !== second.length) return false;

  return crypto.timingSafeEqual(first, second);
}

export function verifyPassword(password) {
  return safeEqual(String(password ?? ''), config.panelPassword);
}

export function createSessionToken() {
  const expiresAt = Date.now() + SESSION_DURATION_MS;

  const payload = Buffer.from(JSON.stringify({ expiresAt })).toString(
    'base64url',
  );

  const signature = sign(payload);

  return `${payload}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token) return false;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expectedSignature = sign(payload);

  if (!safeEqual(signature, expectedSignature)) return false;

  try {
    const session = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );

    return Number.isFinite(session.expiresAt) && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionDurationMs() {
  return SESSION_DURATION_MS;
}

export function parseCookies(req) {
  const header = req.headers.cookie;

  if (!header) return {};

  return Object.fromEntries(
    header.split(';').map((cookie) => {
      const [name, ...value] = cookie.trim().split('=');

      return [name, decodeURIComponent(value.join('='))];
    }),
  );
}
