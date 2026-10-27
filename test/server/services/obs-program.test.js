import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { obsClient } from '../../../server/obs/client.js';
import {
  DEFAULT_SCREENSHOT_PROFILE,
  SCREENSHOT_PROFILES,
} from '../../../server/constants/obs.js';
import { getProgramScreenshot } from '../../../server/services/obs-program.js';

const originalCall = obsClient.call;

afterEach(() => {
  obsClient.call = originalCall;
});

describe('obs program service', () => {
  test('obtiene una captura con el perfil solicitado', async () => {
    const calls = [];
    obsClient.call = async (...args) => {
      calls.push(args);
      return args[0] === 'GetCurrentProgramScene'
        ? { currentProgramSceneName: 'Live' }
        : { imageData: 'data:image/jpeg;base64,abc' };
    };

    assert.deepEqual(await getProgramScreenshot('low'), {
      sceneName: 'Live',
      imageData: 'data:image/jpeg;base64,abc',
    });
    assert.deepEqual(calls, [
      ['GetCurrentProgramScene'],
      [
        'GetSourceScreenshot',
        {
          sourceName: 'Live',
          imageFormat: 'jpg',
          imageWidth: SCREENSHOT_PROFILES.low.width,
          imageHeight: SCREENSHOT_PROFILES.low.height,
          imageCompressionQuality: SCREENSHOT_PROFILES.low.quality,
        },
      ],
    ]);
  });

  test('usa el perfil medio por defecto y ante un nombre desconocido', async () => {
    const requests = [];
    obsClient.call = async (type, data) => {
      requests.push([type, data]);
      return type === 'GetCurrentProgramScene'
        ? { currentProgramSceneName: 'Scene' }
        : { imageData: 'image' };
    };

    await getProgramScreenshot();
    await getProgramScreenshot('unknown');
    assert.equal(requests[1][1].imageWidth, SCREENSHOT_PROFILES[DEFAULT_SCREENSHOT_PROFILE].width);
    assert.equal(requests[3][1].imageWidth, SCREENSHOT_PROFILES[DEFAULT_SCREENSHOT_PROFILE].width);
  });
});