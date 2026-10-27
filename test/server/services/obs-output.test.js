import assert from 'node:assert/strict';
import { after, afterEach, before, describe, test } from 'node:test';

import { config } from '../../../server/config/config.js';
import { obsClient } from '../../../server/obs/client.js';
import {
  getOutputs,
  startRecording,
  startStreaming,
  stopRecording,
  stopStreaming,
} from '../../../server/services/obs-output.js';

const originalCall = obsClient.call;
const originalDelay = config.obsStreamDelaySeconds;

afterEach(() => {
  obsClient.call = originalCall;
});
after(() => {
  config.obsStreamDelaySeconds = originalDelay;
});

describe('obs output service', () => {
  test('mapea estados de streaming, grabación y estadísticas', async () => {
    config.obsStreamDelaySeconds = 7;
    obsClient.call = async (type) => ({
      GetStreamStatus: {
        outputActive: true, outputReconnecting: false, outputTimecode: '00:01',
        outputDuration: 100, outputCongestion: 2, outputBytes: '10',
        outputSkippedFrames: '2', outputTotalFrames: '4',
      },
      GetRecordStatus: { outputActive: false, outputPaused: true, outputTimecode: '00:02', outputDuration: 200 },
      GetStats: {
        cpuUsage: '1', memoryUsage: '2', availableDiskSpace: '3', activeFps: '4',
        averageFrameRenderTime: '5', renderSkippedFrames: '6', renderTotalFrames: '7',
        outputSkippedFrames: '8', outputTotalFrames: '9',
      },
    }[type]);

    assert.deepEqual(await getOutputs(), {
      stream: {
        active: true, reconnecting: false, timecode: '00:01', durationMs: 100,
        congestion: 2, bytes: 10, skippedFrames: 2, totalFrames: 4,
        skippedFramesPercent: 50, delaySeconds: 7,
      },
      record: { active: false, paused: true, timecode: '00:02', durationMs: 200 },
      stats: {
        cpuUsage: 1, memoryUsage: 2, availableDiskSpace: 3, activeFps: 4,
        averageFrameRenderTime: 5, renderSkippedFrames: 6, renderTotalFrames: 7,
        outputSkippedFrames: 8, outputTotalFrames: 9,
      },
    });
  });

  test('usa cero para números inválidos y evita división por cero', async () => {
    obsClient.call = async (type) => type === 'GetStreamStatus'
      ? { outputTotalFrames: 0, outputSkippedFrames: 'bad', outputBytes: null }
      : type === 'GetRecordStatus' ? {} : {};
    assert.equal((await getOutputs()).stream.skippedFramesPercent, 0);
    assert.equal((await getOutputs()).stats.cpuUsage, 0);
  });

  for (const [name, fn, statusType, actionType, active, start] of [
    ['start streaming', startStreaming, 'GetStreamStatus', 'StartStream', false, true],
    ['stop streaming', stopStreaming, 'GetStreamStatus', 'StopStream', true, false],
    ['start recording', startRecording, 'GetRecordStatus', 'StartRecord', false, true],
    ['stop recording', stopRecording, 'GetRecordStatus', 'StopRecord', true, false],
  ]) {
    test(`${name} cambia el estado y devuelve el estado mapeado`, async () => {
      const calls = [];
      obsClient.call = async (type) => {
        calls.push(type);
        if (calls.length === 1) return { outputActive: active, outputTimecode: '00:00', outputDuration: 1, outputPaused: false };
        if (type === actionType) return { outputPath: actionType === 'StopRecord' ? 'record.mp4' : undefined };
        return { outputActive: !active, outputTimecode: '00:01', outputDuration: 2, outputPaused: true, outputTotalFrames: 2, outputSkippedFrames: 1 };
      };
      const result = await fn();
      assert.equal(calls[0], statusType);
      assert.equal(calls[1], actionType);
      assert.equal(result.active, !active);
      if (actionType === 'StopRecord') assert.equal(result.outputPath, 'record.mp4');
    });
  }

  test('rechaza iniciar o detener una salida en el estado solicitado', async () => {
    for (const [fn, type, active] of [
      [startStreaming, 'GetStreamStatus', true],
      [stopStreaming, 'GetStreamStatus', false],
      [startRecording, 'GetRecordStatus', true],
      [stopRecording, 'GetRecordStatus', false],
    ]) {
      obsClient.call = async () => ({ outputActive: active });
      await assert.rejects(fn(), (error) => error.status === 409);
    }
  });

  test('devuelve outputPath nulo cuando OBS no lo informa al detener', async () => {
    let calls = 0;
    obsClient.call = async (type) => {
      calls += 1;
      if (type === 'GetRecordStatus' && calls === 1) return { outputActive: true };
      if (type === 'StopRecord') return {};
      return { outputActive: false, outputPaused: false, outputTimecode: '', outputDuration: 0 };
    };
    assert.equal((await stopRecording()).outputPath, null);
  });
});