import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

import { config } from '../../../server/config/config.js';
import {
  addGallerySource,
  listGallerySources,
  removeGallerySource,
  updateGallerySource,
} from '../../../server/services/gallery-sources.js';

const dataFile = path.join(config.projectRoot, 'data', 'gallery-sources.json');
let originalData;
let originalExists;

before(async () => {
  try {
    originalData = await fs.readFile(dataFile);
    originalExists = true;
  } catch {
    originalExists = false;
  }
});

after(async () => {
  if (originalExists) {
    await fs.mkdir(path.dirname(dataFile), { recursive: true });
    await fs.writeFile(dataFile, originalData);
  } else {
    await fs.rm(dataFile, { force: true });
  }
});

describe('gallery sources service', { concurrency: false }, () => {
  test('crea el almacenamiento inicial y lista la fuente local', async () => {
    await fs.rm(dataFile, { force: true });
    const sources = await listGallerySources();
    assert.deepEqual(sources, [{ id: 'default', name: 'Galería local', path: config.galleryRoot, enabled: true }]);
  });

  test('valida y agrega fuentes nuevas, rechazando duplicados', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'source-'));
    try {
      await assert.rejects(addGallerySource({ name: '', path: root }), /nombre.*obligatorio/);
      await assert.rejects(addGallerySource({}), /nombre.*obligatorio/);
      await assert.rejects(addGallerySource({ name: 'Name', path: '' }), /ruta.*obligatoria/);
      await assert.rejects(addGallerySource({ name: 'Name', path: path.join(root, 'missing') }), /no existe/);
      await assert.rejects(addGallerySource({ name: 'File', path: path.join(root, 'file') }), /no existe/);
      await fs.writeFile(path.join(root, 'file'), 'not a directory');
      await assert.rejects(addGallerySource({ name: 'File', path: path.join(root, 'file') }), /no existe/);
      const source = await addGallerySource({ name: '  Photos  ', path: root });
      assert.equal(source.name, 'Photos');
      assert.equal(source.path, path.resolve(root));
      assert.equal(source.enabled, true);
      await assert.rejects(addGallerySource({ name: 'Other', path: root.toUpperCase() }), /ya está/);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  test('actualiza fuentes, valida cambios y elimina existentes', async () => {
    const sources = await listGallerySources();
    const id = sources[0].id;
    assert.equal(await updateGallerySource('missing', { name: 'x' }), null);
    await assert.rejects(updateGallerySource(id, { name: ' ' }), /no puede/);
    await assert.rejects(updateGallerySource(id, { name: null }), /no puede/);
    await assert.rejects(updateGallerySource(id, { enabled: 'yes' }), /boolean/);
    const updated = await updateGallerySource(id, { name: ' Updated ', enabled: false });
    assert.equal(updated.name, 'Updated');
    assert.equal(updated.enabled, false);
    assert.equal(await removeGallerySource('missing'), false);
    assert.equal(await removeGallerySource(id), true);
    for (const source of await listGallerySources()) {
      assert.equal(await removeGallerySource(source.id), true);
    }
    assert.deepEqual(await listGallerySources(), []);
  });
});