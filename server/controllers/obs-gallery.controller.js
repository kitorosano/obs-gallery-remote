import { config } from '../config/config.js';
import {
  displayGalleryImage,
  findCurrentGalleryImage,
} from '../services/obs-gallery.js';
import { requireObs, sendObsError } from '../utils/obs-controller.js';

export async function showImage(req, res) {
  const { imageId } = req.body || {};
  if (typeof imageId !== 'string' || !imageId) {
    return res.status(400).json({ error: 'Debes enviar imageId.' });
  }

  if (!requireObs(res)) return;

  try {
    const inputName = await displayGalleryImage(imageId);
    if (!inputName) {
      return res.status(404).json({
        error: 'La imagen seleccionada no existe en la galería autorizada.',
      });
    }
  
    return res.json({ ok: true, message: 'Se envió la imagen a OBS.', inputName });
  } catch (error) {
    return res.status(502).json({
      error: error?.message || 'No se pudo cambiar la imagen en OBS.',
      hint: `Verifica que exista una fuente de tipo Image llamada "${config.obsImageInput}" en OBS.`,
    });
  }
}

export async function getCurrentGalleryImage(_req, res) {
  if (!requireObs(res)) return;

  try {
    return res.json({ ok: true, ...(await findCurrentGalleryImage()) });
  } catch (error) {
    return sendObsError(res, error, 'No se pudo obtener la imagen actual de OBS.');
  }
}
