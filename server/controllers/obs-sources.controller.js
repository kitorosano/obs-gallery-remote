import {
  listAllSources,
  setSourceVisibility,
} from '../services/obs-sources.js';

import { requireObs, sendObsError } from './obs.controller-utils.js';

export async function getSources(_req, res) {
  if (!requireObs(res)) return;

  try {
    return res.json({
      ok: true,
      ...(await listAllSources()),
    });
  } catch (error) {
    return sendObsError(
      res,
      error,
      'No se pudieron obtener las fuentes de la escena actual.',
    );
  }
}

export async function setVisibility(req, res) {
  const sceneName = req.body?.sceneName;
  const sceneItemId = req.body?.sceneItemId;
  const enabled = req.body?.enabled;

  if (typeof sceneName !== 'string' || !sceneName.trim()) {
    return res.status(400).json({
      error: 'Debes enviar sceneName.',
    });
  }

  if (!Number.isInteger(sceneItemId)) {
    return res.status(400).json({
      error: 'Debes enviar sceneItemId.',
    });
  }

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({
      error: 'Debes enviar enabled.',
    });
  }

  if (!requireObs(res)) return;

  try {
    const result = await setSourceVisibility({
      sceneName: sceneName.trim(),
      sceneItemId,
      enabled,
    });

    return res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return sendObsError(
      res,
      error,
      'No se pudo cambiar la visibilidad de la fuente.',
    );
  }
}
