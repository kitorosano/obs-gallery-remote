import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const calls = [];
const router = {
  get(...args) {
    calls.push(['get', ...args]);
  },
  post(...args) {
    calls.push(['post', ...args]);
  },
};

const getAuthStatus = () => {};
const login = () => {};
const logout = () => {};
const loginRateLimit = () => {};

mock.module('express', {
  namedExports: { Router: () => router },
});
mock.module(
  new URL('../../../server/controllers/auth.controller.js', import.meta.url),
  {
    namedExports: { getAuthStatus, login, logout },
  },
);
mock.module(
  new URL(
    '../../../server/middleware/login-rate-limit.middleware.js',
    import.meta.url,
  ),
  {
    namedExports: { loginRateLimit },
  },
);

describe('auth.routes', () => {
  test('registra las rutas de autenticación y su middleware', async () => {
    const { default: routes } =
      await import('../../../server/routes/auth.routes.js');

    assert.equal(routes, router);
    assert.deepEqual(calls, [
      ['get', '/status', getAuthStatus],
      ['post', '/login', loginRateLimit, login],
      ['post', '/logout', logout],
    ]);
  });
});
