import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import {
  clearLoginAttempts,
  loginRateLimit,
  registerFailedLogin,
} from '../../../server/middleware/login-rate-limit.middleware.js';
import { MAX_ATTEMPTS } from '../../../server/constants/auth.js';
import { request } from '../../helpers.js';

function response() {
  const result = {
    statusCode: 200,
    body: undefined,
    headers: {},
  };

  return {
    result,
    set(name, value) {
      result.headers[name] = value;
      return this;
    },
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
}

describe('login rate limit middleware', () => {
  afterEach(() => {
    clearLoginAttempts(request({ ip: 'rate-limit-test' }));
    clearLoginAttempts(request({ ip: 'other-client' }));
  });

  test('permite continuar cuando el cliente no ha superado el límite', () => {
    const next = () => {};
    const res = response();

    loginRateLimit(request({ ip: 'rate-limit-test' }), res, next);

    assert.equal(res.result.statusCode, 200);
  });

  test('bloquea después de alcanzar el máximo de intentos fallidos', () => {
    const req = request({ ip: 'rate-limit-test' });
    const res = response();
    let nextCalls = 0;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      registerFailedLogin(req);
    }

    loginRateLimit(req, res, () => {
      nextCalls += 1;
    });

    assert.equal(nextCalls, 0);
    assert.equal(res.result.statusCode, 429);
    assert.equal(res.result.headers['Retry-After'], String(res.result.body.retryAfter));
    assert.equal(res.result.body.ok, false);
    assert.equal(
      res.result.body.error,
      'Demasiados intentos. Intenta nuevamente en unos minutos.',
    );
    assert.ok(res.result.body.retryAfter > 0);
  });

  test('mantiene los intentos separados por dirección IP', () => {
    const blockedReq = request({ ip: 'rate-limit-test' });
    const otherReq = request({ ip: 'other-client' });
    const blockedRes = response();
    const otherRes = response();
    let nextCalls = 0;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      registerFailedLogin(blockedReq);
    }

    loginRateLimit(blockedReq, blockedRes, () => {});
    loginRateLimit(otherReq, otherRes, () => {
      nextCalls += 1;
    });

    assert.equal(blockedRes.result.statusCode, 429);
    assert.equal(otherRes.result.statusCode, 200);
    assert.equal(nextCalls, 1);
  });

  test('limpia los intentos registrados para permitir nuevos accesos', () => {
    const req = request({ ip: 'rate-limit-test' });
    const res = response();
    let nextCalls = 0;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      registerFailedLogin(req);
    }

    clearLoginAttempts(req);
    loginRateLimit(req, res, () => {
      nextCalls += 1;
    });

    assert.equal(res.result.statusCode, 200);
    assert.equal(nextCalls, 1);
  });
});