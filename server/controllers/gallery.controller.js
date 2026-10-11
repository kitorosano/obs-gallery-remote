import { listGallerySources } from '../services/gallery-sources.js';
import { listImages, resolveImageId } from '../services/gallery.js';

export async function getGallery(_req, res) {
  const sources = await listGallerySources();
  const images = await listImages(sources);

  res.json({
    count: images.length,
    images,
  });
}

export async function getGalleryImage(req, res) {
  const sources = await listGallerySources();
  const imagePath = await resolveImageId(sources, req.params.id);

  if (!imagePath) {
    return res.status(404).json({
      error: 'No se encontró esa imagen en las galerías autorizadas.',
    });
  }

  res.sendFile(imagePath, {
    dotfiles: 'deny',
  });
}
