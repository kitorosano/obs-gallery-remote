import path from 'node:path';
import { config } from '../config/config.js';
import { obsClient } from '../obs/client.js';
import { listImages, resolveImageId } from './gallery.js';

export async function displayGalleryImage(imageId) {
  const imagePath = await resolveImageId(config.galleryRoot, imageId);
  if (!imagePath) return null;

  await obsClient.call('SetInputSettings', {
    inputName: config.obsImageInput,
    inputSettings: { file: imagePath },
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
    return { matched: false, imageId: null, file: null };
  }

  const normalizedFile = path.resolve(file);
  const images = await listImages(config.galleryRoot);

  for (const image of images) {
    const imagePath = await resolveImageId(config.galleryRoot, image.id);
    if (imagePath && path.resolve(imagePath) === normalizedFile) {
      return { matched: true, imageId: image.id, file };
    }
  }

  return { matched: false, imageId: null, file };
}
