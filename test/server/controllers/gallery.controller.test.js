import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { config } from '../../../server/config/config.js';
import {
  getGallery,
  getGalleryImage,
} from '../../../server/controllers/gallery.controller.js';
import { request, response } from '../../helpers.js';

const sourceFile = path.join(
  config.projectRoot,
  'data',
  'gallery-sources.json',
);
after(async () => {
  await fs.rm(sourceFile, { force: true });
});

describe('gallery controller', () => {
  async function prepareSources() {
    await fs.mkdir(path.dirname(sourceFile), { recursive: true });
    await fs.writeFile(
      sourceFile,
      JSON.stringify({
        sources: [
          {
            id: 'default',
            name: 'Galería local',
            path: config.galleryRoot,
            enabled: true,
          },
        ],
      }),
    );
  }

  test('getGallery lista imágenes', async () => {
    await prepareSources();

    const list = response();
    await getGallery({}, list);

    assert.equal(typeof list.result.body.count, 'number');
  });

  test('getGalleryImage responde 404 para imágenes inexistentes', async () => {
    await prepareSources();

    const missing = response();
    await getGalleryImage(request({ params: { id: 'missing' } }), missing);

    assert.equal(missing.result.statusCode, 404);
  });

  test('getGalleryImage envía una imagen autorizada', async () => {
    await prepareSources();

    const list = response();
    await getGallery({}, list);

    const imageName = (await fs.readdir(config.galleryRoot)).find((name) =>
      name.endsWith('.jpeg'),
    );
    const file = path.join(config.galleryRoot, imageName);
    const sent = response();
    await getGalleryImage(
      request({
        params: {
          id: list.result.body.images.find(
            (image) => image.name === imageName.replace(/\.jpeg$/i, ''),
          ).id,
        },
      }),
      sent,
    );

    assert.equal(sent.result.file, file);
    assert.equal(sent.result.options.dotfiles, 'deny');
  });
});
