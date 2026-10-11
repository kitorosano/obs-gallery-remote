import { Router } from 'express';

import {
  getAuthStatus,
  login,
  logout,
} from '../controllers/auth.controller.js';

const router = Router();

router.get('/status', getAuthStatus);
router.post('/login', login);
router.post('/logout', logout);

export default router;
