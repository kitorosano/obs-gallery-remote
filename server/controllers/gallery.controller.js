import { config } from '../constants/config.js';
import { listImages, resolveImageId } from '../utils/gallery.js';

export async function getGallery(_req, res) {
  const images = await listImages(config.galleryRoot);
  res.json({ count: images.length, images });
}

export async function getGalleryImage(req, res) {
  const imagePath = await resolveImageId(config.galleryRoot, req.params.id);
  if (!imagePath) {
    return res.status(404).json({ error: 'No se encontró esa imagen en la galería autorizada.' });
  }

  res.sendFile(imagePath, { dotfiles: 'deny' });
}
