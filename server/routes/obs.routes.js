import { Router } from 'express';
import {
  connectToObs,
  getAudioInputs,
  getObsStatus,
  getScenes,
  setCurrentScene,
  setInputMute,
  showImage,
} from '../controllers/obs.controller.js';

const router = Router();

router.get('/status', getObsStatus);
router.post('/connect', connectToObs);

router.get('/scenes', getScenes);
router.post('/scenes/current', setCurrentScene);

router.post('/show', showImage);

router.get('/audio', getAudioInputs);
router.post('/audio/mute', setInputMute);

export default router;
