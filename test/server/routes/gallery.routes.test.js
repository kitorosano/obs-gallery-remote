import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const calls = [];
const router = {
  get(...args) {
    calls.push(['get', ...args]);
  },
  post(...args) {
    calls.push(['post', ...args]);
  },
  patch(...args) {
    calls.push(['patch', ...args]);
  },
  delete(...args) {
    calls.push(['delete', ...args]);
  },
};

const createGallerySource = () => {};
const deleteGallerySource = () => {};
const getGallerySources = () => {};
const patchGallerySource = () => {};
const getGallery = () => {};
const getGalleryImage = () => {};

mock.module('express', {
  namedExports: { Router: () => router },
});
mock.module(
  new URL(
    '../../../server/controllers/gallery-sources.controller.js',
    import.meta.url,
  ),
  {
    namedExports: {
      createGallerySource,
      deleteGallerySource,
      getGallerySources,
      patchGallerySource,
    },
  },
);
mock.module(
  new URL('../../../server/controllers/gallery.controller.js', import.meta.url),
  {
    namedExports: { getGallery, getGalleryImage },
  },
);

describe('gallery.routes', () => {
  test('registra las rutas de fuentes y galería', async () => {
    const { default: routes } =
      await import('../../../server/routes/gallery.routes.js');

    assert.equal(routes, router);
    assert.deepEqual(calls, [
      ['get', '/sources', getGallerySources],
      ['post', '/sources', createGallerySource],
      ['patch', '/sources/:id', patchGallerySource],
      ['delete', '/sources/:id', deleteGallerySource],
      ['get', '/', getGallery],
      ['get', '/:id/file', getGalleryImage],
    ]);
  });
});
