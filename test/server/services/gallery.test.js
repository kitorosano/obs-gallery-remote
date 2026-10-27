import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';

import {
  encodeId,
  isInsideGallery,
  listImages,
  resolveImageId,
} from '../../../server/services/gallery.js';

describe('gallery service', () => {
  test('comprueba límites y codifica ids con rutas normalizadas', () => {
    assert.equal(isInsideGallery('C:\\gallery', 'C:\\gallery\\a.jpg'), true);
    assert.equal(isInsideGallery('C:\\gallery', 'C:\\other\\a.jpg'), false);
    const id = encodeId('source', 'sub\\image.jpg');
    assert.deepEqual(JSON.parse(Buffer.from(id, 'base64url').toString()), { sourceId: 'source', relativePath: 'sub/image.jpg' });
  });

  test('lista imágenes habilitadas, omite ocultas y clasifica subdirectorios', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gallery-'));
    try {
      await fs.mkdir(path.join(root, 'sub'));
      await fs.writeFile(path.join(root, 'a.JPG'), '123');
      await fs.writeFile(path.join(root, 'sub', 'b.png'), '12');
      await fs.writeFile(path.join(root, 'readme.txt'), 'x');
      await fs.writeFile(path.join(root, '.hidden.jpg'), 'x');
      const source = { id: 'source', name: 'Source', path: root, enabled: true };
      const images = await listImages([source, { ...source, id: 'off', enabled: false }]);
      assert.deepEqual(images.map(({ name, category, size }) => ({ name, category, size })), [
        { name: 'a', category: 'Sin categoría', size: 3 },
        { name: 'b', category: 'sub', size: 2 },
      ]);
      assert.equal(await listImages([{ ...source, path: path.join(root, 'missing') }]).then((value) => value.length), 0);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  test('resuelve ids válidos y rechaza payloads, rutas y archivos inválidos', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gallery-'));
    try {
      await fs.writeFile(path.join(root, 'image.jpg'), 'x');
      await fs.mkdir(path.join(root, 'folder.jpg'));
      const source = { id: 'source', name: 'Source', path: root, enabled: true };
      const valid = encodeId('source', 'image.jpg');
      assert.equal(await resolveImageId([source], valid), path.join(root, 'image.jpg'));
      for (const id of [
        'not-base64-json',
        Buffer.from(JSON.stringify({ sourceId: 'source' })).toString('base64url'),
        Buffer.from(JSON.stringify({ relativePath: 'image.jpg' })).toString('base64url'),
        Buffer.from(JSON.stringify(null)).toString('base64url'),
        encodeId('unknown', 'image.jpg'),
        encodeId('source', ''),
        encodeId('source', path.resolve(root, 'image.jpg')),
        encodeId('source', '../image.jpg'),
        encodeId('source', 'image.txt'),
        encodeId('source', 'missing.jpg'),
        encodeId('source', 'folder.jpg'),
      ]) {
        assert.equal(await resolveImageId([source], id), null);
      }
      assert.equal(await resolveImageId([{ ...source, enabled: false }], valid), null);
      await fs.writeFile(path.join(root, 'readme.txt'), 'not a directory');
      await fs.rm(path.join(root, 'image.jpg'));
      await assert.rejects(listImages([{ ...source, path: path.join(root, 'readme.txt') }]));
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});