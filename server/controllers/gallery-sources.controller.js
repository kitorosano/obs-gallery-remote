import {
  addGallerySource,
  listGallerySources,
  removeGallerySource,
  updateGallerySource,
} from '../services/gallery-sources.js';

export async function getGallerySources(_req, res) {
  const sources = await listGallerySources();

  res.json({
    count: sources.length,
    sources,
  });
}

export async function createGallerySource(req, res) {
  try {
    const source = await addGallerySource(req.body ?? {});

    res.status(201).json({ source });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
}

export async function patchGallerySource(req, res) {
  try {
    const source = await updateGallerySource(req.params.id, req.body ?? {});

    if (!source)
      return res.status(404).json({
        error: 'No se encontró esa fuente.',
      });

    res.json({ source });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
}

export async function deleteGallerySource(req, res) {
  const removed = await removeGallerySource(req.params.id);

  if (!removed)
    return res.status(404).json({
      error: 'No se encontró esa fuente.',
    });

  res.status(204).end();
}
