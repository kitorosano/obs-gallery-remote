import fs from 'node:fs/promises';
import path from 'node:path';

import { ALLOWED_IMAGE_EXTENSIONS } from '../constants/gallery.js';

export function isInsideGallery(galleryRoot, candidate) {
  const relative = path.relative(galleryRoot, candidate);

  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

export function encodeId(sourceId, relativePath) {
  const payload = JSON.stringify({
    sourceId,
    relativePath: relativePath.split(path.sep).join('/'),
  });

  return Buffer.from(payload, 'utf8').toString('base64url');
}

function decodeId(id) {
  try {
    const payload = JSON.parse(Buffer.from(id, 'base64url').toString('utf8'));

    if (
      !payload ||
      typeof payload.sourceId !== 'string' ||
      typeof payload.relativePath !== 'string'
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function listImages(sources) {
  const enabledSources = sources.filter((source) => source.enabled);

  const imageGroups = await Promise.all(
    enabledSources.map((source) => listImagesFromSource(source)),
  );

  return imageGroups.flat();
}

async function listImagesFromSource(source) {
  const galleryRoot = path.resolve(source.path);

  return listImagesFromDirectory(source, galleryRoot, galleryRoot, true);
}

async function listImagesFromDirectory(
  source,
  galleryRoot,
  directory,
  allowMissing = false,
) {
  const results = [];
  let entries;

  try {
    entries = await fs.readdir(directory, {
      withFileTypes: true,
    });
  } catch (error) {
    if (allowMissing && error.code === 'ENOENT') {
      return results;
    }

    throw error;
  }

  entries.sort((a, b) =>
    a.name.localeCompare(b.name, 'es', {
      sensitivity: 'base',
    }),
  );

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const absolutePath = path.resolve(directory, entry.name);

    if (!isInsideGallery(galleryRoot, absolutePath)) continue;

    if (entry.isDirectory()) {
      results.push(
        ...(await listImagesFromDirectory(source, galleryRoot, absolutePath)),
      );

      continue;
    }

    if (
      entry.isFile() &&
      ALLOWED_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ) {
      results.push(
        await createImageMetadata(source, galleryRoot, absolutePath),
      );
    }
  }

  return results;
}

async function createImageMetadata(source, galleryRoot, absolutePath) {
  const relativePath = path.relative(galleryRoot, absolutePath);
  const stat = await fs.stat(absolutePath);
  const directory = path.dirname(relativePath);
  const category =
    directory === '.' ? 'Sin categoría' : directory.split(path.sep).join(' / ');
  const id = encodeId(source.id, relativePath);

  return {
    id,
    sourceId: source.id,
    sourceName: source.name,
    name: path.basename(absolutePath, path.extname(absolutePath)),
    filename: path.basename(absolutePath),
    category,
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    previewUrl: `/api/gallery/${id}/file`,
  };
}

export async function resolveImageId(sources, id) {
  const decoded = decodeId(id);
  if (!decoded) return null;

  const source = sources.find(
    (item) => item.id === decoded.sourceId && item.enabled,
  );
  if (!source) return null;

  const galleryRoot = path.resolve(source.path);
  const relative = decoded.relativePath;
  if (!relative || path.isAbsolute(relative)) return null;

  const absolutePath = path.resolve(galleryRoot, relative);
  if (!isInsideGallery(galleryRoot, absolutePath)) return null;
  if (!ALLOWED_IMAGE_EXTENSIONS.has(path.extname(absolutePath).toLowerCase())) return null;

  try {
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) return null;
    return absolutePath;
  } catch {
    return null;
  }
}
