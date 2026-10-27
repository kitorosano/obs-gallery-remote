import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { config } from '../../../server/config/config.js';
import {
  createGallerySource,
  deleteGallerySource,
  getGallerySources,
  patchGallerySource,
} from '../../../server/controllers/gallery-sources.controller.js';
import { request, response } from '../../helpers.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'controller-sources-'));
const oldRoot = config.galleryRoot;
config.galleryRoot = root;

await fs.mkdir(path.join(config.projectRoot, 'gallery'), { recursive: true });
await fs.rm(path.join(config.projectRoot, 'data', 'gallery-sources.json'), {
  force: true,
});

after(async () => {
  config.galleryRoot = oldRoot;
  await fs.rm(root, { recursive: true, force: true });
  await fs.rm(path.join(config.projectRoot, 'data', 'gallery-sources.json'), {
    force: true,
  });
});

describe('gallery sources controller', () => {
  test('getGallerySources lista las fuentes configuradas', async () => {
    const listed = response();
    await getGallerySources({}, listed);

    assert.equal(listed.result.body.count, 1);
  });

  test('createGallerySource valida y crea una fuente', async () => {
    const sourcePath = path.join(root, 'create');
    await fs.mkdir(sourcePath);
    const invalid = response();
    await createGallerySource(request({ body: {} }), invalid);

    assert.equal(invalid.result.statusCode, 400);

    const created = response();
    await createGallerySource(
      request({ body: { name: 'Tmp', path: sourcePath } }),
      created,
    );

    assert.equal(created.result.statusCode, 201);
  });

  test('patchGallerySource actualiza una fuente y valida cambios', async () => {
    const sourcePath = path.join(root, 'patch');
    await fs.mkdir(sourcePath);
    const created = response();
    await createGallerySource(
      request({ body: { name: 'Patch', path: sourcePath } }),
      created,
    );

    const id = created.result.body.source.id;
    const patched = response();
    await patchGallerySource(
      request({ params: { id }, body: { enabled: false } }),
      patched,
    );

    assert.equal(patched.result.body.source.enabled, false);

    const invalidPatch = response();
    await patchGallerySource(
      request({ params: { id }, body: { name: '' } }),
      invalidPatch,
    );

    assert.equal(invalidPatch.result.statusCode, 400);

    const notFound = response();
    await patchGallerySource(request({ params: { id: 'missing' } }), notFound);

    assert.equal(notFound.result.statusCode, 404);
  });

  test('deleteGallerySource elimina y responde 404 si no existe', async () => {
    const sourcePath = path.join(root, 'delete');
    await fs.mkdir(sourcePath);
    const created = response();
    await createGallerySource(
      request({ body: { name: 'Delete', path: sourcePath } }),
      created,
    );

    const id = created.result.body.source.id;
    const deleted = response();
    await deleteGallerySource(request({ params: { id } }), deleted);

    assert.equal(deleted.result.statusCode, 204);

    const missing = response();
    await deleteGallerySource(request({ params: { id } }), missing);

    assert.equal(missing.result.statusCode, 404);
  });
});
