import { changeScene, listScenes } from '../services/obs-scenes.js';
import { requireObs, sendObsError } from '../utils/obs-controller.js';

export async function getScenes(_req, res) {
  if (!requireObs(res)) return;

  try {
    return res.json({ ok: true, ...(await listScenes()) });
  } catch (error) {
    return sendObsError(res, error, 'No se pudo obtener la lista de escenas de OBS.');
  }
}

export async function setCurrentScene(req, res) {
  const sceneName = req.body?.sceneName;
  if (typeof sceneName !== 'string' || !sceneName.trim()) {
    return res.status(400).json({ error: 'Debes enviar sceneName.' });
  }

  if (!requireObs(res)) return;

  try {
    const currentScene = await changeScene(sceneName.trim());
    return res.json({ ok: true, currentScene });
  } catch (error) {
    return sendObsError(res, error, 'No se pudo cambiar la escena de OBS.');
  }
}
