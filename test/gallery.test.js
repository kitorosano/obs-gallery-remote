import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  encodeId,
  isInsideGallery,
  listImages,
  resolveImageId,
} from '../server/services/gallery.js';

test('listImages recorre categorías, ignora archivos ocultos y conserva metadatos', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'obs-gallery-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  await fs.mkdir(path.join(root, 'Eventos'));
  await fs.writeFile(path.join(root, 'portada.png'), 'image');
  await fs.writeFile(path.join(root, 'Eventos', 'final.jpg'), 'image');
  await fs.writeFile(path.join(root, '.oculta.png'), 'image');
  await fs.writeFile(path.join(root, 'notas.txt'), 'text');

  const images = await listImages(root);
  assert.equal(images.length, 2);
  assert.deepEqual(images.map(({ filename, category }) => ({ filename, category })), [
    { filename: 'final.jpg', category: 'Eventos' },
    { filename: 'portada.png', category: 'Sin categoría' },
  ]);
  assert.equal(await resolveImageId(root, images[0].id), path.join(root, 'Eventos', 'final.jpg'));
});

test('resolveImageId rechaza escapes y extensiones no permitidas', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'obs-gallery-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  assert.equal(isInsideGallery(root, path.resolve(root, '..', 'outside.png')), false);
  assert.equal(await resolveImageId(root, encodeId('../outside.png')), null);
  assert.equal(await resolveImageId(root, encodeId('notes.txt')), null);
});
