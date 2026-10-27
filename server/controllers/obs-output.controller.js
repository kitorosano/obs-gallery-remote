import {
  getOutputs,
  startRecording,
  stopRecording,
} from '../services/obs-output.js';
import {
  requireObs,
  respondWithObsAction,
  sendObsError,
} from '../utils/obs-controller.js';

export async function getOutputStatus(_req, res) {
  if (!requireObs(res)) return;

  try {
    return res.json({ ok: true, ...(await getOutputs()) });
  } catch (error) {
    return sendObsError(
      res,
      error,
      'No se pudo obtener el estado de emisión de OBS.',
    );
  }
}

export const startRecord = (_req, res) =>
  respondWithObsAction(
    res,
    startRecording,
    'No se pudo iniciar la grabación.',
  );
export const stopRecord = (_req, res) =>
  respondWithObsAction(
    res,
    stopRecording,
    'No se pudo detener la grabación.',
  );
