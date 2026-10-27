import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { config } from '../../../server/config/config.js';
import {
  connectToObs,
  getObsStatus,
} from '../../../server/controllers/obs-connection.controller.js';
import { obsClient } from '../../../server/obs/client.js';
import { connectObsForTests, request, response } from '../../helpers.js';

describe('obs connection controller', () => {
  test('getObsStatus expone el estado de conexión', () => {
    const status = response();
    getObsStatus({}, status);

    assert.equal(status.result.body.host, config.obsHost);
  });

  test('connectToObs reutiliza una conexión existente', async () => {
    connectObsForTests();

    const already = response();
    await connectToObs(request(), already);

    assert.equal(already.result.body.connected, true);
  });

  test('connectToObs conecta exitosamente', async () => {
    obsClient.emit('ConnectionClosed');

    const original = obsClient.connect;
    obsClient.connect = async () => ({
      obsVersion: '30',
      obsWebSocketVersion: '5',
    });

    try {
      const res = response();
      await connectToObs(request(), res);

      assert.equal(res.result.body.ok, true);
    } finally {
      obsClient.connect = original;
      obsClient.emit('ConnectionOpened');
    }
  });

  test('connectToObs informa errores de conexión', async () => {
    obsClient.emit('ConnectionClosed');

    const original = obsClient.connect;
    obsClient.connect = async () => {
      throw new Error('offline');
    };

    try {
      const res = response();
      await connectToObs(request(), res);

      assert.equal(res.result.statusCode, 502);
    } finally {
      obsClient.connect = original;
      obsClient.emit('ConnectionOpened');
    }
  });
});
