import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  getOutputStatus,
  startRecord,
  stopRecord,
} from '../../../server/controllers/obs-output.controller.js';
import { obsClient } from '../../../server/obs/client.js';
import { connectObsForTests, request, response } from '../../helpers.js';

describe('obs output controller', () => {
  test('getOutputStatus devuelve el estado', async () => {
    connectObsForTests();

    const original = obsClient.call;
    let active = false;
    obsClient.call = async (type) => {
      if (type === 'GetStreamStatus') return { outputActive: false };
      if (type === 'GetRecordStatus')
        return {
          outputActive: active,
          outputPaused: false,
          outputTimecode: '00',
          outputDuration: 1,
        };
      if (type === 'GetStats') return {};
      if (type === 'StartRecord') {
        active = true;
        return {};
      }
      if (type === 'StopRecord') {
        active = false;
        return { outputPath: 'file.mp4' };
      }
      return {};
    };
    try {
      const status = response();
      await getOutputStatus({}, status);

      assert.equal(status.result.body.ok, true);
    } finally {
      obsClient.call = original;
    }
  });

  test('startRecord y stopRecord ejecutan acciones', async () => {
    connectObsForTests();

    const original = obsClient.call;
    let active = false;
    obsClient.call = async (type) => {
      if (type === 'GetRecordStatus')
        return {
          outputActive: active,
          outputPaused: false,
          outputTimecode: '00',
          outputDuration: 1,
        };
      if (type === 'StartRecord') {
        active = true;
        return {};
      }
      if (type === 'StopRecord') {
        active = false;
        return { outputPath: 'file.mp4' };
      }
      return {};
    };

    try {
      const started = response();
      await startRecord(request(), started);

      assert.equal(started.result.body.ok, true);

      const stopped = response();
      await stopRecord(request(), stopped);

      assert.equal(stopped.result.body.outputPath, 'file.mp4');
    } finally {
      obsClient.call = original;
    }
  });

  test('salidas informa error OBS', async () => {
    connectObsForTests();

    const original = obsClient.call;
    obsClient.call = async () => {
      throw new Error('output error');
    };

    try {
      const res = response();
      await getOutputStatus({}, res);

      assert.equal(res.result.statusCode, 502);
    } finally {
      obsClient.call = original;
    }
  });
});
