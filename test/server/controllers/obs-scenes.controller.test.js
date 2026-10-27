import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  getScenes,
  setCurrentScene,
} from '../../../server/controllers/obs-scenes.controller.js';
import { obsClient } from '../../../server/obs/client.js';
import { connectObsForTests, request, response } from '../../helpers.js';

describe('obs scenes controller', () => {
  test('getScenes lista escenas', async () => {
    const disconnected = response();
    await getScenes({}, disconnected);

    assert.equal(disconnected.result.statusCode, 503);

    connectObsForTests();
    connectObsForTests();

    const original = obsClient.call;
    obsClient.call = async (type) =>
      type === 'GetSceneList'
        ? {
            currentProgramSceneName: 'A',
            scenes: [{ sceneName: 'A' }, { sceneName: 'B' }],
          }
        : {};

    try {
      const list = response();
      await getScenes({}, list);

      assert.deepEqual(list.result.body.scenes, ['B', 'A']);
    } finally {
      obsClient.call = original;
    }
  });

  test('setCurrentScene valida y cambia escena', async () => {
    connectObsForTests();

    const original = obsClient.call;
    obsClient.call = async () => ({});

    try {
      const bad = response();
      await setCurrentScene(request({ body: {} }), bad);

      assert.equal(bad.result.statusCode, 400);

      const changed = response();
      await setCurrentScene(
        request({ body: { sceneName: ' Main ' } }),
        changed,
      );

      assert.equal(changed.result.body.currentScene, 'Main');
    } finally {
      obsClient.call = original;
    }
  });
});

test('escenas informa fallos OBS', async () => {
  connectObsForTests();

  const original = obsClient.call;
  obsClient.call = async () => {
    throw new Error('scene error');
  };

  try {
    const res = response();
    await getScenes({}, res);

    assert.equal(res.result.statusCode, 502);

    const changed = response();
    await setCurrentScene(request({ body: { sceneName: 'Broken' } }), changed);

    assert.equal(changed.result.statusCode, 502);
  } finally {
    obsClient.call = original;
  }
});
