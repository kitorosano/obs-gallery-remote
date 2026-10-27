import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { obsClient } from '../../../server/obs/client.js';
import {
  changeInputMute,
  changeInputVolume,
  listAudioInputs,
} from '../../../server/services/obs-audio.js';

const originalCall = obsClient.call;

afterEach(() => {
  obsClient.call = originalCall;
});

describe('obs audio service', () => {
  test('lista inputs de audio, escenas anidadas y grupos', async () => {
    obsClient.call = async (type, data) => {
      if (type === 'GetInputList') return { inputs: [
        { inputName: 'Mic', inputKind: 'wasapi' },
        { inputName: 'NoAudio', inputKind: 'image' },
      ] };
      if (type === 'GetCurrentProgramScene') return { currentProgramSceneName: 'Main' };
      if (type === 'GetSceneItemList' && data.sceneName === 'Main') return { sceneItems: [
        { sourceName: 'Mic', sourceType: 'input', sceneItemEnabled: true },
        { sourceName: 'Nested', sourceType: 'OBS_SOURCE_TYPE_SCENE', sceneItemEnabled: true },
        { sourceName: 'Group', isGroup: true, sceneItemEnabled: true },
        { sourceName: 'Off', sceneItemEnabled: false },
      ] };
      if (type === 'GetSceneItemList' && data.sceneName === 'Nested') return { sceneItems: [
        { sourceName: 'NestedMic', sceneItemEnabled: true },
      ] };
      if (type === 'GetGroupSceneItemList') return { sceneItems: [
        { sourceName: 'GroupMic', sceneItemEnabled: true },
        { sourceName: 'GroupOff', sceneItemEnabled: false },
      ] };
      if (type === 'GetInputMute' && data.inputName === 'Mic') return { inputMuted: false };
      if (type === 'GetInputVolume' && data.inputName === 'Mic') return { inputVolumeDb: -3, inputVolumeMul: 0.7 };
      throw new Error('not audio');
    };

    assert.deepEqual(await listAudioInputs(), {
      sceneName: 'Main',
      inputs: [{ inputName: 'Mic', inputKind: 'wasapi', muted: false, volumeDb: -3, volumeMul: 0.7, activeInProgram: true }],
    });
  });

  test('omite errores de inputs, escenas y grupos', async () => {
    obsClient.call = async (type, data) => {
      if (type === 'GetInputList') return { inputs: [{ inputName: 'Bad', inputKind: 'x' }] };
      if (type === 'GetCurrentProgramScene') return { currentProgramSceneName: 'Main' };
      if (type === 'GetSceneItemList') throw new Error('bad scene');
      throw new Error('bad input');
    };
    assert.deepEqual(await listAudioInputs(), { sceneName: 'Main', inputs: [] });
    obsClient.call = async () => {
      throw new Error('cannot mute');
    };
    await assert.rejects(changeInputMute('Mic', true), /cannot mute/);
  });

  test('continúa cuando falla un grupo y evita recorrer una escena ya visitada', async () => {
    obsClient.call = async (type, data) => {
      if (type === 'GetInputList') return { inputs: [] };
      if (type === 'GetCurrentProgramScene') return { currentProgramSceneName: 'Main' };
      if (type === 'GetSceneItemList' && data.sceneName === 'Main') return {
        sceneItems: [
          { sourceName: 'Main', sourceType: 'OBS_SOURCE_TYPE_SCENE', sceneItemEnabled: true },
          { sourceName: 'BrokenGroup', isGroup: true, sceneItemEnabled: true },
        ],
      };
      if (type === 'GetGroupSceneItemList') throw new Error('group unavailable');
      return { sceneItems: [] };
    };
    assert.deepEqual(await listAudioInputs(), { sceneName: 'Main', inputs: [] });
  });

  test('cambia mute y volumen y devuelve los valores confirmados', async () => {
    const calls = [];
    obsClient.call = async (type, data) => {
      calls.push([type, data]);
      return type.includes('Mute') ? { inputMuted: false } : { inputVolumeDb: -6, inputVolumeMul: 0.5 };
    };
    assert.deepEqual(await changeInputMute('Mic', true), { inputName: 'Mic', muted: false });
    assert.deepEqual(await changeInputVolume('Mic', -6), { inputName: 'Mic', volumeDb: -6, volumeMul: 0.5 });
    assert.equal(calls.length, 4);
  });
});