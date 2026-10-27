import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  getAudioInputs,
  setInputMute,
  setInputVolume,
} from '../../../server/controllers/obs-audio.controller.js';
import { obsClient } from '../../../server/obs/client.js';
import { connectObsForTests, request, response } from '../../helpers.js';

describe('obs audio controller', () => {
  test('setInputMute valida inputName', async () => {
    const invalid = response();
    await setInputMute(request({ body: {} }), invalid);

    assert.equal(invalid.result.statusCode, 400);
  });

  test('setInputVolume valida límites', async () => {
    const badVolume = response();
    await setInputVolume(
      request({ body: { inputName: 'Mic', volumeDb: 2 } }),
      badVolume,
    );

    assert.equal(badVolume.result.statusCode, 400);
  });

  test('setInputMute valida el tipo de muted', async () => {
    const res = response();
    await setInputMute(
      request({ body: { inputName: 'Mic', muted: 'yes' } }),
      res,
    );

    assert.equal(res.result.statusCode, 400);
  });

  test('obtiene y modifica entradas de audio', async () => {
    const disconnected = response();
    await getAudioInputs({}, disconnected);

    assert.equal(disconnected.result.statusCode, 503);

    connectObsForTests();

    const original = obsClient.call;
    obsClient.call = async (type) =>
      type === 'GetInputList' ? { inputs: [] } : {};

    try {
      const list = response();
      await getAudioInputs({}, list);

      assert.equal(list.result.body.ok, true);

      const mute = response();
      await setInputMute(
        request({ body: { inputName: ' Mic ', muted: true } }),
        mute,
      );

      assert.equal(mute.result.body.ok, true);

      const volume = response();
      await setInputVolume(
        request({ body: { inputName: 'Mic', volumeDb: -6 } }),
        volume,
      );

      assert.equal(volume.result.body.ok, true);
    } finally {
      obsClient.call = original;
    }
  });

  test('setInputVolume rechaza valores no finitos', async () => {
    const nonFinite = response();
    await setInputVolume(
      request({ body: { inputName: 'Mic', volumeDb: Infinity } }),
      nonFinite,
    );

    assert.equal(nonFinite.result.statusCode, 400);
  });

  test('propaga errores del cliente OBS', async () => {
    const original = obsClient.call;
    obsClient.call = async () => {
      throw new Error('audio error');
    };

    try {
      const res = response();
      await getAudioInputs({}, res);

      assert.equal(res.result.statusCode, 502);

      const mute = response();
      await setInputMute(
        request({ body: { inputName: 'Mic', muted: true } }),
        mute,
      );

      assert.equal(mute.result.statusCode, 502);

      const volume = response();
      await setInputVolume(
        request({ body: { inputName: 'Mic', volumeDb: -3 } }),
        volume,
      );

      assert.equal(volume.result.statusCode, 502);
    } finally {
      obsClient.call = original;
    }
  });
});
