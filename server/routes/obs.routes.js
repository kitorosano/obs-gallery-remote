import { Router } from 'express';
import { connectToObs, getObsStatus, showImage } from '../controllers/obs.controller.js';

const router = Router();

router.get('/status', getObsStatus);
router.post('/connect', connectToObs);
router.post('/show', showImage);

export default router;
