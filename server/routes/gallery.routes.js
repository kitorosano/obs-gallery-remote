import { Router } from 'express';
import {
  createGallerySource,
  deleteGallerySource,
  getGallerySources,
  patchGallerySource,
} from '../controllers/gallery-sources.controller.js';
import {
  getGallery,
  getGalleryImage,
} from '../controllers/gallery.controller.js';

const router = Router();

router.get('/sources', getGallerySources);
router.post('/sources', createGallerySource);
router.patch('/sources/:id', patchGallerySource);
router.delete('/sources/:id', deleteGallerySource);

router.get('/', getGallery);
router.get('/:id/file', getGalleryImage);

export default router;
