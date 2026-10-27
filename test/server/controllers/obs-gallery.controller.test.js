import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { config } from '../../../server/config/config.js';
import {
  getCurrentGalleryImage,
  showImage,
} from '../../../server/controllers/obs-gallery.controller.js';
import { obsClient } from '../../../server/obs/client.js';
import { listGallerySources } from '../../../server/services/gallery-sources.js';
import { listImages } from '../../../server/services/gallery.js';
import { connectObsForTests, request, response } from '../../helpers.js';

const sourceFile = path.join(
  config.projectRoot,
  'data',
  'gallery-sources.json',
);

after(async () => {
  await fs.rm(sourceFile, { force: true });
});

describe('obs gallery controller', () => {
  test('showImage valida imageId', async () => {
    connectObsForTests();

    const invalid = response();
    await showImage(request({ body: {} }), invalid);

    assert.equal(invalid.result.statusCode, 400);
  });

  test('getCurrentGalleryImage devuelve el estado actual', async () => {
    connectObsForTests();

    const original = obsClient.call;
    obsClient.call = async (type) =>
      type === 'GetInputSettings' ? { inputSettings: {} } : {};

    try {
      const current = response();
      await getCurrentGalleryImage({}, current);

      assert.equal(current.result.body.matched, false);
    } finally {
      obsClient.call = original;
    }
  });

  test('showImage responde 404 para imágenes inexistentes', async () => {
    connectObsForTests();

    const original = obsClient.call;
    obsClient.call = async () => ({});

    try {
      const missing = response();
      await showImage(request({ body: { imageId: 'missing' } }), missing);

      assert.equal(missing.result.statusCode, 404);
    } finally {
      obsClient.call = original;
    }
  });

  test('galería OBS informa errores del cliente', async () => {
    connectObsForTests();

    const original = obsClient.call;
    obsClient.call = async () => {
      throw new Error('gallery OBS error');
    };

    try {
      const res = response();
      await getCurrentGalleryImage({}, res);

      assert.equal(res.result.statusCode, 502);
    } finally {
      obsClient.call = original;
    }
  });

  test('showImage convierte errores de OBS en 502 con ayuda', async () => {
    const sourceFile = path.join(
      config.projectRoot,
      'data',
      'gallery-sources.json',
    );

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

    const [image] = await listImages(await listGallerySources());
    const original = obsClient.call;
    obsClient.call = async () => {
      throw new Error('cannot update image');
    };

    try {
      const res = response();
      await showImage(request({ body: { imageId: image.id } }), res);

      assert.equal(res.result.statusCode, 502);
      assert.match(res.result.body.hint, /fuente/);
    } finally {
      obsClient.call = original;
    }
  });

  test('showImage envía una imagen válida a OBS', async () => {
    const sourceFile = path.join(
      config.projectRoot,
      'data',
      'gallery-sources.json',
    );

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

    const [image] = await listImages(await listGallerySources());
    const original = obsClient.call;
    obsClient.call = async () => ({});

    try {
      const res = response();
      await showImage(request({ body: { imageId: image.id } }), res);

      assert.equal(res.result.body.ok, true);
      assert.equal(res.result.body.inputName, config.obsImageInput);
    } finally {
      obsClient.call = original;
    }
  });
});
