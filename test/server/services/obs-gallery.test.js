import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';

import { config } from '../../../server/config/config.js';
import { obsClient } from '../../../server/obs/client.js';
import {
  displayGalleryImage,
  findCurrentGalleryImage,
} from '../../../server/services/obs-gallery.js';

const originalCall = obsClient.call;
const originalRoot = config.galleryRoot;
const tempDirectories = [];

afterEach(async () => {
  obsClient.call = originalCall;
  config.galleryRoot = originalRoot;
  await Promise.all(tempDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
});

async function createGallery() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'obs-gallery-'));
  tempDirectories.push(root);
  await fs.mkdir(path.join(root, 'sub'));
  await fs.writeFile(path.join(root, 'one.jpg'), 'one');
  await fs.writeFile(path.join(root, 'sub', 'two.PNG'), 'two');
  return root;
}

describe('obs gallery service', { concurrency: false }, () => {
  test('muestra una imagen resuelta en OBS y devuelve el input', async () => {
    const root = await createGallery();
    config.galleryRoot = root;
    const calls = [];
    obsClient.call = async (...args) => {
      calls.push(args);
      return {};
    };
    const id = Buffer.from(JSON.stringify({ sourceId: 'local', relativePath: 'one.jpg' })).toString('base64url');
    const dataFile = path.join(config.projectRoot, 'data', 'gallery-sources.json');
    await fs.mkdir(path.dirname(dataFile), { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify({ sources: [{ id: 'local', name: 'Local', path: root, enabled: true }] }));
    assert.equal(await displayGalleryImage(id), config.obsImageInput);
    assert.equal(calls[0][0], 'SetInputSettings');
    assert.equal(calls[0][1].inputSettings.file, path.join(root, 'one.jpg'));
    assert.equal(await displayGalleryImage('invalid'), null);
  });

  test('encuentra la imagen actual, normaliza rutas y trata archivos no reconocidos', async () => {
    const root = await createGallery();
    config.galleryRoot = root;
    const dataFile = path.join(config.projectRoot, 'data', 'gallery-sources.json');
    await fs.mkdir(path.dirname(dataFile), { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify({ sources: [{ id: 'local', name: 'Local', path: root, enabled: true }] }));
    const id = Buffer.from(JSON.stringify({ sourceId: 'local', relativePath: 'one.jpg' })).toString('base64url');
    obsClient.call = async () => ({ inputSettings: { file: path.join(root, 'one.jpg') } });
    assert.deepEqual(await findCurrentGalleryImage(), { matched: true, imageId: id, file: path.join(root, 'one.jpg') });
    obsClient.call = async () => ({ inputSettings: {} });
    assert.deepEqual(await findCurrentGalleryImage(), { matched: false, imageId: null, file: null });
    obsClient.call = async () => ({ inputSettings: { file: path.join(root, 'missing.jpg') } });
    assert.deepEqual(await findCurrentGalleryImage(), { matched: false, imageId: null, file: path.join(root, 'missing.jpg') });
  });
});