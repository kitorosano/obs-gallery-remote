import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { obsClient } from '../../../server/obs/client.js';
import { changeScene, listScenes } from '../../../server/services/obs-scenes.js';

const originalCall = obsClient.call;

afterEach(() => {
  obsClient.call = originalCall;
});

describe('obs scenes service', () => {
  test('lista escenas invirtiendo el orden y devuelve la actual', async () => {
    const calls = [];
    obsClient.call = async (...args) => {
      calls.push(args);
      return {
        currentProgramSceneName: 'Live',
        scenes: [{ sceneName: 'Intro' }, { sceneName: 'Live' }],
      };
    };

    assert.deepEqual(await listScenes(), {
      currentScene: 'Live',
      scenes: ['Live', 'Intro'],
    });
    assert.deepEqual(calls, [['GetSceneList']]);
  });

  test('cambia la escena y devuelve su nombre', async () => {
    const calls = [];
    obsClient.call = async (...args) => {
      calls.push(args);
      return {};
    };

    assert.equal(await changeScene('Live'), 'Live');
    assert.deepEqual(calls, [['SetCurrentProgramScene', { sceneName: 'Live' }]]);
  });
});