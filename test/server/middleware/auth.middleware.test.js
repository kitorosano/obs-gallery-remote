import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { config } from '../../../server/config/config.js';
import { requireAuth } from '../../../server/middleware/auth.middleware.js';
import {
  createSessionToken,
  getSessionCookieName,
} from '../../../server/services/auth.js';
import { request, response } from '../../helpers.js';

const originalSecret = config.sessionSecret;

before(() => {
  config.sessionSecret = 'middleware-test-secret';
});

after(() => {
  config.sessionSecret = originalSecret;
});

describe('auth middleware', () => {
  test('rechaza solicitudes sin cookie de sesión', () => {
    const res = response();
    let nextCalls = 0;

    requireAuth(request(), res, () => {
      nextCalls += 1;
    });

    assert.equal(res.result.statusCode, 401);
    assert.deepEqual(res.result.body, {
      ok: false,
      error: 'Autenticación requerida.',
    });
    assert.equal(nextCalls, 0);
  });

  test('rechaza una cookie con un token inválido', () => {
    const res = response();
    let nextCalls = 0;

    requireAuth(
      request({
        headers: {
          cookie: `${getSessionCookieName()}=invalid-token`,
        },
      }),
      res,
      () => {
        nextCalls += 1;
      },
    );

    assert.equal(res.result.statusCode, 401);
    assert.equal(nextCalls, 0);
  });

  test('permite continuar con una sesión válida', () => {
    const res = response();
    let nextCalls = 0;

    requireAuth(
      request({
        headers: {
          cookie: `${getSessionCookieName()}=${createSessionToken()}`,
        },
      }),
      res,
      () => {
        nextCalls += 1;
      },
    );

    assert.equal(res.result.statusCode, 200);
    assert.equal(nextCalls, 1);
  });
});
