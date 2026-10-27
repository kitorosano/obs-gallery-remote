import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, before, describe, test } from 'node:test';

import { config } from '../../../server/config/config.js';
import {
  SESSION_COOKIE,
  SESSION_DURATION_MS,
} from '../../../server/constants/auth.js';
import {
  createSessionToken,
  getSessionCookieName,
  getSessionDurationMs,
  parseCookies,
  verifyPassword,
  verifySessionToken,
} from '../../../server/services/auth.js';

const originalPassword = config.panelPassword;
const originalSecret = config.sessionSecret;

before(() => {
  config.panelPassword = 'panel-password';
  config.sessionSecret = 'session-secret';
});

after(() => {
  config.panelPassword = originalPassword;
  config.sessionSecret = originalSecret;
});

function createSignedToken(session) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

describe('auth service', () => {
  test('verifyPassword compara contraseñas y rechaza valores ausentes o de distinta longitud', () => {
    assert.equal(verifyPassword('panel-password'), true);
    assert.equal(verifyPassword('incorrecta'), false);
    assert.equal(verifyPassword(undefined), false);
    assert.equal(verifyPassword(null), false);
  });

  test('createSessionToken genera un token válido con duración configurada', () => {
    const token = createSessionToken();

    assert.match(token, /^[^.]+\.[^.]+$/);
    assert.equal(verifySessionToken(token), true);
    assert.equal(getSessionCookieName(), SESSION_COOKIE);
    assert.equal(getSessionDurationMs(), SESSION_DURATION_MS);
  });

  test('verifySessionToken rechaza tokens ausentes, incompletos y con firma inválida', () => {
    const validToken = createSessionToken();
    const [payload, signature] = validToken.split('.');

    assert.equal(verifySessionToken(undefined), false);
    assert.equal(verifySessionToken(''), false);
    assert.equal(verifySessionToken(payload), false);
    assert.equal(verifySessionToken(`${payload}.${signature}extra`), false);
    assert.equal(
      verifySessionToken(`${payload}.${'x'.repeat(signature.length - 1)}`),
      false,
    );
    assert.equal(verifySessionToken(`${payload}.${signature.slice(1)}`), false);
  });

  test('verifySessionToken rechaza sesiones expiradas, sin expiración o con expiración inválida', () => {
    assert.equal(
      verifySessionToken(createSignedToken({ expiresAt: Date.now() - 1 })),
      false,
    );
    assert.equal(verifySessionToken(createSignedToken({})), false);
    assert.equal(
      verifySessionToken(createSignedToken({ expiresAt: Number.NaN })),
      false,
    );
    assert.equal(
      verifySessionToken(createSignedToken({ expiresAt: 'tomorrow' })),
      false,
    );
  });

  test('verifySessionToken rechaza payloads firmados que no contienen JSON válido', () => {
    const payload = Buffer.from('not-json', 'utf8').toString('base64url');
    const signature = crypto
      .createHmac('sha256', config.sessionSecret)
      .update(payload)
      .digest('base64url');

    assert.equal(verifySessionToken(`${payload}.${signature}`), false);
  });

  test('parseCookies devuelve un objeto vacío sin header', () => {
    assert.deepEqual(parseCookies({ headers: {} }), {});
    assert.deepEqual(parseCookies({ headers: { cookie: '' } }), {});
  });

  test('parseCookies separa cookies, conserva signos igual y decodifica valores', () => {
    assert.deepEqual(
      parseCookies({
        headers: {
          cookie: 'session=abc%3D123; theme=dark; empty=',
        },
      }),
      {
        session: 'abc=123',
        theme: 'dark',
        empty: '',
      },
    );
  });
});
