import { Router } from 'express';
import {
  connectToObs,
  getObsStatus,
  getScenes,
  setCurrentScene,
  showImage,
} from '../controllers/obs.controller.js';

const router = Router();

router.get('/status', getObsStatus);
router.post('/connect', connectToObs);

router.get('/scenes', getScenes);
router.post('/scenes/current', setCurrentScene);

router.post('/show', showImage);

export default router;
