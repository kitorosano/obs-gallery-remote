import {
  changeInputMute,
  changeInputVolume,
  listAudioInputs,
} from '../services/obs-audio.js';
import { requireObs, sendObsError } from './obs.controller-utils.js';

function cleanInputName(inputName, res) {
  if (typeof inputName !== 'string' || !inputName.trim()) {
    res.status(400).json({ error: 'Debes enviar inputName.' });
    return null;
  }
  return inputName.trim();
}

export async function getAudioInputs(_req, res) {
  if (!requireObs(res)) return;

  try {
    return res.json({ ok: true, inputs: await listAudioInputs() });
  } catch (error) {
    return sendObsError(res, error, 'No se pudieron obtener las fuentes de audio de OBS.');
  }
}

export async function setInputMute(req, res) {
  const inputName = cleanInputName(req.body?.inputName, res);
  if (!inputName) return;

  if (typeof req.body?.muted !== 'boolean') {
    return res.status(400).json({ error: 'Debes enviar muted como true o false.' });
  }

  if (!requireObs(res)) return;

  try {
    return res.json({ ok: true, ...(await changeInputMute(inputName, req.body.muted)) });
  } catch (error) {
    return sendObsError(res, error, 'No se pudo cambiar el estado de audio en OBS.');
  }
}

export async function setInputVolume(req, res) {
  const inputName = cleanInputName(req.body?.inputName, res);
  if (!inputName) return;

  const volumeDb = req.body?.volumeDb;
  if (typeof volumeDb !== 'number' || !Number.isFinite(volumeDb)) {
    return res.status(400).json({ error: 'Debes enviar volumeDb como número.' });
  }
  if (volumeDb < -60 || volumeDb > 0) {
    return res.status(400).json({ error: 'volumeDb debe estar entre -60 y 0 dB.' });
  }
  if (!requireObs(res)) return;

  try {
    return res.json({ ok: true, ...(await changeInputVolume(inputName, volumeDb)) });
  } catch (error) {
    return sendObsError(res, error, 'No se pudo cambiar el volumen de la fuente en OBS.');
  }
}
