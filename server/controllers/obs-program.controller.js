import { getProgramScreenshot } from '../services/obs-program.js';

import { requireObs, sendObsError } from './obs.controller-utils.js';

export async function getProgramPreview(_req, res) {
  if (!requireObs(res)) return;

  try {
    const result = await getProgramScreenshot();

    return res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return sendObsError(
      res,
      error,
      'No se pudo obtener la vista de Program de OBS.',
    );
  }
}
