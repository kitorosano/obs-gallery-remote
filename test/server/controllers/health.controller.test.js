import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getHealth } from '../../../server/controllers/health.controller.js';
import { response } from '../../helpers.js';

describe('Health Controller', () => {
  test('getHealth responde información del servicio', () => {
    const res = response();
    getHealth({}, res);

    assert.equal(res.result.statusCode, 200);
    assert.equal(res.result.body.ok, true);
    assert.equal(typeof res.result.body.service, 'string');
    assert.equal(typeof res.result.body.version, 'string');
  });
});
