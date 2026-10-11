import { Router } from 'express';

import {
  getAuthStatus,
  login,
  logout,
} from '../controllers/auth.controller.js';
import { loginRateLimit } from '../middleware/login-rate-limit.middleware.js';

const router = Router();

router.get('/status', getAuthStatus);
router.post('/login', loginRateLimit, login);
router.post('/logout', logout);

export default router;
