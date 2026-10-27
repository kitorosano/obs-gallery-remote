import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  getAitumInfo,
  startAllAitumStreams,
  stopAllAitumStreams,
} from '../../../server/controllers/obs-aitum.controller.js';
import { obsClient } from '../../../server/obs/client.js';
import { request, response } from '../../helpers.js';

describe('obs aitum controller', () => {
  test('getAitumInfo devuelve versión y salidas', async () => {
    const original = obsClient.call;
    obsClient.call = async (type, data) => {
      if (data.requestType === 'version')
        return { responseData: { version: '1' } };
      if (data.requestType === 'get_outputs')
        return { responseData: { outputs: [] } };
      if (data.requestType === 'start_all_streams')
        return { responseData: { success: true } };
      if (data.requestType === 'stop_all_streams')
        return { responseData: { success: false, error: 'no' } };
      throw new Error('unexpected');
    };
    try {
      const info = response();
      await getAitumInfo(request(), info);
      assert.deepEqual(info.result.body, {
        available: true,
        version: { version: '1' },
        outputs: { outputs: [] },
      });
    } finally {
      obsClient.call = original;
    }
  });

  test('inicia transmisiones Aitum', async () => {
    const original = obsClient.call;
    obsClient.call = async () => ({ responseData: { success: true } });

    try {
      const started = response();
      await startAllAitumStreams(request(), started, () => {});

      assert.equal(started.result.body.success, true);
    } finally {
      obsClient.call = original;
    }
  });

  test('detiene transmisiones Aitum y propaga resultados fallidos', async () => {
    const original = obsClient.call;
    obsClient.call = async () => ({
      responseData: { success: false, error: 'no' },
    });

    try {
      const started = response();
      await startAllAitumStreams(request(), started, (e) => {
        started.result.error = e;
      });

      const stopped = response();
      await stopAllAitumStreams(request(), stopped, (e) => {
        stopped.result.error = e;
      });

      assert.equal(stopped.result.error.status, 502);
    } finally {
      obsClient.call = original;
    }
  });

  test('detiene transmisiones Aitum exitosamente', async () => {
    const original = obsClient.call;
    obsClient.call = async () => ({ responseData: { success: true } });

    try {
      const res = response();
      await stopAllAitumStreams(request(), res, () => {});

      assert.equal(res.result.body.success, true);
    } finally {
      obsClient.call = original;
    }
  });

  test('getAitumInfo informa errores del plugin', async () => {
    const original = obsClient.call;
    obsClient.call = async () => {
      throw new Error('offline');
    };

    try {
      const res = response();
      await getAitumInfo(request(), res);

      assert.equal(res.result.statusCode, 502);
    } finally {
      obsClient.call = original;
    }
  });

  test('stopAllAitumStreams propaga errores inesperados al middleware', async () => {
    const original = obsClient.call;
    obsClient.call = async () => {
      throw new Error('plugin offline');
    };

    try {
      const res = response();
      await stopAllAitumStreams(request(), res, (error) => {
        res.result.error = error;
      });

      assert.equal(res.result.error.message, 'plugin offline');
    } finally {
      obsClient.call = original;
    }
  });
});
