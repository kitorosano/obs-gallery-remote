import { Router } from 'express';
import {
  getAitumInfo,
  startAllAitumStreams,
  stopAllAitumStreams,
} from '../controllers/obs-aitum.controller.js';
import {
  getAudioInputs,
  setInputMute,
  setInputVolume,
} from '../controllers/obs-audio.controller.js';
import {
  connectToObs,
  disconnectFromObs,
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
  stopRecord,
} from '../controllers/obs-output.controller.js';
import { getProgramPreview } from '../controllers/obs-program.controller.js';
import {
  getScenes,
  setCurrentScene,
} from '../controllers/obs-scenes.controller.js';
import {
  getSources,
  setVisibility,
} from '../controllers/obs-sources.controller.js';

const router = Router();

router.get('/status', getObsStatus);
router.post('/connect', connectToObs);
router.post('/disconnect', disconnectFromObs);

router.get('/scenes', getScenes);
router.post('/scenes/current', setCurrentScene);

router.get('/program/screenshot', getProgramPreview);

router.post('/show', showImage);
router.get('/gallery-image', getCurrentGalleryImage);

router.get('/audio', getAudioInputs);
router.post('/audio/mute', setInputMute);
router.post('/audio/volume', setInputVolume);

router.get('/output/status', getOutputStatus);
router.get('/aitum', getAitumInfo);
router.post('/aitum/streams/start-all', startAllAitumStreams);
router.post('/aitum/streams/stop-all', stopAllAitumStreams);

router.post('/record/start', startRecord);
router.post('/record/stop', stopRecord);

router.get('/events', subscribeToObsEvents);

router.get('/sources', getSources);
router.post('/sources/visibility', setVisibility);

export default router;
