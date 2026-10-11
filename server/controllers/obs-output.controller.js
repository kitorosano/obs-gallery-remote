import {
  getOutputs,
  startRecording,
  startStreaming,
  stopRecording,
  stopStreaming,
} from '../services/obs-output.js';
import { requireObs, sendObsError } from './obs.controller-utils.js';

async function respondWithOutputAction(res, action, fallback) {
  if (!requireObs(res)) return;

  try {
    return res.json({ ok: true, ...(await action()) });
  } catch (error) {
    return sendObsError(res, error, fallback);
  }
}

export async function getOutputStatus(_req, res) {
  if (!requireObs(res)) return;

  try {
    return res.json({ ok: true, ...(await getOutputs()) });
  } catch (error) {
    return sendObsError(res, error, 'No se pudo obtener el estado de emisión de OBS.');
  }
}

export const startStream = (_req, res) =>
  respondWithOutputAction(res, startStreaming, 'No se pudo iniciar la transmisión.');
export const stopStream = (_req, res) =>
  respondWithOutputAction(res, stopStreaming, 'No se pudo detener la transmisión.');
export const startRecord = (_req, res) =>
  respondWithOutputAction(res, startRecording, 'No se pudo iniciar la grabación.');
export const stopRecord = (_req, res) =>
  respondWithOutputAction(res, stopRecording, 'No se pudo detener la grabación.');
