import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

const calls = [];
const router = new Proxy(
  {},
  {
    get(_target, method) {
      return (...args) => calls.push([method, ...args]);
    },
  },
);

const controllers = {
  getAitumInfo: () => {},
  startAllAitumStreams: () => {},
  stopAllAitumStreams: () => {},
  getAudioInputs: () => {},
  setInputMute: () => {},
  setInputVolume: () => {},
  connectToObs: () => {},
  getObsStatus: () => {},
  subscribeToObsEvents: () => {},
  getCurrentGalleryImage: () => {},
  showImage: () => {},
  getOutputStatus: () => {},
  startRecord: () => {},
  stopRecord: () => {},
  getProgramPreview: () => {},
  getScenes: () => {},
  setCurrentScene: () => {},
  getSources: () => {},
  setVisibility: () => {},
};

mock.module('express', {
  namedExports: { Router: () => router },
});
mock.module(
  new URL(
    '../../../server/controllers/obs-aitum.controller.js',
    import.meta.url,
  ),
  {
    namedExports: {
      getAitumInfo: controllers.getAitumInfo,
      startAllAitumStreams: controllers.startAllAitumStreams,
      stopAllAitumStreams: controllers.stopAllAitumStreams,
    },
  },
);
mock.module(
  new URL(
    '../../../server/controllers/obs-audio.controller.js',
    import.meta.url,
  ),
  {
    namedExports: {
      getAudioInputs: controllers.getAudioInputs,
      setInputMute: controllers.setInputMute,
      setInputVolume: controllers.setInputVolume,
    },
  },
);
mock.module(
  new URL(
    '../../../server/controllers/obs-connection.controller.js',
    import.meta.url,
  ),
  {
    namedExports: {
      connectToObs: controllers.connectToObs,
      getObsStatus: controllers.getObsStatus,
    },
  },
);
mock.module(
  new URL(
    '../../../server/controllers/obs-events.controller.js',
    import.meta.url,
  ),
  {
    namedExports: { subscribeToObsEvents: controllers.subscribeToObsEvents },
  },
);
mock.module(
  new URL(
    '../../../server/controllers/obs-gallery.controller.js',
    import.meta.url,
  ),
  {
    namedExports: {
      getCurrentGalleryImage: controllers.getCurrentGalleryImage,
      showImage: controllers.showImage,
    },
  },
);
mock.module(
  new URL(
    '../../../server/controllers/obs-output.controller.js',
    import.meta.url,
  ),
  {
    namedExports: {
      getOutputStatus: controllers.getOutputStatus,
      startRecord: controllers.startRecord,
      stopRecord: controllers.stopRecord,
    },
  },
);
mock.module(
  new URL(
    '../../../server/controllers/obs-program.controller.js',
    import.meta.url,
  ),
  {
    namedExports: { getProgramPreview: controllers.getProgramPreview },
  },
);
mock.module(
  new URL(
    '../../../server/controllers/obs-scenes.controller.js',
    import.meta.url,
  ),
  {
    namedExports: {
      getScenes: controllers.getScenes,
      setCurrentScene: controllers.setCurrentScene,
    },
  },
);
mock.module(
  new URL(
    '../../../server/controllers/obs-sources.controller.js',
    import.meta.url,
  ),
  {
    namedExports: {
      getSources: controllers.getSources,
      setVisibility: controllers.setVisibility,
    },
  },
);

describe('obs.routes', () => {
  test('registra todas las rutas de OBS', async () => {
    const { default: routes } =
      await import('../../../server/routes/obs.routes.js');

    assert.equal(routes, router);
    assert.deepEqual(calls, [
      ['get', '/status', controllers.getObsStatus],
      ['post', '/connect', controllers.connectToObs],
      ['get', '/scenes', controllers.getScenes],
      ['post', '/scenes/current', controllers.setCurrentScene],
      ['get', '/program/screenshot', controllers.getProgramPreview],
      ['post', '/show', controllers.showImage],
      ['get', '/gallery-image', controllers.getCurrentGalleryImage],
      ['get', '/audio', controllers.getAudioInputs],
      ['post', '/audio/mute', controllers.setInputMute],
      ['post', '/audio/volume', controllers.setInputVolume],
      ['get', '/output/status', controllers.getOutputStatus],
      ['get', '/aitum', controllers.getAitumInfo],
      ['post', '/aitum/streams/start-all', controllers.startAllAitumStreams],
      ['post', '/aitum/streams/stop-all', controllers.stopAllAitumStreams],
      ['post', '/record/start', controllers.startRecord],
      ['post', '/record/stop', controllers.stopRecord],
      ['get', '/events', controllers.subscribeToObsEvents],
      ['get', '/sources', controllers.getSources],
      ['post', '/sources/visibility', controllers.setVisibility],
    ]);
  });
});
