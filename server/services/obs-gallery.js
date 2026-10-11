import path from 'node:path';

import { config } from '../config/config.js';
import { obsClient } from '../obs/client.js';

import { listImages, resolveImageId } from './gallery.js';

import { listGallerySources } from './gallery-sources.js';

export async function displayGalleryImage(imageId) {
  const sources = await listGallerySources();
  const imagePath = await resolveImageId(sources, imageId);

  if (!imagePath) return null;

  await obsClient.call('SetInputSettings', {
    inputName: config.obsImageInput,
    inputSettings: {
      file: imagePath,
    },
    overlay: false,
  });

  return config.obsImageInput;
}

export async function findCurrentGalleryImage() {
  const result = await obsClient.call('GetInputSettings', {
    inputName: config.obsImageInput,
  });

  const file = result.inputSettings?.file;

  if (typeof file !== 'string' || !file) {
    return {
      matched: false,
      imageId: null,
      file: null,
    };
  }

  const normalizedFile = normalizePath(file);
  const sources = await listGallerySources();
  const images = await listImages(sources);

  for (const image of images) {
    const imagePath = await resolveImageId(sources, image.id);

    if (imagePath && normalizePath(imagePath) === normalizedFile) {
      return {
        matched: true,
        imageId: image.id,
        file,
      };
    }
  }

  return {
    matched: false,
    imageId: null,
    file,
  };
}

function normalizePath(filePath) {
  const resolved = path.resolve(filePath);

  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}
