import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { subscribeToObsEvents } from '../../../server/controllers/obs-events.controller.js';
import { getObsEventClientCount } from '../../../server/services/obs-events.js';
import { request, response } from '../../helpers.js';

describe('obs events controller', () => {
  test('suscribe clientes SSE con cabeceras y mensaje inicial', () => {
    const originalInterval = globalThis.setInterval;
    const originalClear = globalThis.clearInterval;

    globalThis.setInterval = (callback) => {
      callback();
      return 1;
    };
    globalThis.clearInterval = () => {};

    const res = response();
    const req = request();
    subscribeToObsEvents(req, res);

    assert.equal(res.result.headers['Content-Type'], 'text/event-stream');
    assert.equal(res.result.flushed, true);
    assert.match(res.result.writes[0], /event: connected/);
    assert.equal(res.result.headers.Connection, 'keep-alive');
    assert.equal(getObsEventClientCount(), 1);

    req.close();

    assert.equal(getObsEventClientCount(), 0);
    globalThis.setInterval = originalInterval;
    globalThis.clearInterval = originalClear;
  });

  test('limpia clientes SSE al cerrar la petición', () => {
    const res = response();
    const req = request();

    subscribeToObsEvents(req, res);
    req.close();

    assert.equal(getObsEventClientCount(), 0);
  });
});
