import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  getSources,
  setVisibility,
} from '../../../server/controllers/obs-sources.controller.js';
import { obsClient } from '../../../server/obs/client.js';
import { connectObsForTests, request, response } from '../../helpers.js';

describe('obs sources controller', () => {
  test('getSources lista fuentes de todas las escenas', async () => {
    const disconnected = response();
    await getSources({}, disconnected);

    assert.equal(disconnected.result.statusCode, 503);

    connectObsForTests();

    const original = obsClient.call;
    obsClient.call = async (type) => {
      if (type === 'GetCurrentProgramScene')
        return { currentProgramSceneName: 'Main' };
      if (type === 'GetSceneList') return { scenes: [{ sceneName: 'Main' }] };
      if (type === 'GetSceneItemList')
        return {
          sceneItems: [
            { sceneItemId: 1, sourceName: 'Cam', sceneItemEnabled: true },
          ],
        };
      if (type === 'GetSceneItemEnabled') return { sceneItemEnabled: false };
      return {};
    };

    try {
      const list = response();
      await getSources({}, list);

      assert.equal(list.result.body.sources[0].sourceName, 'Cam');
    } finally {
      obsClient.call = original;
    }
  });

  test('setVisibility valida payload y actualiza la fuente', async () => {
    connectObsForTests();

    const original = obsClient.call;
    obsClient.call = async (type) =>
      type === 'GetSceneItemEnabled' ? { sceneItemEnabled: false } : {};

    try {
      const bad = response();
      await setVisibility(request({ body: { sceneName: '' } }), bad);

      assert.equal(bad.result.statusCode, 400);

      const changed = response();
      await setVisibility(
        request({
          body: { sceneName: ' Main ', sceneItemId: 1, enabled: false },
        }),
        changed,
      );

      assert.equal(changed.result.body.enabled, false);
    } finally {
      obsClient.call = original;
    }
  });

  test('setVisibility rechaza tipos y propaga errores OBS', async () => {
    connectObsForTests();

    const badId = response();
    await setVisibility(
      request({ body: { sceneName: 'Main', sceneItemId: '1', enabled: true } }),
      badId,
    );

    assert.equal(badId.result.statusCode, 400);

    const badEnabled = response();
    await setVisibility(
      request({ body: { sceneName: 'Main', sceneItemId: 1, enabled: 1 } }),
      badEnabled,
    );

    assert.equal(badEnabled.result.statusCode, 400);

    const original = obsClient.call;
    obsClient.call = async () => {
      throw new Error('source error');
    };

    try {
      const res = response();
      await getSources({}, res);

      assert.equal(res.result.statusCode, 502);

      const changed = response();
      await setVisibility(
        request({ body: { sceneName: 'Main', sceneItemId: 1, enabled: true } }),
        changed,
      );

      assert.equal(changed.result.statusCode, 502);
    } finally {
      obsClient.call = original;
    }
  });
});
