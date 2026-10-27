import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { obsClient } from '../../../server/obs/client.js';
import {
  listAllSources,
  listProgramSources,
  setSourceVisibility,
} from '../../../server/services/obs-sources.js';

const originalCall = obsClient.call;

afterEach(() => {
  obsClient.call = originalCall;
});

describe('obs sources service', () => {
  test('lista las fuentes de la escena actual en orden inverso', async () => {
    const calls = [];
    obsClient.call = async (...args) => {
      calls.push(args);
      return args[0] === 'GetCurrentProgramScene'
        ? { currentProgramSceneName: 'Live' }
        : {
            sceneItems: [
              { sceneItemId: 1, sourceName: 'A', sourceType: 'input', sceneItemEnabled: true },
              { sceneItemId: 2, sourceName: 'Group', sourceType: 'group', inputKind: 'x', sceneItemEnabled: false, isGroup: true },
            ],
          };
    };

    assert.deepEqual(await listProgramSources(), {
      sceneName: 'Live',
      sources: [
        { sceneItemId: 2, sourceName: 'Group', sourceType: 'group', inputKind: 'x', enabled: false, isGroup: true },
        { sceneItemId: 1, sourceName: 'A', sourceType: 'input', inputKind: null, enabled: true, isGroup: false },
      ],
    });
    assert.deepEqual(calls.map(([type]) => type), ['GetCurrentProgramScene', 'GetSceneItemList']);
  });

  test('actualiza y devuelve la visibilidad de una fuente', async () => {
    const calls = [];
    obsClient.call = async (...args) => {
      calls.push(args);
      return { sceneItemEnabled: true };
    };

    assert.deepEqual(await setSourceVisibility({ sceneName: 'Live', sceneItemId: 3, enabled: true }), {
      sceneName: 'Live',
      sceneItemId: 3,
      enabled: true,
    });
    assert.deepEqual(calls, [
      ['SetSceneItemEnabled', { sceneName: 'Live', sceneItemId: 3, sceneItemEnabled: true }],
      ['GetSceneItemEnabled', { sceneName: 'Live', sceneItemId: 3 }],
    ]);
  });

  test('lista fuentes de todas las escenas y omite escenas con error', async () => {
    obsClient.call = async (type, data) => {
      if (type === 'GetCurrentProgramScene') return { currentProgramSceneName: 'Live' };
      if (type === 'GetSceneList') return { scenes: [{ sceneName: 'Live' }, { sceneName: 'Broken' }] };
      if (data.sceneName === 'Broken') throw new Error('unavailable');
      return { sceneItems: [{ sceneItemId: 1, sourceName: 'Camera', sourceType: 'input', sceneItemEnabled: true }] };
    };

    assert.deepEqual(await listAllSources(), {
      sceneName: 'Live',
      sources: [{ sceneName: 'Live', sceneItemId: 1, sourceName: 'Camera', sourceType: 'input', inputKind: null, enabled: true, isGroup: false }],
    });
  });
});