import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getProgramPreview } from '../../../server/controllers/obs-program.controller.js';
import { obsClient } from '../../../server/obs/client.js';
import { connectObsForTests, request, response } from '../../helpers.js';

describe('obs program controller', () => {
  test('getProgramPreview usa perfiles válido y predeterminado', async () => {
    connectObsForTests();

    const original = obsClient.call;
    obsClient.call = async (type) =>
      type === 'GetCurrentProgramScene'
        ? { currentProgramSceneName: 'Main' }
        : { imageData: 'data' };

    try {
      const low = response();
      await getProgramPreview(request({ query: { profile: 'low' } }), low);

      assert.equal(low.result.body.profile, 'low');

      const fallback = response();
      await getProgramPreview(
        request({ query: { profile: 'unknown' } }),
        fallback,
      );

      assert.equal(fallback.result.body.profile, 'medium');
    } finally {
      obsClient.call = original;
    }
  });

  test('preview informa error OBS', async () => {
    connectObsForTests();

    const original = obsClient.call;
    obsClient.call = async () => {
      throw new Error('preview error');
    };

    try {
      const res = response();
      await getProgramPreview(request(), res);

      assert.equal(res.result.statusCode, 502);
    } finally {
      obsClient.call = original;
    }
  });
});
