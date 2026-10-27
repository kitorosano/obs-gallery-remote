import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { config } from '../../../server/config/config.js';
import {
  getAuthStatus,
  login,
  logout,
} from '../../../server/controllers/auth.controller.js';
import { getSessionCookieName } from '../../../server/services/auth.js';
import { request, response } from '../../helpers.js';

const old = { password: config.panelPassword, secret: config.sessionSecret };
before(() => {
  config.panelPassword = 'secret';
  config.sessionSecret = 'test-secret';
});
after(() => {
  config.panelPassword = old.password;
  config.sessionSecret = old.secret;
});

describe('auth controller', () => {
  test('login rechaza y registra contraseña incorrecta', () => {
    const res = response();
    login(request({ body: { password: 'bad' } }), res);

    assert.equal(res.result.statusCode, 401);
    assert.equal(res.result.body.ok, false);
  });

  test('login crea cookie con credenciales válidas', () => {
    const req = request({ body: { password: 'secret' } });
    const res = response();
    login(req, res);

    assert.equal(res.result.body.authenticated, true);
    assert.equal(res.result.cookie.name, getSessionCookieName());
  });

  test('logout limpia la cookie de sesión', () => {
    const out = response();
    logout(request(), out);

    assert.equal(out.result.clearedCookie.name, getSessionCookieName());
    assert.equal(out.result.body.ok, true);
  });

  test('getAuthStatus rechaza solicitudes sin cookie', () => {
    const absent = response();
    getAuthStatus(request(), absent);

    assert.equal(absent.result.body.authenticated, false);
  });

  test('getAuthStatus acepta una sesión válida', () => {
    const loginResponse = response();
    login(request({ body: { password: 'secret' } }), loginResponse);

    const present = response();
    getAuthStatus(
      request({
        headers: {
          cookie: `${getSessionCookieName()}=${loginResponse.result.cookie.value}`,
        },
      }),
      present,
    );

    assert.equal(present.result.body.authenticated, true);
  });
});
