import { Router } from 'express';
import { subscribeToObsEvents } from '../controllers/obs-events.controller.js';
import {
  connectToObs,
  getAudioInputs,
  getObsStatus,
  getOutputStatus,
  getScenes,
  setCurrentScene,
  setInputMute,
  setInputVolume,
  showImage,
  startRecord,
  startStream,
  stopRecord,
  stopStream,
} from '../controllers/obs.controller.js';

const router = Router();

router.get('/status', getObsStatus);
router.post('/connect', connectToObs);

router.get('/scenes', getScenes);
router.post('/scenes/current', setCurrentScene);

router.post('/show', showImage);

router.get('/audio', getAudioInputs);
router.post('/audio/mute', setInputMute);
router.post('/audio/volume', setInputVolume);

router.get('/output/status', getOutputStatus);

router.post('/stream/start', startStream);
router.post('/stream/stop', stopStream);

router.post('/record/start', startRecord);
router.post('/record/stop', stopRecord);

router.get('/events', subscribeToObsEvents);

export default router;
