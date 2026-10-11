import { config } from '../config/config.js';
import { obsClient } from '../obs/client.js';

function mapStreamStatus(status) {
  return {
    active: status.outputActive,
    reconnecting: status.outputReconnecting,
    timecode: status.outputTimecode,
    durationMs: status.outputDuration,
    congestion: status.outputCongestion,
  };
}

function mapRecordStatus(status) {
  return {
    active: status.outputActive,
    paused: status.outputPaused,
    timecode: status.outputTimecode,
    durationMs: status.outputDuration,
  };
}

export async function getOutputs() {
  const [stream, record] = await Promise.all([
    obsClient.call('GetStreamStatus'),
    obsClient.call('GetRecordStatus'),
  ]);
  return {
    stream: { ...mapStreamStatus(stream), delaySeconds: config.obsStreamDelaySeconds },
    record: mapRecordStatus(record),
  };
}

async function changeOutput({ kind, start }) {
  const isStream = kind === 'stream';
  const statusRequest = isStream ? 'GetStreamStatus' : 'GetRecordStatus';
  const actionRequest = start
    ? isStream ? 'StartStream' : 'StartRecord'
    : isStream ? 'StopStream' : 'StopRecord';
  const current = await obsClient.call(statusRequest);

  if (Boolean(current.outputActive) === start) {
    const label = isStream ? 'transmisión' : 'grabación';
    const state = start ? 'ya está activa' : 'no está activa';
    const error = new Error(`La ${label} ${state}.`);
    error.status = 409;
    throw error;
  }

  const actionResult = await obsClient.call(actionRequest);
  const result = await obsClient.call(statusRequest);
  const mapped = isStream ? mapStreamStatus(result) : mapRecordStatus(result);

  if (!start && !isStream) mapped.outputPath = actionResult.outputPath || null;
  return mapped;
}

export const startStreaming = () => changeOutput({ kind: 'stream', start: true });
export const stopStreaming = () => changeOutput({ kind: 'stream', start: false });
export const startRecording = () => changeOutput({ kind: 'record', start: true });
export const stopRecording = () => changeOutput({ kind: 'record', start: false });
