import path from 'node:path';
import fs from 'node:fs/promises';
import { ALLOWED_IMAGE_EXTENSIONS } from '../constants/gallery.js';

export function isInsideGallery(galleryRoot, candidate) {
  const relative = path.relative(galleryRoot, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function encodeId(relativePath) {
  return Buffer.from(relativePath.split(path.sep).join('/'), 'utf8').toString('base64url');
}

function decodeId(id) {
  try {
    return Buffer.from(id, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

export async function listImages(galleryRoot) {
  const results = [];
  let entries;

  try {
    entries = await fs.readdir(galleryRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return results;
    throw error;
  }

  entries.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const absolutePath = path.resolve(galleryRoot, entry.name);
    if (!isInsideGallery(galleryRoot, absolutePath)) continue;

    if (entry.isDirectory()) {
      results.push(...await listImagesFromDirectory(galleryRoot, absolutePath));
    } else if (entry.isFile() && ALLOWED_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(await createImageMetadata(galleryRoot, absolutePath));
    }
  }

  return results;
}

async function listImagesFromDirectory(galleryRoot, directory) {
  const results = [];
  let entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const absolutePath = path.resolve(directory, entry.name);
    if (!isInsideGallery(galleryRoot, absolutePath)) continue;

    if (entry.isDirectory()) {
      results.push(...await listImagesFromDirectory(galleryRoot, absolutePath));
    } else if (entry.isFile() && ALLOWED_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(await createImageMetadata(galleryRoot, absolutePath));
    }
  }

  return results;
}

async function createImageMetadata(galleryRoot, absolutePath) {
  const relativePath = path.relative(galleryRoot, absolutePath);
  const stat = await fs.stat(absolutePath);
  const category = path.dirname(relativePath) === '.'
    ? 'Sin categoría'
    : path.dirname(relativePath).split(path.sep).join(' / ');
  const id = encodeId(relativePath);

  return {
    id,
    name: path.basename(absolutePath, path.extname(absolutePath)),
    filename: path.basename(absolutePath),
    category,
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    previewUrl: `/api/gallery/${id}/file`
  };
}

export async function resolveImageId(galleryRoot, id) {
  const relative = decodeId(id);
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
