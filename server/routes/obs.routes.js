import { Router } from 'express';
import {
  getAudioInputs,
  setInputMute,
  setInputVolume,
} from '../controllers/obs-audio.controller.js';
import {
  connectToObs,
  getObsStatus,
} from '../controllers/obs-connection.controller.js';
import { subscribeToObsEvents } from '../controllers/obs-events.controller.js';
import {
  getCurrentGalleryImage,
  showImage,
} from '../controllers/obs-gallery.controller.js';
import {
  getOutputStatus,
  startRecord,
  startStream,
  stopRecord,
  stopStream,
} from '../controllers/obs-output.controller.js';
import { getProgramPreview } from '../controllers/obs-program.controller.js';
import {
  getScenes,
  setCurrentScene,
} from '../controllers/obs-scenes.controller.js';

const router = Router();

router.get('/status', getObsStatus);
router.post('/connect', connectToObs);

router.get('/scenes', getScenes);
router.post('/scenes/current', setCurrentScene);

router.get('/program/screenshot', getProgramPreview);

router.post('/show', showImage);
router.get('/gallery-image', getCurrentGalleryImage);

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
