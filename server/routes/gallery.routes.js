import { Router } from 'express';
import { getGallery, getGalleryImage } from '../controllers/gallery.controller.js';

const router = Router();

router.get('/', getGallery);
router.get('/:id/file', getGalleryImage);

export default router;
