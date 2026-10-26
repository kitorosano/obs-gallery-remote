import { config } from '../config/config.js';
import { obsClient } from '../obs/client.js';

function mapObsStats(stats) {
  return {
    cpuUsage: Number(stats.cpuUsage) || 0,
    memoryUsage: Number(stats.memoryUsage) || 0,
    availableDiskSpace: Number(stats.availableDiskSpace) || 0,
    activeFps: Number(stats.activeFps) || 0,
    averageFrameRenderTime: Number(stats.averageFrameRenderTime) || 0,
    renderSkippedFrames: Number(stats.renderSkippedFrames) || 0,
    renderTotalFrames: Number(stats.renderTotalFrames) || 0,
    outputSkippedFrames: Number(stats.outputSkippedFrames) || 0,
    outputTotalFrames: Number(stats.outputTotalFrames) || 0,
  };
}

function mapStreamStatus(status) {
  const totalFrames = Number(status.outputTotalFrames) || 0;
  const skippedFrames = Number(status.outputSkippedFrames) || 0;

  return {
    active: status.outputActive,
    reconnecting: status.outputReconnecting,
    timecode: status.outputTimecode,
    durationMs: status.outputDuration,
    congestion: status.outputCongestion,
    bytes: Number(status.outputBytes) || 0,
    skippedFrames,
    totalFrames,
    skippedFramesPercent:
      totalFrames > 0 ? (skippedFrames / totalFrames) * 100 : 0,
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
  const [stream, record, stats] = await Promise.all([
    obsClient.call('GetStreamStatus'),
    obsClient.call('GetRecordStatus'),
    obsClient.call('GetStats'),
  ]);

  return {
    stream: {
      ...mapStreamStatus(stream),
      delaySeconds: config.obsStreamDelaySeconds,
    },
    record: mapRecordStatus(record),
    stats: mapObsStats(stats),
  };
}

async function changeOutput({ kind, start }) {
  const isStream = kind === 'stream';
  const statusRequest = isStream ? 'GetStreamStatus' : 'GetRecordStatus';
  const actionRequest = start
    ? isStream
      ? 'StartStream'
      : 'StartRecord'
    : isStream
      ? 'StopStream'
      : 'StopRecord';
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

export const startStreaming = () =>
  changeOutput({ kind: 'stream', start: true });
export const stopStreaming = () =>
  changeOutput({ kind: 'stream', start: false });
export const startRecording = () =>
  changeOutput({ kind: 'record', start: true });
export const stopRecording = () =>
  changeOutput({ kind: 'record', start: false });
