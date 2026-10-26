import {
  DEFAULT_SCREENSHOT_PROFILE,
  SCREENSHOT_PROFILES,
} from '../constants/obs.js';
import { getProgramScreenshot } from '../services/obs-program.js';

import { requireObs, sendObsError } from './obs.controller-utils.js';

export async function getProgramPreview(req, res) {
  if (!requireObs(res)) return;

  const requestedProfile = req.query.profile;

  const profile =
    typeof requestedProfile === 'string' &&
    SCREENSHOT_PROFILES[requestedProfile]
      ? requestedProfile
      : DEFAULT_SCREENSHOT_PROFILE;

  try {
    const result = await getProgramScreenshot(profile);

    return res.json({
      ok: true,
      profile,
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
